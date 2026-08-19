import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const ROOT = join(import.meta.dirname, "../..");
const read = (path: string) =>
  readFileSync(join(ROOT, path), "utf8").replace(/\r\n/g, "\n");

test("Bounded PaginationFooter renders the required compact, accessible control model", () => {
  const source = read("src/components/ui/PaginationFooter.tsx");
  const boundedStart = source.indexOf('if (paginationMode === "bounded")');
  const boundedEnd = source.indexOf("\n  return (", boundedStart);
  const boundedSource = source.slice(boundedStart, boundedEnd);

  // Two compact native selects: Page size and Go to any valid page.
  assert.match(boundedSource, /\{copy\.pageSize\}/);
  assert.match(boundedSource, /aria-label=\{copy\.pageSizeLabel\}/);
  assert.match(boundedSource, /\{copy\.goTo\}/);
  assert.match(boundedSource, /aria-label=\{copy\.goTo\}/);
  assert.match(boundedSource, /Array\.from\(\{ length: totalPages \}, \(_, index\) => index \+ 1\)/);
  assert.match(boundedSource, /onChange=\{\(event\) => onPageChange\(Number\(event\.target\.value\)\)\}/);
  assert.match(boundedSource, /copy\.pageOf\.split\("\{current\}"\)/);
  assert.match(boundedSource, /<bdi dir="ltr">\{currentPage\}<\/bdi>/);
  assert.match(boundedSource, /<bdi dir="ltr">\{totalPages\}<\/bdi>/);

  // Exactly four icon-only bounded navigation actions; never numeric chips or visible words.
  assert.doesNotMatch(boundedSource, /getPaginationItems|items\.map|aria-current/);
  assert.doesNotMatch(boundedSource, />\s*\{copy\.previous\}\s*</);
  assert.doesNotMatch(boundedSource, />\s*\{copy\.next\}\s*</);

  for (const label of ["firstPage", "previousPage", "nextPage", "lastPage"]) {
    assert.match(boundedSource, new RegExp(`aria-label=\\{copy\\.${label}\\}`));
    assert.match(boundedSource, new RegExp(`title=\\{copy\\.${label}\\}`));
  }

  // Numerical semantics stay stable while the visual icon direction mirrors in RTL.
  assert.match(boundedSource, /onClick=\{\(\) => onPageChange\(1\)\}/);
  assert.match(boundedSource, /onClick=\{\(\) => onPageChange\(Math\.max\(1, currentPage - 1\)\)\}/);
  assert.match(boundedSource, /onClick=\{\(\) => onPageChange\(Math\.min\(totalPages, currentPage \+ 1\)\)\}/);
  assert.match(boundedSource, /onClick=\{\(\) => onPageChange\(totalPages\)\}/);
  assert.match(source, /const PreviousIcon = isRtl \? ChevronRight : ChevronLeft/);
  assert.match(source, /const NextIcon = isRtl \? ChevronLeft : ChevronRight/);
  assert.match(source, /const FirstIcon = isRtl \? ChevronsRight : ChevronsLeft/);
  assert.match(source, /const LastIcon = isRtl \? ChevronsLeft : ChevronsRight/);
});

test("Bounded data tables render PaginationFooter above the table and avoid redundant bottom pager", () => {
  const listFiles = [
    "src/app/(dashboard)/customers/CustomersClient.tsx",
    "src/app/(dashboard)/invoices/InvoicesListClient.tsx",
    "src/app/(dashboard)/quotations/QuotationsClient.tsx",
    "src/app/(dashboard)/services/ServicesClient.tsx",
    "src/app/(dashboard)/suppliers/SuppliersClient.tsx",
    "src/app/(dashboard)/payments/PaymentsClient.tsx",
  ];

  for (const file of listFiles) {
    const source = read(file);
    const pagerIndex = source.indexOf("<PaginationFooter");
    const tableIndex = source.search(/<table|<DataTable/);

    assert.notEqual(pagerIndex, -1, `${file} must contain PaginationFooter`);
    assert.notEqual(tableIndex, -1, `${file} must contain table`);
    assert.ok(
      pagerIndex < tableIndex,
      `${file} PaginationFooter (pos ${pagerIndex}) must be rendered above the table (pos ${tableIndex})`
    );

    // Only one PaginationFooter should be present (no duplicate bottom pager)
    const secondPagerIndex = source.indexOf("<PaginationFooter", pagerIndex + 1);
    assert.equal(secondPagerIndex, -1, `${file} should not have a duplicate bottom PaginationFooter`);
  }
});

