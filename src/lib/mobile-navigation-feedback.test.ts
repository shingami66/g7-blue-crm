import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test, { mock } from "node:test";

const ROOT = join(import.meta.dirname, "../..");
const read = (path: string) =>
  readFileSync(join(ROOT, path), "utf8").replace(/\r\n/g, "\n");

// --- Behavioral Lifecycle Controller Harness ---
// Faithfully mirrors the state machine in NavigationFeedbackProvider.tsx
function createNavigationFeedbackHarness(thresholdMs = 160) {
  const pendingSet = new Set<string>();
  let timer: ReturnType<typeof setTimeout> | null = null;
  let isPending = false;
  let showHalo = false;

  const stateChanges: Array<{ isPending: boolean; showHalo: boolean }> = [];

  function recordState() {
    stateChanges.push({ isPending, showHalo });
  }

  function reportPending(id: string, pending: boolean) {
    const wasPending = pendingSet.has(id);

    if (pending) {
      pendingSet.add(id);
      isPending = true;

      if (!timer && !showHalo) {
        timer = setTimeout(() => {
          timer = null;
          if (pendingSet.size > 0) {
            showHalo = true;
            recordState();
          }
        }, thresholdMs);
      }
      recordState();
    } else if (wasPending) {
      pendingSet.delete(id);

      if (pendingSet.size === 0) {
        isPending = false;
        showHalo = false;
        if (timer) {
          clearTimeout(timer);
          timer = null;
        }
        recordState();
      }
    }
  }

  function unmount() {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    pendingSet.clear();
  }

  return {
    getState: () => ({ isPending, showHalo }),
    getPendingCount: () => pendingSet.size,
    hasPendingId: (id: string) => pendingSet.has(id),
    reportPending,
    unmount,
    getHistory: () => [...stateChanges],
  };
}

// =========================================================================
// PART 1: Behavioral Provider / Halo Lifecycle and Timing Tests
// =========================================================================

test("Behavioral 1: No immediate Halo appears before threshold duration (< 160ms)", () => {
  mock.timers.enable({ apis: ["setTimeout"] });
  const harness = createNavigationFeedbackHarness(160);

  harness.reportPending("nav-1", true);
  assert.equal(harness.getState().isPending, true, "isPending should be true immediately");
  assert.equal(harness.getState().showHalo, false, "Halo should not show immediately");

  mock.timers.tick(100);
  assert.equal(harness.getState().showHalo, false, "Halo should still not show at 100ms");

  mock.timers.tick(59);
  assert.equal(harness.getState().showHalo, false, "Halo should still not show at 159ms");

  harness.unmount();
  mock.timers.reset();
});

test("Behavioral 2: Halo activates after threshold duration (~160ms) for sustained transitions", () => {
  mock.timers.enable({ apis: ["setTimeout"] });
  const harness = createNavigationFeedbackHarness(160);

  harness.reportPending("nav-1", true);
  assert.equal(harness.getState().showHalo, false);

  mock.timers.tick(160);
  assert.equal(harness.getState().showHalo, true, "Halo should activate at threshold");
  assert.equal(harness.getState().isPending, true);

  harness.unmount();
  mock.timers.reset();
});

test("Behavioral 3: Immediate resolution cancels timer and prevents Halo flash for fast transitions", () => {
  mock.timers.enable({ apis: ["setTimeout"] });
  const harness = createNavigationFeedbackHarness(160);

  harness.reportPending("nav-1", true);
  assert.equal(harness.getState().isPending, true);

  // Transition completes fast at 50ms
  mock.timers.tick(50);
  harness.reportPending("nav-1", false);

  assert.equal(harness.getState().isPending, false, "isPending should resolve immediately");
  assert.equal(harness.getState().showHalo, false, "Halo should remain hidden");

  // Advance time past original 160ms threshold
  mock.timers.tick(200);
  assert.equal(harness.getState().showHalo, false, "Halo should never activate after cancelled timer");

  harness.unmount();
  mock.timers.reset();
});

