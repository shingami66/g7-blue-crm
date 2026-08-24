import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { createRecordNavigationGuard } from "../components/records/record-navigation-guard.ts";

const ROOT = join(import.meta.dirname, "../..");
const read = (path: string) =>
  readFileSync(join(ROOT, path), "utf8").replace(/\r\n/g, "\n");

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
  assert.match(approval, /softDeleteQuotation/);
  assert.match(approval, /if \(!canWrite \|\| isPending \|\| status === "approved"\) return/);
  assert.match(approval, /deleteConfirm/);
  assert.match(approval, /setDeleteError/);
  assert.match(issue, /if \(isPending\) return/);
  assert.match(issue, /loadingLabel=\{dictionary\.submitting\}/);
  assert.match(issue, /role="alert"/);
  assert.match(issue, /role="status"/);
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

test("record detail navigation is a localized secondary slot", () => {
  const slot = read("src/components/records/RecordNavigationSlot.tsx");
  const navigation = read("src/components/records/RecordNavigation.tsx");
  const dictionary = read("src/lib/i18n/dictionaries/record-navigation.ts");
  const queries = read("src/lib/record-navigation/queries.ts");
  const routes = [
    ["customers/[id]/page.tsx", "getCustomerRecordNavigation"],
    ["services/[id]/page.tsx", "getServiceRecordNavigation"],
    ["invoices/[id]/page.tsx", "getInvoiceRecordNavigation"],
    ["quotations/[id]/page.tsx", "getQuotationRecordNavigation"],
    ["suppliers/[id]/page.tsx", "getSupplierRecordNavigation"],
  ] as const;

  assert.match(slot, /loadNavigation: \(\) => Promise<RecordNavigationState>/);
  assert.match(slot, /await loadNavigation\(\)/);
  assert.match(slot, /state="unavailable"/);
  assert.match(navigation, /data-record-navigation-state=\{state\}/);
  assert.match(navigation, /dictionary\.unavailable/);
  assert.match(dictionary, /unavailable: "Record navigation unavailable"/);
  assert.match(dictionary, /unavailable: "تعذر تحميل التنقل بين السجلات"/);
  assert.match(queries, /const \[first, previous, next, last\] = await Promise\.all\(\[/);
  assert.match(queries, /loaders\.first\(\)[\s\S]*loaders\.previous\(\)[\s\S]*loaders\.next\(\)[\s\S]*loaders\.last\(\)/);
  assert.match(queries, /function throwIfNavigationError\(error: unknown\)/);
  assert.equal((queries.match(/throwIfNavigationError\(error\)/g) ?? []).length, 16);

  for (const [route, loader] of routes) {
    const source = read(`src/app/(dashboard)/${route}`);
    assert.match(source, /<Suspense/);
    assert.match(source, /<RecordNavigationPlaceholder[\s\S]*state="loading"/);
    assert.match(source, /<RecordNavigationSlot/);
    assert.match(source, new RegExp(`loadNavigation=\\{\\(\\) => ${loader}\\(`));
    assert.doesNotMatch(source, new RegExp(`const recordNavigation = await ${loader}`));
  }
});

test("Supplier navigation stays secondary while retaining deleted-state and return inputs", () => {
  const supplier = read("src/app/(dashboard)/suppliers/[id]/page.tsx");

  assert.match(supplier, /const includeDeleted = showDeleted === "true";/);
  assert.match(supplier, /safeRecordReturnTo\(resolvedSearchParams\.returnTo, isDeleted \? "\/suppliers\?showDeleted=true" : "\/suppliers"\)/);
  assert.match(supplier, /<Suspense[\s\S]*?<RecordNavigationPlaceholder[\s\S]*?state="loading"[\s\S]*?<RecordNavigationSlot/);
  assert.match(supplier, /loadNavigation=\{\(\) => getSupplierRecordNavigation\(id, \{ isPreferred: supplier\.isPreferred, name: supplier\.name \}, includeDeleted\)\}/);
  assert.match(supplier, /basePath="\/suppliers"[\s\S]*?returnTo=\{returnTo\}[\s\S]*?pendingLabel=\{dictionary\.list\.openingSupplier\}/);
  assert.doesNotMatch(supplier, /const recordNavigation = await getSupplierRecordNavigation/);
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

test("Service primary readiness overlaps locale and read gates without leaving diagnostics", () => {
  const serviceDetail = read("src/app/(dashboard)/services/[id]/page.tsx");

  assert.match(serviceDetail, /const localePromise = getCurrentSessionEffectiveLocale\(\);/);
  assert.match(
    serviceDetail,
    /const \[\{ id \}, resolvedSearchParams\] = await Promise\.all\(\[params, searchParams\]\);/,
  );
  assert.match(
    serviceDetail,
    /const \[locale, \[serviceAuthResult, serviceReadResult\]\] = await Promise\.all\([\s\S]*localePromise,[\s\S]*Promise\.allSettled\(\[[\s\S]*requirePermission\("services:read"\),[\s\S]*getServiceByIdResult\(id\),/,
  );
  assert.match(serviceDetail, /if \(serviceAuthResult\.status === "rejected"\)/);
  assert.match(serviceDetail, /if \(serviceReadResult\.status === "rejected"\)/);
  assert.match(serviceDetail, /data-p2-detail-primary-ready="true" className=/);
});
