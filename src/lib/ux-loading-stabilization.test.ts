import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { createRecordNavigationGuard } from "../components/records/record-navigation-guard.ts";

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
  const cancellation = read("src/app/(dashboard)/services/[id]/ServiceCancellationActions.tsx");

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
  assert.doesNotMatch(service, /cancelService|service-cancellation-disclosure/);
  assert.match(cancellation, /dangerZoneTitle/);
  assert.match(cancellation, /service-cancellation-disclosure/);
  assert.match(cancellation, /cancelService/);
  assert.match(cancellation, /aria-describedby="service-cancellation-warning"/);
  assert.match(cancellation, /loadingLabel=\{dictionary\.serviceStatusControl\.saving\}/);
});

test("record detail links expose contextual thresholded navigation feedback", () => {
  const customers = read("src/app/(dashboard)/customers/CustomersClient.tsx");
  const services = read("src/app/(dashboard)/services/ServicesClient.tsx");
  const suppliers = read("src/app/(dashboard)/suppliers/SuppliersClient.tsx");
  const invoices = read("src/app/(dashboard)/invoices/InvoicesListClient.tsx");
  const quotations = read("src/app/(dashboard)/quotations/QuotationsClient.tsx");
  const serviceDetail = read("src/app/(dashboard)/services/[id]/page.tsx");
  const recordNavigation = read("src/components/records/RecordNavigation.tsx");

  assert.match(customers, /<PendingLink[\s\S]*pendingLabel=\{dictionary\.list\.actions\.opening\}/);
  assert.match(services, /<PendingLink[\s\S]*pendingLabel=\{dictionary\.list\.actions\.opening\}/);
  assert.match(suppliers, /<PendingLink[\s\S]*pendingLabel=\{dictionary\.list\.openingSupplier\}/);
  assert.match(invoices, /<PendingLink[\s\S]*pendingLabel=\{dictionary\.list\.navigationPending\}/);
  assert.match(quotations, /useGlobalNavigationPending/);
  assert.match(quotations, /isNavigationPending/);
  assert.match(quotations, /push\(`\/quotations\/\$\{quotation\.id\}/);
  assert.match(serviceDetail, /ServiceCancellationActions/);
  assert.match(serviceDetail, /ServiceBillingSummaryCard[\s\S]*ServiceCancellationActions/);
  assert.match(recordNavigation, /useGlobalNavigationPending/);
  assert.match(recordNavigation, /isModifiedNavigationEvent/);
  assert.match(recordNavigation, /aria-busy=\{isGuarded \|\| undefined\}/);
  assert.match(recordNavigation, /setTimeout\(\(\) => setShowPending\(true\), 150\)/);
});

test("detail pager guard blocks immediate competing navigation and unlocks after settlement", () => {
  const guard = createRecordNavigationGuard();
  let dispatches = 0;
  const dispatch = () => {
    if (guard.acquire()) dispatches += 1;
  };

  dispatch();
  dispatch();
  dispatch();
  assert.equal(dispatches, 1);
  assert.equal(guard.isLocked(), true);

  guard.release();
  dispatch();
  assert.equal(dispatches, 2);
  assert.equal(guard.isLocked(), true);
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
