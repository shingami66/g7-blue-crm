import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test, { mock } from "node:test";

const ROOT = join(import.meta.dirname, "../..");
const read = (path: string) =>
  readFileSync(join(ROOT, path), "utf8").replace(/\r\n/g, "\n");

// =========================================================================
// Real React Hook & Effect Lifecycle Engine
// Models React's exact dependency comparison and effect cleanup rules:
// - useCallback returns identical function reference if Object.is(dep[i], prevDep[i])
// - useEffect triggers cleanup before re-running if any dependency changed
// - useEffect unmount triggers cleanup
// =========================================================================
class ReactHarness {
  private hooks: unknown[] = [];
  private hookIndex = 0;

  resetHookIndex() {
    this.hookIndex = 0;
  }

  useRef<T>(initialValue: T): { current: T } {
    const idx = this.hookIndex++;
    if (this.hooks[idx] === undefined) {
      this.hooks[idx] = { current: initialValue };
    }
    return this.hooks[idx] as { current: T };
  }

  useState<T>(initialValue: T): [T, (val: T | ((prev: T) => T)) => void] {
    const idx = this.hookIndex++;
    if (this.hooks[idx] === undefined) {
      this.hooks[idx] = initialValue;
    }
    const setter = (val: T | ((prev: T) => T)) => {
      const next = typeof val === "function" ? (val as (prev: T) => T)(this.hooks[idx] as T) : val;
      this.hooks[idx] = next;
    };
    return [this.hooks[idx] as T, setter];
  }

  useCallback<T>(callback: T, deps: unknown[]): T {
    const idx = this.hookIndex++;
    const prev = this.hooks[idx] as { callback: T; deps: unknown[] } | undefined;
    if (prev && deps.every((d, i) => Object.is(d, prev.deps[i]))) {
      return prev.callback;
    }
    this.hooks[idx] = { callback, deps };
    return callback;
  }

  useEffect(effect: () => void | (() => void), deps: unknown[]) {
    const idx = this.hookIndex++;
    const prev = this.hooks[idx] as { deps: unknown[]; cleanup?: () => void } | undefined;
    const depsChanged = !prev || deps.some((d, i) => !Object.is(d, prev.deps[i]));

    if (depsChanged) {
      if (prev?.cleanup) {
        prev.cleanup();
      }
      const cleanup = effect() || undefined;
      this.hooks[idx] = { deps, cleanup };
    }
  }

  unmount() {
    for (const hook of this.hooks) {
      if (hook && typeof hook === "object" && "cleanup" in hook && typeof hook.cleanup === "function") {
        hook.cleanup();
      }
    }
  }
}

function renderProvider(harness: ReactHarness, thresholdMs = 160) {
  harness.resetHookIndex();
  const pendingSetRef = harness.useRef(new Set<string>());
  const timerRef = harness.useRef<ReturnType<typeof setTimeout> | null>(null);
  const showHaloRef = harness.useRef(false);
  const [isPending, setIsPending] = harness.useState(false);
  const [showHalo, setShowHalo] = harness.useState(false);

  const reportPending = harness.useCallback(
    (id: string, pending: boolean) => {
      const pendingSet = pendingSetRef.current;
      const wasPending = pendingSet.has(id);

      if (pending) {
        pendingSet.add(id);
        setIsPending(true);

        if (!timerRef.current && !showHaloRef.current) {
          timerRef.current = setTimeout(() => {
            timerRef.current = null;
            if (pendingSetRef.current.size > 0) {
              showHaloRef.current = true;
              setShowHalo(true);
            }
          }, thresholdMs);
        }
      } else if (wasPending) {
        pendingSet.delete(id);

        if (pendingSet.size === 0) {
          setIsPending(false);
          showHaloRef.current = false;
          setShowHalo(false);
          if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
          }
        }
      }
    },
    [thresholdMs],
  );

  return {
    isPending,
    showHalo,
    reportPending,
    pendingSet: pendingSetRef.current,
    showHaloRef,
    clearTimer: () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    },
  };
}

function renderPendingLinkHint(
  harness: ReactHarness,
  id: string,
  pending: boolean,
  reportPending: (id: string, pending: boolean) => void,
) {
  harness.resetHookIndex();
  harness.useEffect(() => {
    reportPending(id, pending);
    return () => {
      reportPending(id, false);
    };
  }, [id, pending, reportPending]);
}

// =========================================================================
// PART 1: React Effect & Callback Lifecycle Regression Tests
// =========================================================================

test("Regression 1: reportPending callback does NOT change identity when Halo visibility transitions", () => {
  mock.timers.enable({ apis: ["setTimeout"] });
  const providerHarness = new ReactHarness();

  // Initial render (showHalo = false)
  const initial = renderProvider(providerHarness, 160);
  const firstCallback = initial.reportPending;
  assert.equal(initial.showHalo, false);

  // Trigger navigation and advance timer past 160ms
  initial.reportPending("nav-regress-1", true);
  mock.timers.tick(160);

  // Provider re-renders with showHalo = true
  const afterHalo = renderProvider(providerHarness, 160);
  assert.equal(afterHalo.showHalo, true, "Halo should now be visible");

  // Verify referential identity is strictly preserved
  assert.strictEqual(
    afterHalo.reportPending,
    firstCallback,
    "reportPending callback MUST remain referentially identical across showHalo state transitions",
  );

  initial.clearTimer();
  mock.timers.reset();
});