test("Customer, Supplier, Quotation, and Payment lists use the Invoices cohesive control shell", () => {
  const reference = read("src/app/(dashboard)/invoices/InvoicesListClient.tsx");
  const targets = [
    "src/app/(dashboard)/customers/CustomersClient.tsx",
    "src/app/(dashboard)/services/ServicesClient.tsx",
    "src/app/(dashboard)/suppliers/SuppliersClient.tsx",
    "src/app/(dashboard)/quotations/QuotationsClient.tsx",
    "src/app/(dashboard)/payments/PaymentsClient.tsx",
  ];
  const controlRow = "flex flex-wrap items-center gap-3 border-b border-surface-variant bg-surface-bright p-4";
  const cardShell = "relative flex min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-surface-variant bg-surface-container-lowest";

  assert.match(reference, new RegExp(cardShell));
  assert.match(reference, new RegExp(controlRow));

  for (const file of targets) {
    const source = read(file);
    const controlRowIndex = source.indexOf(controlRow);
    const pagerIndex = source.indexOf("<PaginationFooter");
    const tableIndex = source.search(/<table|<DataTable/);

    assert.notEqual(controlRowIndex, -1, `${file} must use the compact Invoices control row`);
    assert.ok(controlRowIndex < pagerIndex, `${file} controls must precede its pager`);
    assert.ok(pagerIndex < tableIndex, `${file} pager must directly precede its table region`);
    assert.doesNotMatch(source, /<FilterBar>/, `${file} must not add a nested control shell`);
  }

  const payments = read("src/app/(dashboard)/payments/PaymentsClient.tsx");
  const cardIndex = payments.indexOf(cardShell);
  assert.ok(cardIndex < payments.indexOf("<form", cardIndex));
  assert.ok(payments.indexOf("<form", cardIndex) < payments.indexOf("<PaginationFooter", cardIndex));
});

