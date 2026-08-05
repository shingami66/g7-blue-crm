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
  assert.doesNotMatch(list, /SupplierBlacklistActions|SupplierRateCardsList|blacklistedReason|vatNumber|crNumber|bankName|notes/);
  assert.doesNotMatch(list, /supplier\.id\s*\?\?/);
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