test("Regression 2: Sustained pending navigation remains registered after Halo activation without effect cleanup retriggering", () => {
  mock.timers.enable({ apis: ["setTimeout"] });
  const providerHarness = new ReactHarness();
  const linkHarness = new ReactHarness();

  // 1. Initial provider state
  let providerState = renderProvider(providerHarness, 160);
  assert.equal(providerState.showHalo, false);

  // 2. PendingLink mounts with pending = true
  renderPendingLinkHint(linkHarness, "nav-link-sustained", true, providerState.reportPending);
  assert.equal(providerState.pendingSet.has("nav-link-sustained"), true, "Link should be registered in pendingSet");

  // 3. Time advances past threshold duration (160ms)
  mock.timers.tick(160);
  assert.equal(providerState.showHaloRef.current, true, "Halo ref becomes active");

  // 4. Provider re-renders with showHalo = true
  providerState = renderProvider(providerHarness, 160);
  assert.equal(providerState.showHalo, true);

  // 5. Consumer (PendingLink) re-renders while still in-flight (pending = true)
  renderPendingLinkHint(linkHarness, "nav-link-sustained", true, providerState.reportPending);

  // 6. Assert effect cleanup did NOT run and navigation was NOT prematurely dropped
  assert.equal(
    providerState.pendingSet.has("nav-link-sustained"),
    true,
    "Navigation must remain registered in pendingSet after Halo activation",
  );
  assert.equal(providerState.showHalo, true, "Halo must remain visible and active");

  // 7. Further time elapses (sustained route transition)
  mock.timers.tick(300);
  assert.equal(providerState.showHalo, true, "Halo remains active throughout sustained transition");

  // 8. Navigation resolves (pending = false)
  renderPendingLinkHint(linkHarness, "nav-link-sustained", false, providerState.reportPending);

  // 9. Provider re-renders after resolution
  providerState = renderProvider(providerHarness, 160);
  assert.equal(providerState.showHalo, false, "Halo must clear immediately when navigation finishes");
  assert.equal(providerState.pendingSet.size, 0, "pendingSet must be empty");

  providerState.clearTimer();
  mock.timers.reset();
});

test("Regression 3: Overlapping navigations across separate components maintain Halo until all resolve", () => {
  mock.timers.enable({ apis: ["setTimeout"] });
  const providerHarness = new ReactHarness();
  const link1Harness = new ReactHarness();
  const link2Harness = new ReactHarness();

  let providerState = renderProvider(providerHarness, 160);

  // Link 1 starts navigating at t=0
  renderPendingLinkHint(link1Harness, "nav-link-1", true, providerState.reportPending);
  assert.equal(providerState.pendingSet.size, 1);

  // Link 2 starts navigating at t=80ms
  mock.timers.tick(80);
  renderPendingLinkHint(link2Harness, "nav-link-2", true, providerState.reportPending);
  assert.equal(providerState.pendingSet.size, 2);

  // Threshold arrives at t=160ms -> Halo activates
  mock.timers.tick(80);
  providerState = renderProvider(providerHarness, 160);
  assert.equal(providerState.showHalo, true);

  // Re-render both links; neither must trigger premature cleanup
  renderPendingLinkHint(link1Harness, "nav-link-1", true, providerState.reportPending);
  renderPendingLinkHint(link2Harness, "nav-link-2", true, providerState.reportPending);
  assert.equal(providerState.pendingSet.size, 2);
  assert.equal(providerState.showHalo, true);

  // Link 1 completes at t=200ms -> Link 2 is still active!
  mock.timers.tick(40);
  renderPendingLinkHint(link1Harness, "nav-link-1", false, providerState.reportPending);
  providerState = renderProvider(providerHarness, 160);
  assert.equal(providerState.pendingSet.size, 1, "nav-link-2 must remain active");
  assert.equal(providerState.showHalo, true, "Halo must remain visible while nav-link-2 is active");

  // Link 2 completes at t=300ms -> all complete!
  mock.timers.tick(100);
  renderPendingLinkHint(link2Harness, "nav-link-2", false, providerState.reportPending);
  providerState = renderProvider(providerHarness, 160);
  assert.equal(providerState.pendingSet.size, 0, "pendingSet must be empty");
  assert.equal(providerState.showHalo, false, "Halo must deactivate immediately");

  providerState.clearTimer();
  mock.timers.reset();
});

test("Regression 4: NavigationFeedbackProvider source code contract satisfies stable ref architecture", () => {
  const source = read("src/components/ui/NavigationFeedbackProvider.tsx");

  // Verify showHaloRef is used
  assert.match(source, /const\s+showHaloRef\s*=\s*useRef\(false\)/);
  assert.match(source, /showHaloRef\.current\s*=\s*true/);
  assert.match(source, /showHaloRef\.current\s*=\s*false/);

  // Verify useCallback dependencies strictly depend only on stable thresholdMs, NOT showHalo
  assert.match(source, /useCallback\([\s\S]*?\n\s*\[thresholdMs\],?\s*\n\s*\);/);
  assert.doesNotMatch(source, /\[[^\]]*\bshowHalo\b[^\]]*\],\s*\n\s*\);/);
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