test("List-shell normalization preserves frozen table contracts", () => {
  const customers = read("src/app/(dashboard)/customers/CustomersClient.tsx");
  const suppliers = read("src/app/(dashboard)/suppliers/SuppliersClient.tsx");
  const quotations = read("src/app/(dashboard)/quotations/QuotationsClient.tsx");
  const payments = read("src/app/(dashboard)/payments/PaymentsClient.tsx");

  assert.match(customers, /TABLE_HEADER_BASE/);
  assert.match(customers, /TABLE_CELL_BASE/);
  assert.match(customers, /formatSarAmount\(dictionary\.locale, customer\.totalQuotedAmount\)/);
  assert.match(customers, /<PendingLink/);

  assert.match(suppliers, /data-supplier-result-count="single"/);
  assert.match(suppliers, /dictionary\.list\.columns\.supplier/);
  assert.match(suppliers, /getSupplierStatusLabel\(locale, supplier\.status\)/);

  assert.match(quotations, /<table className="w-full min-w-\[1100px\] table-fixed border-collapse text-start">/);
  assert.match(quotations, /<col className="w-\[18%\]" \/>/);
  assert.match(quotations, /<col className="w-\[26%\]" \/>/);
  assert.match(quotations, /<col className="w-\[7%\]" \/>/);
  assert.match(quotations, /<col className="w-\[9%\]" \/>/);
  assert.doesNotMatch(quotations, /<DataTable/);
  assert.match(quotations, /formatSarAmount\(dictionary\.locale, quotation\.grandTotal\)/);
  assert.match(quotations, /<StatusBadge variant=\{quotation\.status as StatusBadgeVariant\}>/);

  assert.match(payments, /columns=\{\[/);
  assert.match(payments, /formatSarAmount\(locale, payment\.amount\)/);
  assert.match(payments, /<StatusBadge variant=\{getPaymentStatusBadgeVariant\(payment\.status\)\}>/);
});

test("Quotation and Invoice tables keep local fixed geometry contracts without changing shared primitives", () => {
  const quotations = read("src/app/(dashboard)/quotations/QuotationsClient.tsx");
  const invoices = read("src/app/(dashboard)/invoices/InvoicesListClient.tsx");
  const customers = read("src/app/(dashboard)/customers/CustomersClient.tsx");
  const dataTable = read("src/components/ui/DataTable.tsx");
  const paginationFooter = read("src/components/ui/PaginationFooter.tsx");
  const button = read("src/components/ui/Button.tsx");

  const quotationHeaders = [
    "dictionary.list.table.quotationNumber",
    "dictionary.list.table.clientEvent",
    "dictionary.list.table.issueDate",
    "dictionary.list.table.amountSar",
    "dictionary.list.table.status",
    "dictionary.list.table.view",
    "dictionary.list.table.printPdf",
  ];
  const invoiceHeaders = [
    "dictionary.list.table.invoice",
    "dictionary.list.table.type",
    "dictionary.list.table.document",
    "dictionary.list.table.customer",
    "dictionary.list.table.issueDate",
    "dictionary.list.table.amountSar",
    "dictionary.list.table.status",
    "dictionary.list.table.preview",
    "dictionary.list.table.printPdf",
  ];

  assert.match(quotations, /<table className="w-full min-w-\[1100px\] table-fixed border-collapse text-start">/);
  for (const width of ["18", "26", "14", "15", "11", "7", "9"]) {
    assert.match(quotations, new RegExp(`<col className="w-\\[${width}%\\]" />`));
  }
  assert.equal((quotations.match(/<col className="w-\[\d+%\]" \/>/g) ?? []).length, 7);
  assert.match(quotations, /text-end font-semibold text-on-surface tabular-nums/);
  assert.doesNotMatch(quotations, /dictionary\.list\.table\.actions/);
  assert.match(quotations, /dictionary\.list\.table\.view/);
  assert.match(quotations, /dictionary\.list\.table\.printPdf/);
  assert.doesNotMatch(quotations, /dictionary\.list\.table\.edit|dictionary\.list\.table\.delete/);
  assert.doesNotMatch(quotations, /<Edit|<Trash2|handleDelete|softDeleteQuotation/);
  assert.match(quotations, /aria-label=\{`\$\{dictionary\.list\.actionTitles\.viewDetails\}/);
  assert.match(quotations, /onClick=\{\(\) => openQuotationPdf\(quotation\)\}/);
  assert.equal((quotations.match(/<th className=/g) ?? []).length, 7);
  assert.match(quotations, /<ModuleSearchControl/);
  assert.match(quotations, /<PaginationFooter/);
  assert.match(quotations, /onPageChange=\{\(page\) => navigate\(quotationListHref\(query, page\), "push"\)\}/);

  assert.match(invoices, /<table className="w-full min-w-\[1060px\] table-fixed border-collapse text-start">/);
  assert.match(invoices, /const INVOICE_COLUMN_WIDTHS = \[/);
  assert.match(invoices, /\{INVOICE_COLUMN_WIDTHS\.map\(\(width, index\) => <col key=\{index\} className=\{width\} \/>\)\}/);
  for (const width of ["14", "12", "14", "17", "11", "14", "8", "5", "5"]) {
    assert.match(invoices, new RegExp(`"w-\\[${width}%\\]"`));
  }
  assert.equal((invoices.match(/"w-\[\d+%\]"/g) ?? []).length, 9);
  assert.match(invoices, /text-end font-semibold text-on-surface tabular-nums/);
  assert.match(invoices, /px-4 py-4 text-center"><PendingLink/);

  for (const headers of [quotationHeaders, invoiceHeaders]) {
    let previousIndex = -1;
    const source = headers === quotationHeaders ? quotations : invoices;
    for (const header of headers) {
      const index = source.indexOf(header);
      assert.ok(index > previousIndex, `${header} must remain in column order`);
      previousIndex = index;
    }
  }

  assert.match(customers, /table-fixed/);
  assert.match(dataTable, /<table className="w-full border-collapse"/);
  assert.doesNotMatch(dataTable, /colgroup|table-fixed/);
  assert.match(paginationFooter, /paginationMode/);
  assert.match(button, /sizeClassNames/);
});

test("RecordNavigation uses compact icon-only controls with accessible labels", () => {
  const source = read("src/components/records/RecordNavigation.tsx");

  assert.match(source, /className="flex items-center gap-1 rounded-lg border border-outline-variant bg-surface px-1 py-0\.5"/);
  assert.match(source, /inline-flex size-8 items-center justify-center rounded-md text-primary/);
  assert.match(source, /inline-flex size-8 items-center justify-center rounded-md text-on-surface-variant opacity-45/);
  assert.match(source, /<Icon size=\{14\} aria-hidden="true" \/>/);
  assert.match(source, /aria-label=\{`\$\{label\} \$\{recordType\}`\}/);
  assert.match(source, /title=\{`\$\{label\} \$\{recordType\}`\}/);
  assert.doesNotMatch(source, /hidden sm:inline/);
  assert.doesNotMatch(source, /<span[^>]*>\{label\}<\/span>/);
});

test("Back buttons across detail and form surfaces use LocaleBackIcon and compact 32px sizing", () => {
  const files = [
    "src/app/(dashboard)/customers/[id]/page.tsx",
    "src/app/(dashboard)/services/[id]/page.tsx",
    "src/app/(dashboard)/quotations/[id]/page.tsx",
    "src/app/(dashboard)/invoices/[id]/page.tsx",
    "src/app/(dashboard)/suppliers/[id]/page.tsx",
    "src/app/(dashboard)/services/[id]/approved-billing-scopes/[scopeId]/page.tsx",
    "src/app/(dashboard)/services/new/ServiceForm.tsx",
    "src/app/(dashboard)/services/[id]/edit/EditServiceForm.tsx",
    "src/app/(dashboard)/quotations/new/QuotationForm.tsx",
    "src/app/(dashboard)/suppliers/new/SupplierCreateForm.tsx",
    "src/app/(dashboard)/suppliers/[id]/edit/SupplierEditForm.tsx",
  ];

  for (const file of files) {
    const source = read(file);
    assert.match(source, /LocaleBackIcon/);
    assert.match(source, /h-8 w-8/);
  }
});

test("Quotation detail action hierarchy cleanly separates navigation and mutations with appropriate weights", () => {
  const detailSource = read("src/app/(dashboard)/quotations/[id]/page.tsx");
  const actionsSource = read("src/app/(dashboard)/quotations/[id]/QuotationApprovalActions.tsx");

  // Visual divider separating RecordNavigation from mutations
  assert.match(detailSource, /<RecordNavigation basePath="\/quotations"/);
  assert.match(detailSource, /<div aria-hidden="true" className="hidden h-6 w-px bg-surface-variant sm:block" \/>/);

  // Edit & Print actions use the compact one-line h-9/min-h-9/nowrap contract
  assert.match(detailSource, /<Button asChild variant="outline" size="sm" className="h-9 min-h-9 whitespace-nowrap">/);
  assert.match(detailSource, /<FileEdit size=\{16\} \/>[\s\S]*?dictionary\.detail\.actions\.edit/);
  assert.match(detailSource, /<Printer size=\{16\} \/>[\s\S]*?dictionary\.detail\.actions\.printPdf/);
  assert.match(detailSource, /className="h-9 min-h-9 whitespace-nowrap"\s+disabled/);
  assert.match(detailSource, /checkPermission\("quotations:write"\)/);
  assert.match(detailSource, /canWrite && \(quotation\.status === "draft"/);
  assert.match(detailSource, /onlyDraftEditable/);

  const asChildButtons = detailSource.match(/<Button asChild[\s\S]*?<\/Button>/g) ?? [];
  assert.equal(asChildButtons.length, 2);
  assert.match(asChildButtons[0], /<PendingLink[\s\S]*?<\/PendingLink>/);
  assert.match(asChildButtons[1], /<Link[\s\S]*?<\/Link>/);

  // QuotationApprovalActions uses compact one-line approval actions and an icon-only Delete action
  assert.match(actionsSource, /variant="primary"\s+size="sm"\s+className="h-9 min-h-9 whitespace-nowrap"/);
  assert.match(actionsSource, /variant="danger"\s+size="sm"\s+className="h-9 min-h-9 whitespace-nowrap"/);
  assert.match(actionsSource, /className="h-9 w-9 min-h-9 p-0"/);
  assert.match(actionsSource, /<Trash2 size=\{15\} aria-hidden="true" \/>/);
  assert.match(actionsSource, /title=\{status === "approved" \? listDictionary\.actionTitles\.approvedCannotDelete : listDictionary\.actionTitles\.deleteQuotation\}/);
  assert.match(actionsSource, /aria-label=\{status === "approved" \? listDictionary\.actionTitles\.approvedCannotDelete : listDictionary\.actionTitles\.deleteQuotation\}/);
  assert.match(actionsSource, /disabled=\{status === "approved" \|\| isPending\}/);
  assert.match(actionsSource, /loading=\{isDeleting\}/);
  assert.match(actionsSource, /if \(!canWrite \|\| isPending \|\| status === "approved"\) return;/);
  const deleteButton = actionsSource.match(/<Button\s+type="button"[\s\S]*?className="h-9 w-9 min-h-9 p-0"[\s\S]*?<\/Button>/)?.[0] ?? "";
  assert.notEqual(deleteButton, "");
  assert.doesNotMatch(deleteButton, /loadingLabel/);
  assert.doesNotMatch(deleteButton, /\{listDictionary\.actionTitles\.deleteQuotation\}\s*<\/Button>/);
  assert.match(actionsSource, /softDeleteQuotation/);
  assert.match(actionsSource, /canWrite/);
  assert.match(actionsSource, /status === "approved"/);
  assert.match(actionsSource, /deleteConfirm/);
  assert.match(actionsSource, /deleteFailed/);
  assert.match(actionsSource, /setDeleteError/);
});

test("Quotation detail line items use fixed geometry and logical RTL alignment without changing frozen contracts", () => {
  const detailSource = read("src/app/(dashboard)/quotations/[id]/page.tsx");
  const actionsSource = read("src/app/(dashboard)/quotations/[id]/QuotationApprovalActions.tsx");
  const quotationsList = read("src/app/(dashboard)/quotations/QuotationsClient.tsx");
  const quotationPdf = read("src/app/(dashboard)/quotations/[id]/pdf/page.tsx");
  const tableStart = detailSource.indexOf('<table className="w-full min-w-[760px] table-fixed text-start">');
  const tableEnd = detailSource.indexOf("</table>", tableStart);

  assert.notEqual(tableStart, -1);
  assert.ok(tableEnd > tableStart);
  assert.match(detailSource, /<div className="overflow-x-auto">\s*<table className="w-full min-w-\[760px\] table-fixed text-start">/);

  const lineItemsTable = detailSource.slice(tableStart, tableEnd);
  assert.doesNotMatch(lineItemsTable, /text-left|text-right|w-12|w-16/);
  assert.match(lineItemsTable, /<colgroup>[\s\S]*?<\/colgroup>/);
  assert.deepEqual(lineItemsTable.match(/<col className="w-\[\d+%\]" \/>/g), [
    '<col className="w-[6%]" />',
    '<col className="w-[44%]" />',
    '<col className="w-[10%]" />',
    '<col className="w-[20%]" />',
    '<col className="w-[20%]" />',
  ]);

  assert.match(lineItemsTable, /uppercase text-center">\s*#\s*<\/th>/);
  assert.match(lineItemsTable, /<td className="px-4 py-4 text-center text-on-surface-variant align-top">/);
  assert.match(lineItemsTable, /uppercase text-start">\s*\{dictionary\.detail\.labels\.service\}/);
  assert.match(lineItemsTable, /<td className="px-4 py-4 text-start align-top">/);
  assert.match(lineItemsTable, /uppercase text-center">\s*\{dictionary\.detail\.labels\.qty\}/);
  assert.match(lineItemsTable, /<td className="px-4 py-4 text-center text-on-surface align-top">/);
  assert.equal((lineItemsTable.match(/text-end/g) ?? []).length, 4);

  assert.equal((lineItemsTable.match(/<bdi dir="auto">/g) ?? []).length, 2);
  assert.doesNotMatch(lineItemsTable, /<div[^>]*dir="auto"/);
  assert.equal((lineItemsTable.match(/<td[^>]*dir="ltr"/g) ?? []).length, 0);
  assert.equal((lineItemsTable.match(/<span dir="ltr">/g) ?? []).length, 4);
  assert.match(lineItemsTable, /<span dir="ltr">\{formatQuantity\(item\.qty\)\}<\/span>/);
  assert.match(lineItemsTable, /<span dir="ltr">\{formatMoney\(item\.unitPrice\)\}<\/span>/);
  assert.match(lineItemsTable, /<span dir="ltr">\{formatMoney\(item\.total\)\}<\/span>/);

  // Accepted action-density contract remains frozen.
  assert.match(detailSource, /className="h-9 min-h-9 whitespace-nowrap"/);
  assert.match(actionsSource, /className="h-9 w-9 min-h-9 p-0"/);

  // Accepted list geometry, PDF surface, and authority path remain present.
  assert.match(quotationsList, /<table className="w-full min-w-\[1100px\] table-fixed border-collapse text-start">/);
  assert.match(quotationPdf, /quotation-print-page document-/);
  assert.match(detailSource, /checkPermission\("quotations:write"\)/);
  assert.match(detailSource, /QuotationBillingAuthorityCard/);
});

test("Quotation detail free-form Client and Event Name values use bounded bidi islands", () => {
  const detailSource = read("src/app/(dashboard)/quotations/[id]/page.tsx");
  const detailsStart = detailSource.indexOf('<div className="p-6 grid grid-cols-2 gap-6">');
  const lineItemsStart = detailSource.indexOf('<div className="overflow-x-auto">', detailsStart);
  const detailsCard = detailSource.slice(detailsStart, lineItemsStart);

  assert.notEqual(detailsStart, -1);
  assert.ok(lineItemsStart > detailsStart);
  assert.match(detailsCard, /<div className="text-on-surface font-medium text-start">\s*<bdi dir="auto">\{quotation\.customer\?\.company \|\| dictionary\.detail\.states\.unknownCompany\}<\/bdi>\s*<\/div>/);
  assert.match(detailsCard, /<div className="text-on-surface font-medium text-start">\s*<bdi dir="auto">\{quotation\.event\}<\/bdi>\s*<\/div>/);
  assert.doesNotMatch(detailsCard, /<div[^>]*dir="auto"/);

  // Date and numeric formatting remain outside this free-form bidi treatment.
  assert.match(detailsCard, /<UiDateText locale=\{locale\} value=\{quotation\.date\} \/>/);
  assert.match(detailsCard, /<UiDateText locale=\{locale\} value=\{quotation\.validUntil\} \/>/);
});

test("List header primary and utility action buttons use consistent size='sm'", () => {
  const pageHeader = read("src/components/ui/PageHeader.tsx");
  const customers = read("src/app/(dashboard)/customers/CustomersClient.tsx");
  const services = read("src/app/(dashboard)/services/ServicesClient.tsx");
  const quotations = read("src/app/(dashboard)/quotations/QuotationsClient.tsx");
  const suppliers = read("src/app/(dashboard)/suppliers/SuppliersClient.tsx");
  const invoices = read("src/app/(dashboard)/invoices/InvoicesListClient.tsx");

  assert.match(pageHeader, /<div className="flex items-center gap-3">\{children\}<\/div>/);

  assert.match(customers, /<Button asChild variant="outline" size="sm">/);
  assert.match(customers, /<Button asChild size="sm">\s*<button type="button" onClick=\{openAddModal\}/);

  assert.match(services, /<Button asChild size="sm">/);

  assert.match(quotations, /<Button asChild size="sm">\s*<button\s+ref=\{selectorTriggerRef\}/);

  assert.match(suppliers, /<Button\s+type="button"\s+variant="outline"\s+size="sm"/);
  assert.match(suppliers, /<Button asChild size="sm">/);

  assert.match(invoices, /<Button asChild size="sm">\s*<button\s+ref=\{createInvoiceTriggerRef\}/);
  assert.match(invoices, /<Button asChild variant="outline" size="sm">/);
});

test("Create and edit form action buttons use consistent size='sm'", () => {
  const customerProfile = read("src/app/(dashboard)/customers/[id]/CustomerProfileActions.tsx");
  const serviceNew = read("src/app/(dashboard)/services/new/ServiceForm.tsx");
  const serviceEdit = read("src/app/(dashboard)/services/[id]/edit/EditServiceForm.tsx");
  const quotationNew = read("src/app/(dashboard)/quotations/new/QuotationForm.tsx");
  const supplierNew = read("src/app/(dashboard)/suppliers/new/SupplierCreateForm.tsx");
  const supplierEdit = read("src/app/(dashboard)/suppliers/[id]/edit/SupplierEditForm.tsx");

  assert.match(customerProfile, /<Button\s+type="submit"\s+loading=\{isPending\}\s+size="sm"/);
  assert.match(serviceNew, /<Button\s+type="submit"\s+loading=\{isSubmitting\}\s+size="sm"/);
  assert.match(serviceEdit, /<Button\s+type="submit"\s+loading=\{isSubmitting\}\s+size="sm"/);
  assert.match(quotationNew, /<Button\s+type="submit"\s+loading=\{isSubmitting\}\s+size="sm"/);
  assert.match(supplierNew, /<Button type="submit" loading=\{isSubmitting\} size="sm" className="h-9 min-h-9 whitespace-nowrap">/);
  assert.match(supplierEdit, /<Button type="submit" loading=\{isSubmitting\} size="sm" className="h-9 min-h-9 whitespace-nowrap">/);
  assert.match(supplierNew, /<Button type="button" onClick=\{\(\) => push\("\/suppliers"\)\} disabled=\{isSubmitting\} variant="outline" size="sm" className="h-9 min-h-9 whitespace-nowrap">/);
  assert.match(supplierEdit, /<Button type="button" onClick=\{\(\) => push\(`\/suppliers\/\$\{supplier\.id\}`\)\} disabled=\{isSubmitting\} variant="outline" size="sm" className="h-9 min-h-9 whitespace-nowrap">/);
  assert.match(supplierNew, /<span className="inline-flex items-center gap-2"><Save size=\{16\} aria-hidden="true" \/>/);
  assert.match(supplierEdit, /<span className="inline-flex items-center gap-2"><Save size=\{16\} aria-hidden="true" \/>/);
});

test("Customer Profile Edit Profile action uses the compact primary action hierarchy", () => {
  const customerProfile = read("src/app/(dashboard)/customers/[id]/CustomerProfileActions.tsx");

  assert.match(customerProfile, /<Button\s+type="button"[\s\S]*?size="sm"/);
  assert.match(customerProfile, /className="h-9 min-h-9 whitespace-nowrap"/);
  assert.match(customerProfile, /<span className="inline-flex items-center gap-2">\s*<Pencil size=\{16\} aria-hidden="true" \/>/);
  assert.match(customerProfile, /\{dictionary\.actions\.editProfile\}/);
});

test("Payments retains submitted search semantics and renders one top bounded pager", () => {
  const payments = read("src/app/(dashboard)/payments/PaymentsClient.tsx");
  const pagerIndex = payments.indexOf("<PaginationFooter");
  const tableIndex = payments.indexOf("<DataTable");

  assert.notEqual(pagerIndex, -1);
  assert.ok(pagerIndex < tableIndex);
  assert.equal(payments.indexOf("<PaginationFooter", pagerIndex + 1), -1);
  assert.match(payments, /paginationMode="bounded"/);
  assert.doesNotMatch(payments, /className="border-t-0"/);
  assert.match(payments, /sanitizeSearchTerm\(rawSearch\)/);
  assert.match(payments, /navigate\(paymentListHref\(\{ \.\.\.query, search: search \|\| undefined \}, 1\), "replace", "search"\)/);
});

test("Report filters form controls use normalized compact sizing", () => {
  const reports = read("src/app/(dashboard)/reports/page.tsx");

  assert.match(reports, /className="inline-flex min-h-9 items-center justify-center rounded-lg bg-primary px-3\.5 py-1\.5 text-\[13px\]/);
  assert.match(reports, /className="h-9 rounded-lg border border-outline-variant bg-surface px-3 text-\[13px\]/);
});

test("Important Exception: Create Deposit and Create Final Invoice buttons retain appropriate action weight and are not blanket-shrunk", () => {
  const finalInvoiceAction = read("src/app/(dashboard)/services/[id]/CreateFinalInvoiceAction.tsx");
  const depositInvoiceAction = read("src/app/(dashboard)/services/[id]/CreateDepositInvoiceAction.tsx");

  // Both actions maintain their default size="md" button weight
  assert.doesNotMatch(finalInvoiceAction, /size="sm"/);
  assert.doesNotMatch(depositInvoiceAction, /size="sm"/);
});

test("Document preview Print button uses horizontal non-wrapping composition and standard action size", () => {
  const printSource = read("src/components/documents/PrintButton.tsx");

  assert.match(printSource, /variant="primary"/);
  assert.match(printSource, /size="sm"/);
  assert.match(printSource, /inline-flex items-center gap-2 whitespace-nowrap/);
  assert.match(printSource, /<Printer size=\{16\}/);
});

test("Back buttons across surfaces use destination-accurate or destination-neutral accessible labels", () => {
  const quotationDetail = read("src/app/(dashboard)/quotations/[id]/page.tsx");
  const supplierEdit = read("src/app/(dashboard)/suppliers/[id]/edit/SupplierEditForm.tsx");
  const serviceNew = read("src/app/(dashboard)/services/new/ServiceForm.tsx");
  const serviceEdit = read("src/app/(dashboard)/services/[id]/edit/EditServiceForm.tsx");
  const quotationNew = read("src/app/(dashboard)/quotations/new/QuotationForm.tsx");
  const absDetail = read("src/app/(dashboard)/services/[id]/approved-billing-scopes/[scopeId]/page.tsx");

  // Quotation detail uses destination-neutral common actions.back for dynamic returnTo link
  assert.match(quotationDetail, /aria-label=\{getCommonDictionary\(locale\)\.actions\.back\}/);

  // Supplier edit uses backToSupplier
  assert.match(supplierEdit, /aria-label=\{dictionary\.form\.backToSupplier\}/);

  // History-back buttons use destination-neutral common actions.back
  assert.match(serviceNew, /aria-label=\{getCommonDictionary\(dictionary\.locale\)\.actions\.back\}/);
  assert.match(serviceEdit, /aria-label=\{getCommonDictionary\(dictionary\.locale\)\.actions\.back\}/);
  assert.match(quotationNew, /aria-label=\{getCommonDictionary\(dictionary\.locale\)\.actions\.back\}/);

  // Stale ArrowLeft import removed from ABS detail
  assert.doesNotMatch(absDetail, /import\s*\{\s*ArrowLeft\s*\}\s*from\s*"lucide-react"/);
});
