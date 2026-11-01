import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { getSupplierCategoryLabel, getSupplierStatusLabel, getSupplierTypeLabel, getSuppliersDictionary } from "./dictionaries/suppliers.ts";

const REPO_ROOT = join(import.meta.dirname, "../../..");
const LIST_PAGE = join(REPO_ROOT, "src/app/(dashboard)/suppliers/page.tsx");
const LIST_CLIENT = join(REPO_ROOT, "src/app/(dashboard)/suppliers/SuppliersClient.tsx");
const DETAIL_PAGE = join(REPO_ROOT, "src/app/(dashboard)/suppliers/[id]/page.tsx");
const CREATE_FORM = join(REPO_ROOT, "src/app/(dashboard)/suppliers/new/SupplierCreateForm.tsx");
const EDIT_FORM = join(REPO_ROOT, "src/app/(dashboard)/suppliers/[id]/edit/SupplierEditForm.tsx");
const DELETE_ACTIONS = join(REPO_ROOT, "src/app/(dashboard)/suppliers/[id]/SupplierDeleteRestoreActions.tsx");
const CUSTOMERS_LIST = join(REPO_ROOT, "src/app/(dashboard)/customers/CustomersClient.tsx");
const SERVICES_LIST = join(REPO_ROOT, "src/app/(dashboard)/services/ServicesClient.tsx");
const QUOTATIONS_LIST = join(REPO_ROOT, "src/app/(dashboard)/quotations/QuotationsClient.tsx");
const INVOICES_LIST = join(REPO_ROOT, "src/app/(dashboard)/invoices/InvoicesListClient.tsx");

function read(path: string) {
  return readFileSync(path, "utf8");
}

function isDictionaryObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function leafKeys(value: unknown, prefix = ""): string[] {
  if (!isDictionaryObject(value)) return prefix ? [prefix] : [];
  return Object.entries(value).flatMap(([key, child]) => leafKeys(child, prefix ? `${prefix}.${key}` : key));
}

test("Supplier dictionary English and Arabic shapes remain aligned", () => {
  assert.deepEqual(leafKeys(getSuppliersDictionary("en")).sort(), leafKeys(getSuppliersDictionary("ar")).sort());
  assert.equal(getSuppliersDictionary("ar").list.title, "الموردون");
  assert.equal(getSuppliersDictionary("en").list.columns.classification, "Classification");
  assert.equal(getSuppliersDictionary("en").list.columns.contact, "Contact");
  assert.equal(getSuppliersDictionary("ar").list.columns.classification, "التصنيف");
  assert.equal(getSuppliersDictionary("ar").list.columns.contact, "التواصل");
  assert.equal(getSuppliersDictionary("ar").list.deletedMode, "الموردون المحذوفون");
  assert.equal(getSuppliersDictionary("ar").detail.bankDetails, "البيانات البنكية");
});

test("Supplier labels and V1 status values stay localized", () => {
  assert.equal(getSupplierStatusLabel("ar", "active"), "نشط");
  assert.equal(getSupplierTypeLabel("ar", "company"), "شركة");
  assert.equal(getSupplierCategoryLabel("ar", "sound"), "صوت");
  assert.equal(getSuppliersDictionary("en").vatRegistration.unknown, "Unknown");
});

test("Supplier list uses safe route navigation rather than a local detail panel", () => {
  const list = read(LIST_CLIENT);
  assert.match(read(LIST_PAGE), /getSuppliersList\(query\)/);
  assert.match(list, /supplierDetailHref\(supplier\.id, showDeleted, returnTo\)/);
  assert.match(list, /const returnTo = supplierListHref\(filters, showDeleted\)/);
  assert.doesNotMatch(list, /SupplierBlacklistActions|SupplierRateCardsList|blacklistedReason|vatNumber|crNumber|bankName|notes/);
  assert.doesNotMatch(list, /supplier\.id\s*\?\?/);
});

test("Supplier directory groups five desktop columns and retains a focused mobile card", () => {
  const list = read(LIST_CLIENT);
  const desktopStart = list.indexOf("data-supplier-desktop-table");
  const mobileStart = list.indexOf('data-testid="mobile-supplier-cards"');
  assert.ok(desktopStart >= 0 && mobileStart > desktopStart, "expected distinct desktop and mobile surfaces");
  const desktop = list.slice(desktopStart, mobileStart);

  assert.equal((desktop.match(/<th scope="col"/g) ?? []).length, 5);
  assert.match(desktop, /columns\.supplier/);
  assert.match(desktop, /columns\.classification/);
  assert.match(desktop, /columns\.contact/);
  assert.match(desktop, /columns\.location/);
  assert.match(desktop, /columns\.status/);
  assert.match(desktop, /SupplierIdentity/);
  assert.match(desktop, /SupplierClassification/);
  assert.match(desktop, /SupplierLocation/);
  assert.match(desktop, /StatusBadge/);
  assert.match(desktop, /colSpan=\{5\}/);
  assert.doesNotMatch(desktop, /<Eye|columns\.actions|min-w-\[1080px\]/);

  const mobile = list.slice(mobileStart);
  assert.match(mobile, /SupplierClassification/);
  assert.match(mobile, /SupplierLocation/);
  assert.match(mobile, /columns\.contact/);
  assert.match(mobile, /<Eye/);
  assert.match(list, /data-supplier-filters/);
  assert.match(list, /data-supplier-deleted-mode/);
  assert.match(list, /<bdi dir="auto">\{supplier\.city\}<\/bdi>/);
  assert.match(list, /<span aria-hidden="true" dir="ltr">, <\/span>/);
});

test("Supplier detail, forms, and delete UI remain dictionary-driven", () => {
  const forbidden = ["Access Denied", "Supplier Details", "Delete Supplier", "Bank Details"];
  for (const file of [DETAIL_PAGE, CREATE_FORM, EDIT_FORM, DELETE_ACTIONS]) {
    const source = read(file);
    for (const phrase of forbidden) {
      assert.equal(source.includes(`>${phrase}<`) || source.includes(`\"${phrase}\"`) || source.includes(`'${phrase}'`), false, `${file} contains ${phrase}`);
    }
    assert.doesNotMatch(source, /service_role|PGRST|postgres error/i);
  }
  assert.match(read(DETAIL_PAGE), /supplier\.canReadBank/);
  assert.match(read(EDIT_FORM), /canManageBankDetails/);
  assert.match(read(DELETE_ACTIONS), /deleteSupplier|restoreSupplier/);
});

test("Dashboard directory detail links use the localized Supplier eye-control contract", () => {
  const expected = [
    [CUSTOMERS_LIST, /href=\{`\/customers\/\$\{customer\.id\}\?returnTo=/, /dictionary\.list\.actions\.view/],
    [SERVICES_LIST, /href=\{`\/services\/\$\{service\.id\}\?returnTo=/, /dictionary\.list\.actions\.view/],
    [QUOTATIONS_LIST, /push\(.*quotation\.id.*returnTo=/, /dictionary\.list\.actionTitles\.viewDetails/],
    [INVOICES_LIST, /href=\{`\/invoices\/\$\{invoice\.id\}\?returnTo=/, /dictionary\.list\.table\.preview/],
  ] as const;

  for (const [file, destination, label] of expected) {
    const source = read(file);
    assert.match(source, destination);
    assert.match(source, label);
    assert.match(source, /className="inline-flex rounded p-2 text-primary hover:bg-primary-fixed/);
    assert.match(source, /<Eye size=\{17\} \/>/);
  }
});