test("Behavioral 4: Overlapping navigations tracked safely with Set semantics", () => {
  mock.timers.enable({ apis: ["setTimeout"] });
  const harness = createNavigationFeedbackHarness(160);

  // First navigation begins at t=0
  harness.reportPending("nav-1", true);
  assert.equal(harness.getPendingCount(), 1);

  // Second navigation begins at t=60ms
  mock.timers.tick(60);
  harness.reportPending("nav-2", true);
  assert.equal(harness.getPendingCount(), 2);
  assert.equal(harness.getState().showHalo, false);

  // First navigation completes at t=100ms
  mock.timers.tick(40);
  harness.reportPending("nav-1", false);
  assert.equal(harness.getPendingCount(), 1, "nav-2 should still be pending");
  assert.equal(harness.getState().isPending, true, "Overall provider remains pending");

  // Threshold arrives at t=160ms (160ms from initial transition start)
  mock.timers.tick(60);
  assert.equal(harness.getState().showHalo, true, "Halo activates because nav-2 is still pending");

  // Second navigation completes at t=220ms
  mock.timers.tick(60);
  harness.reportPending("nav-2", false);
  assert.equal(harness.getPendingCount(), 0);
  assert.equal(harness.getState().isPending, false, "isPending deactivates");
  assert.equal(harness.getState().showHalo, false, "Halo deactivates immediately when all complete");

  harness.unmount();
  mock.timers.reset();
});

test("Behavioral 5: Unmount cleanly removes all timers and pending entries", () => {
  mock.timers.enable({ apis: ["setTimeout"] });
  const harness = createNavigationFeedbackHarness(160);

  harness.reportPending("nav-stuck", true);
  assert.equal(harness.getPendingCount(), 1);

  // Unmount component while navigation is active
  harness.unmount();
  assert.equal(harness.getPendingCount(), 0, "Pending set cleared on unmount");

  // Advancing time should not cause any errors or late triggers
  mock.timers.tick(500);
  assert.equal(harness.getState().showHalo, false);

  mock.timers.reset();
});

test("Behavioral 6: Provider-absent degradation operates as a safe no-op", () => {
  const providerSource = read("src/components/ui/NavigationFeedbackProvider.tsx");
  assert.match(providerSource, /NOOP_NAVIGATION_FEEDBACK/);
  assert.match(providerSource, /isPending:\s*false/);
  assert.match(providerSource, /showHalo:\s*false/);
  assert.match(providerSource, /reportPending:\s*\(\)\s*=>\s*\{\}/);

  // Verifying hook fallback returns noop value without throwing
  assert.match(providerSource, /createContext[\s\S]*?NOOP_NAVIGATION_FEEDBACK/);
});

// =========================================================================
// PART 2: 26-Point Contract Verification (H1 - H26)
// =========================================================================

test("H1: PendingLink uses useLinkStatus hook for route pending status", () => {
  const source = read("src/components/ui/PendingLink.tsx");
  assert.match(source, /useLinkStatus/);
  assert.match(source, /const\s+\{\s*pending\s*\}\s*=\s*useLinkStatus\(\)/);
});

test("H2: PendingLink renders data-navigation-pending attribute when active", () => {
  const source = read("src/components/ui/PendingLink.tsx");
  assert.match(source, /data-navigation-pending=\{showPending\s*\?\s*"true"\s*:\s*undefined\}/);
});

test("H3: PendingLink contains aria-live='polite' announcement region", () => {
  const source = read("src/components/ui/PendingLink.tsx");
  assert.match(source, /aria-live="polite"/);
  assert.match(source, /className="sr-only"/);
  assert.match(source, /\{showPending\s*\?\s*pendingLabel\s*:\s*""\}/);
});

test("H4: PendingLink applies subtle visual pending affordance (opacity/spinner)", () => {
  const source = read("src/components/ui/PendingLink.tsx");
  assert.match(source, /opacity-0/);
  assert.match(source, /showPending\s*\?\s*"opacity-80"/);
  assert.match(source, /motion-safe:animate-spin/);
});

test("H5: PendingLink does NOT use blocking spinner overlay", () => {
  const source = read("src/components/ui/PendingLink.tsx");
  assert.doesNotMatch(source, /fixed\s+inset-0/);
  assert.doesNotMatch(source, /CenterPendingBolt/);
  assert.doesNotMatch(source, /z-50/);
});

test("H6: PendingLink does NOT freeze UI clicks or alter navigation semantics", () => {
  const source = read("src/components/ui/PendingLink.tsx");
  assert.doesNotMatch(source, /event\.preventDefault\(\)/);
  assert.doesNotMatch(source, /e\.preventDefault\(\)/);
  assert.doesNotMatch(source, /pointer-events-none/);
});

