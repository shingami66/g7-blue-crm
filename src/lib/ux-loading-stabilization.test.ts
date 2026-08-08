import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const ROOT = join(import.meta.dirname, "../..");
const read = (path: string) => readFileSync(join(ROOT, path), "utf8");

test("shared buttons expose immediate, accessible pending feedback", () => {
  const source = read("src/components/ui/Button.tsx");

  assert.match(source, /LoaderCircle/);
  assert.match(source, /loading && loadingLabel/);
  assert.match(source, /aria-busy=\{loading \|\| undefined\}/);
  assert.match(source, /disabled=\{isDisabled\}/);
  assert.match(source, /aria-live=\{loading \? "polite" : undefined\}/);
  assert.doesNotMatch(source, /void loadingLabel/);
});

test("links use threshold-friendly route status without changing layout", () => {
  const source = read("src/components/ui/PendingLink.tsx");
  const navigation = read("src/components/ui/useGlobalNavigationPending.ts");

  assert.match(source, /useLinkStatus/);
  assert.match(source, /pendingLabel/);
  assert.match(source, /data-navigation-pending/);
  assert.match(source, /aria-live="polite"/);
  assert.match(source, /opacity-0/);
  assert.match(source, /setTimeout\(\(\) => setShowPending\(true\), 150\)/);
  assert.match(source, /clearTimeout\(timer\)/);
  assert.match(navigation, /useTransition/);
  assert.match(navigation, /startTransition\(\(\) => router\.push/);
  assert.match(navigation, /isPending,/);
});

test("navigation and document feedback remain contextual instead of reusing boot UI", () => {
  const rootLoading = read("src/app/loading.tsx");
  const dashboardLoading = read("src/app/(dashboard)/loading.tsx");
  const printInvoice = read("src/app/(dashboard)/invoices/[id]/pdf/PrintButton.tsx");
  const printQuotation = read("src/app/(dashboard)/quotations/[id]/pdf/PrintButton.tsx");

  assert.match(dashboardLoading, /WorkspaceLoadingFrame/);
  assert.match(rootLoading, /bootstrap\.preparingWorkspace/);
  for (const printSource of [printInvoice, printQuotation]) {
    assert.match(printSource, /if \(isPrinting\) return/);
    assert.match(printSource, /loading=\{isPrinting\}/);
    assert.match(printSource, /window\.print\(\)/);
    assert.match(printSource, /afterprint/);
    assert.match(printSource, /requestAnimationFrame/);
    assert.match(printSource, /try \{/);
    assert.match(printSource, /setTimeout\(\(\) => setIsPrinting\(false\), 800\)/);
    assert.match(printSource, /catch \{/);
    assert.match(printSource, /catch \{\n        setIsPrinting\(false\);/);
    assert.match(printSource, /cancelAnimationFrame/);
    assert.match(printSource, /clearTimeout/);
    assert.match(printSource, /removeEventListener\("afterprint", finishPrinting\)/);
    assert.doesNotMatch(printSource, /WorkspaceLoadingFrame|CenterPendingBolt|GlobalPendingProvider/);
  }
});

test("mutation guards preserve immediate labels and prevent duplicate commands", () => {
  const approval = read("src/app/(dashboard)/quotations/[id]/QuotationApprovalActions.tsx");
  const issue = read("src/app/(dashboard)/invoices/IssueInvoiceAction.tsx");
  const quotations = read("src/app/(dashboard)/quotations/QuotationsClient.tsx");
  const service = read("src/app/(dashboard)/services/[id]/ServiceLifecycleActions.tsx");

  assert.match(approval, /if \(isPending\) return/);
  assert.match(approval, /disabled=\{isPending && !isApproving\}/);
  assert.match(approval, /disabled=\{isPending && !isRejecting\}/);
  assert.match(issue, /if \(isPending\) return/);
  assert.match(issue, /loadingLabel=\{dictionary\.submitting\}/);
  assert.match(issue, /role="alert"/);
  assert.match(issue, /role="status"/);
  assert.match(quotations, /deletingId/);
  assert.match(quotations, /pendingDocumentId/);
  assert.match(quotations, /documentTimerRef/);
  assert.match(quotations, /if \(!preview\)/);
  assert.match(quotations, /clearTimeout\(documentTimerRef\.current\)/);
  assert.match(service, /if \(isPending\) return/);
  assert.match(service, /aria-describedby="service-cancellation-warning"/);
  assert.match(service, /loadingLabel=\{dictionary\.serviceStatusControl\.saving\}/);
});

test("G7 bidi surfaces retain natural-language auto direction and structured LTR values", () => {
  const bidi = read("src/lib/i18n/bidi.ts");
  const serviceDetail = read("src/app/(dashboard)/services/[id]/page.tsx");
  const customerList = read("src/app/(dashboard)/customers/CustomersClient.tsx");

  assert.match(bidi, /isolateBidiText/);
  assert.match(bidi, /isolateLtrText/);
  assert.match(serviceDetail, /dir="auto"/);
  assert.match(serviceDetail, /dir="ltr"/);
  assert.match(customerList, /dir="auto"/);
});
