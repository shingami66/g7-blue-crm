import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const REPO_ROOT = join(import.meta.dirname, "../../..");

function read(rel: string) {
  return readFileSync(join(REPO_ROOT, rel), "utf8");
}

const QUOTATION_FORM = "src/app/(dashboard)/quotations/new/QuotationForm.tsx";
const SERVICE_FORM = "src/app/(dashboard)/services/new/ServiceForm.tsx";
const EDIT_SERVICE_FORM = "src/app/(dashboard)/services/[id]/edit/EditServiceForm.tsx";
const RELATED = "src/app/(dashboard)/services/[id]/RelatedQuotationsCard.tsx";
const INVOICES = "src/app/(dashboard)/invoices/InvoicesListClient.tsx";
const CUSTOMERS = "src/app/(dashboard)/customers/CustomersClient.tsx";
const SERVICES = "src/app/(dashboard)/services/ServicesClient.tsx";
const QUOTATIONS = "src/app/(dashboard)/quotations/QuotationsClient.tsx";
const SUPPLIERS = "src/app/(dashboard)/suppliers/SuppliersClient.tsx";
const DATA_TABLE = "src/components/ui/DataTable.tsx";

test("quotation line-item grid stacks below md and keeps desktop 12-column contract", () => {
  const source = read(QUOTATION_FORM);
  assert.match(source, /grid grid-cols-1 gap-3 md:grid-cols-12/);
  assert.match(source, /md:col-span-6/);
  assert.match(source, /md:col-span-3/);
  assert.doesNotMatch(source, /grid grid-cols-12 gap-3/);
  // Field contracts preserved
  assert.match(source, /dictionary\.form\.description/);
  assert.match(source, /dictionary\.form\.qty/);
  assert.match(source, /dictionary\.form\.unitPriceSar/);
  assert.match(source, /removeItem|addItem/);
  assert.match(source, /updateItem\(index, "qty"/);
  assert.match(source, /updateItem\(index, "unitPrice"/);
});

test("quotation date and financial groups stack on mobile", () => {
  const source = read(QUOTATION_FORM);
  const dateGroupMatches = source.match(/grid grid-cols-1 md:grid-cols-2 gap-4/g) ?? [];
  assert.ok(dateGroupMatches.length >= 2, "expected stacked date and financial groups");
  assert.match(source, /dictionary\.form\.issueDate/);
  assert.match(source, /dictionary\.form\.validUntil/);
  assert.match(source, /dictionary\.form\.discountSar/);
  assert.match(source, /dictionary\.form\.vat/);
  assert.match(source, /dictionary\.form\.notApplied/);
});

test("service date pairs stack on mobile in create and edit forms", () => {
  for (const path of [SERVICE_FORM, EDIT_SERVICE_FORM]) {
    const source = read(path);
    assert.match(source, /grid grid-cols-1 md:grid-cols-2 gap-4/, path);
    assert.doesNotMatch(source, /grid grid-cols-2 gap-4/, path);
    assert.match(source, /event_start_date|eventStartDate|labels\.startDate/, path);
    assert.match(source, /event_end_date|eventEndDate|labels\.endDate/, path);
  }
});

test("filter and search icons use logical inline positioning", () => {
  const filterSurfaces = [CUSTOMERS, SERVICES, QUOTATIONS, INVOICES, SUPPLIERS];
  for (const path of filterSurfaces) {
    const source = read(path);
    // No physical absolute left/right for filter/search adornments
    assert.doesNotMatch(
      source,
      /absolute (left|right)-\d/,
      `${path} must not use physical absolute left/right for icons`,
    );
    // Selects with end-side icons use pe padding; search uses ps when start icon present
    if (source.includes("Filter")) {
      assert.match(source, /absolute end-3/, path);
      assert.match(source, /pe-8/, path);
    }
  }

  const invoices = read(INVOICES);
  assert.match(invoices, /absolute start-3/);
  assert.match(invoices, /ps-9/);
  assert.match(invoices, /absolute end-3/);

  const suppliers = read(SUPPLIERS);
  assert.match(suppliers, /absolute start-3/);
  assert.match(suppliers, /ps-9/);
});

test("related quotations header stacks on mobile; table-local overflow preserved", () => {
  const source = read(RELATED);
  assert.match(source, /flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between/);
  assert.match(source, /flex flex-wrap items-center gap-3/);
  assert.match(source, /relatedQuotations\.createQuotation/);
  assert.match(source, /overflow-x-auto/);
  assert.match(source, /min-w-\[720px\]/);
});

test("invoice search uses mobile-safe width contract", () => {
  const source = read(INVOICES);
  assert.match(source, /w-full min-w-0 flex-1 max-w-sm sm:min-w-\[220px\]/);
  assert.doesNotMatch(source, /relative min-w-\[220px\] flex-1 max-w-sm/);
  assert.match(source, /dictionary\.list\.export/);
  // Invoice list uses a plain table inside overflow-auto (filter/table behavior preserved)
  assert.match(source, /overflow-auto/);
  assert.match(source, /<table className="w-full/);
});

test("accepted table-local overflow wrappers remain present", () => {
  assert.match(read(CUSTOMERS), /overflow-x-auto/);
  assert.match(read(CUSTOMERS), /min-w-\[1060px\]/);
  assert.match(read(SERVICES), /overflow-x-auto/);
  assert.match(read(SERVICES), /min-w-\[1120px\]/);
  assert.match(read(DATA_TABLE), /overflow-x-auto w-full/);
  assert.match(read(RELATED), /overflow-x-auto/);
  assert.match(read(RELATED), /min-w-\[720px\]/);
});

test("supplier mobile detail fallback was not added; panel remains desktop-only", () => {
  const source = read(SUPPLIERS);
  assert.match(source, /hidden lg:flex/);
  assert.doesNotMatch(source, /mobile-detail|MobileDetail|SupplierMobile|md:hidden[\s\S]{0,80}activeSupplier/);
  // No temporary mobile-only drawer for supplier detail (desktop panel stays lg+ only)
  assert.doesNotMatch(source, /lg:hidden[\s\S]{0,120}activeSupplier|activeSupplier[\s\S]{0,120}lg:hidden/);
  // Selection still sets selectedSupplierId for desktop panel
  assert.match(source, /setSelectedSupplierId/);
  assert.match(source, /data-supplier-panel-title/);
});