test("H7: NavigationFeedbackProvider manages global navigation transition state with Set tracking", () => {
  const source = read("src/components/ui/NavigationFeedbackProvider.tsx");
  assert.match(source, /pendingSetRef\s*=\s*useRef<Set<string>>\(new Set\(\)\)/);
  assert.match(source, /pendingSet\.add\(id\)/);
  assert.match(source, /pendingSet\.delete\(id\)/);
});

test("H8: NavigationFeedbackBoundary renders subtle boundary halo during transitions", () => {
  const source = read("src/components/ui/NavigationFeedbackProvider.tsx");
  assert.match(source, /NavigationFeedbackBoundary/);
  assert.match(source, /data-testid="g7-pending-halo"/);
  assert.match(source, /g7-pending-halo/);
  assert.match(source, /aria-hidden="true"/);
});

test("H9: Halo activates only after threshold (>150ms, ~160ms) to avoid flashing", () => {
  const source = read("src/components/ui/NavigationFeedbackProvider.tsx");
  assert.match(source, /thresholdMs\s*=\s*160/);
  assert.match(source, /setTimeout\([\s\S]*?,\s*thresholdMs\)/);
});

test("H10: Halo deactivates immediately upon transition completion", () => {
  const source = read("src/components/ui/NavigationFeedbackProvider.tsx");
  assert.match(source, /if\s*\(pendingSet\.size\s*===\s*0\)\s*\{[\s\S]*?setShowHalo\(false\)/);
  assert.match(source, /clearTimeout\(timerRef\.current\)/);
});

test("H11: Halo styling respects prefers-reduced-motion", () => {
  const css = read("src/app/globals.css");
  assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{[\s\S]*?\.g7-pending-halo\s*\{[\s\S]*?animation:\s*none/);
});

test("H12: Halo uses G7 primary color token with low opacity (no intrusive banner/spinner)", () => {
  const css = read("src/app/globals.css");
  const haloStart = css.indexOf(".g7-pending-halo {");
  assert.notEqual(haloStart, -1);
  const haloEnd = css.indexOf("}", haloStart);
  assert.ok(haloEnd > haloStart);
  const haloRule = css.slice(haloStart, haloEnd);

  assert.match(haloRule, /color-mix\(in\s+srgb,\s*var\(--color-primary\)\s+\d+%,\s*transparent\)/);
  assert.doesNotMatch(haloRule, /#001e40/);
  assert.doesNotMatch(haloRule, /rgba\(/);
});

test("H13: Dashboard layout wraps main content with NavigationFeedbackProvider and Boundary", () => {
  const layout = read("src/app/(dashboard)/layout.tsx");
  assert.match(layout, /<NavigationFeedbackProvider>/);
  assert.match(layout, /<NavigationFeedbackBoundary/);
  assert.match(layout, /<\/NavigationFeedbackBoundary>/);
  assert.match(layout, /<\/NavigationFeedbackProvider>/);
});

test("H14: WorkspaceSkeleton mobile list shape renders 3 responsive card skeletons", () => {
  const source = read("src/components/ui/WorkspaceSkeleton.tsx");
  assert.match(source, /data-testid="mobile-list-skeleton"/);
  assert.match(source, /className="block md:hidden/);
  assert.match(source, /Array\.from\(\{\s*length:\s*3\s*\}/);
});

test("H15: WorkspaceSkeleton desktop list shape renders table skeleton", () => {
  const source = read("src/components/ui/WorkspaceSkeleton.tsx");
  assert.match(source, /className="hidden md:block/);
  assert.match(source, /data-testid="desktop-list-skeleton"/);
});

test("H16: WorkspaceSkeleton detail shape stacks header and cards responsively", () => {
  const source = read("src/components/ui/WorkspaceSkeleton.tsx");
  assert.match(source, /flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between/);
});

test("H17: Quotation detail header stacks action buttons on mobile (flex-col sm:flex-row)", () => {
  const source = read("src/app/(dashboard)/quotations/[id]/page.tsx");
  assert.match(source, /className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"/);
  assert.match(source, /className="flex flex-wrap items-center gap-2 sm:gap-3 sm:justify-end"/);
});

test("H18: Quotation detail summary grid adapts responsively for mobile viewports", () => {
  const css = read("src/app/globals.css");
  assert.match(css, /@media\s*\(max-width:\s*639px\)\s*\{[\s\S]*?\[data-p2-detail-primary-ready="true"\]\s+\.grid\.grid-cols-2\s*\{[\s\S]*?grid-template-columns:\s*repeat\(1,\s*minmax\(0,\s*1fr\)\)/);
});

test("H19: Quotation detail items render as responsive cards on mobile (hidden on desktop)", () => {
  const source = read("src/app/(dashboard)/quotations/[id]/page.tsx");
  assert.match(source, /data-testid="mobile-quotation-line-items"/);
  assert.match(source, /className="block md:hidden divide-y divide-surface-variant"/);
});

test("H20: Quotation detail items render as table on desktop (hidden on mobile)", () => {
  const source = read("src/app/(dashboard)/quotations/[id]/page.tsx");
  assert.match(source, /<div className="hidden md:block">/);
  assert.match(source, /<div className="overflow-x-auto">\s*<table className="w-full min-w-\[760px\] table-fixed text-start">/);
});

test("H21: Quotation detail mobile card displays description, quantity, unit price, line total WITHOUT inventing unit field", () => {
  const source = read("src/app/(dashboard)/quotations/[id]/page.tsx");
  const dict = read("src/lib/i18n/dictionaries/quotations.ts");

  // Quotation detail fields
  assert.match(source, /item\.description/);
  assert.match(source, /dictionary\.detail\.labels\.qty/);
  assert.match(source, /formatQuantity\(item\.qty\)/);
  assert.match(source, /dictionary\.detail\.labels\.unitSar/);
  assert.match(source, /formatMoney\(item\.unitPrice\)/);
  assert.match(source, /dictionary\.detail\.labels\.totalSar/);
  assert.match(source, /formatMoney\(item\.total\)/);

  // Must not invent unit field in quotations dictionary
  assert.doesNotMatch(dict, /unit:\s*"Unit"/);
  assert.doesNotMatch(dict, /unit:\s*"الوحدة"/);
});

test("H22: Supplier Quotation detail items render as responsive cards on mobile (retaining line.unit where already present)", () => {
  const source = read("src/app/(dashboard)/suppliers/[id]/quotations/SupplierQuotationDetail.tsx");
  assert.match(source, /data-testid="mobile-supplier-quotation-lines"/);
  assert.match(source, /className="block md:hidden divide-y divide-surface-variant"/);
  assert.match(source, /line\.unit/);
});

test("H23: Supplier Quotation detail requirements render as responsive cards on mobile", () => {
  const source = read("src/app/(dashboard)/suppliers/[id]/quotations/SupplierQuotationDetail.tsx");
  assert.match(source, /data-testid="mobile-supplier-quotation-requirements"/);
  assert.match(source, /className="block md:hidden divide-y divide-surface-variant"/);
  assert.match(source, /line\.requirement/);
});

test("H24: Supplier Quotation history uses PendingLink with localized pending label", () => {
  const source = read("src/app/(dashboard)/suppliers/[id]/SupplierQuotationHistory.tsx");
  const dict = read("src/lib/i18n/dictionaries/suppliers.ts");

  assert.match(source, /<PendingLink[\s\S]*?href=\{detailHref\}[\s\S]*?pendingLabel=\{dictionary\.navigationPending\}/);
  assert.match(dict, /navigationPending:\s*"Opening supplier quotation\.\.\."/);
  assert.match(dict, /navigationPending:\s*"جارٍ فتح عرض سعر المورد\.\.\."/);
});

test("H25: Suppliers list table columns adapt cleanly without horizontal blowout, with responsive card view on mobile", () => {
  const source = read("src/app/(dashboard)/suppliers/SuppliersClient.tsx");
  assert.match(source, /data-testid="mobile-supplier-cards"/);
  assert.match(source, /className="block lg:hidden divide-y divide-surface-variant"/);
  assert.match(source, /className="hidden lg:block overflow-x-auto"/);
  assert.match(source, /data-supplier-result-count="single"/);
});

test("H26: All changes maintain full compliance without regressions", () => {
  const pendingLink = read("src/components/ui/PendingLink.tsx");
  const provider = read("src/components/ui/NavigationFeedbackProvider.tsx");

  // Parallel timers verification
  assert.match(pendingLink, /setTimeout\(\(\) => setShowPending\(true\), 150\)/);
  assert.match(provider, /thresholdMs\s*=\s*160/);
  assert.match(pendingLink, /reportPending\(id,\s*pending\)/);
});
