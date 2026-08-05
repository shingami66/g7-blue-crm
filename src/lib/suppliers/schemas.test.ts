import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { mapRowToSupplier, mapRowToSupplierDirectoryItem } from "./mappers.ts";
import { createSupplierSchema, updateSupplierSchema } from "./schemas.ts";
import {
  normalizeSupplierListPage,
  normalizeSupplierListPageSize,
  normalizeSupplierListSearch,
  SUPPLIER_PAGE_SIZE,
} from "./types.ts";

const REPO_ROOT = join(import.meta.dirname, "../../..");
const ACTIONS = join(REPO_ROOT, "src/lib/suppliers/actions.ts");
const QUERIES = join(REPO_ROOT, "src/lib/suppliers/queries.ts");
const LIST_CLIENT = join(REPO_ROOT, "src/app/(dashboard)/suppliers/SuppliersClient.tsx");

const validInput = {
  displayName: "Supplier One",
  legalName: null,
  supplierType: "company",
  category: "sound",
  contactName: "Primary Contact",
  phone: "+966500000000",
  whatsappPhone: null,
  email: null,
  city: "Riyadh",
  country: "Saudi Arabia",
  coverageArea: null,
  crNumber: null,
  vatRegistrationStatus: "unknown",
  vatNumber: null,
  paymentTerms: null,
  status: "active",
  isPreferred: false,
  notes: null,
};

function source(path: string) {
  return readFileSync(path, "utf8");
}

test("Supplier create requires the approved directory fields", () => {
  assert.equal(createSupplierSchema.safeParse(validInput).success, true);
  for (const field of ["displayName", "supplierType", "category", "contactName", "phone", "city", "country", "status"] as const) {
    const candidate: Record<string, unknown> = { ...validInput };
    delete candidate[field];
    assert.equal(createSupplierSchema.safeParse(candidate).success, false, `${field} must be required`);
  }
});

test("Supplier VAT status and VAT-number pairing are enforced", () => {
  assert.equal(createSupplierSchema.safeParse({ ...validInput, vatRegistrationStatus: "registered", vatNumber: "300000000000003" }).success, true);
  assert.equal(createSupplierSchema.safeParse({ ...validInput, vatRegistrationStatus: "registered", vatNumber: null }).success, false);
  assert.equal(createSupplierSchema.safeParse({ ...validInput, vatRegistrationStatus: "unknown", vatNumber: "300000000000003" }).success, false);
  assert.equal(createSupplierSchema.safeParse({ ...validInput, vatRegistrationStatus: "not_registered", vatNumber: "300000000000003" }).success, false);
});

test("Supplier mapper keeps the list DTO sanitized and redacts bank data", () => {
  const row = {
    id: "00000000-0000-4000-8000-000000000001",
    supplier_number: "SUP-001",
    supplier_type: "company",
    category: "sound",
    display_name: "Supplier One",
    legal_name: "Supplier One Legal",
    name: "Supplier One",
    contact_name: "Primary Contact",
    contact: "Primary Contact",
    phone: "+966500000000",
    city: "Riyadh",
    country: "Saudi Arabia",
    coverage_area: "Central region",
    rating: 4.5,
    status: "active",
    is_preferred: false,
    is_deleted: false,
    vat_registration_status: "registered",
    vat_number: "300000000000003",
    cr_number: "1234567890",
    notes: "Internal note",
    bank_name: "Bank",
    bank_account_name: "Account Holder",
    iban: "SA0000000000000000000000",
  };
  const directory = mapRowToSupplierDirectoryItem(row);
  assert.deepEqual(Object.keys(directory).sort(), ["category", "city", "coverageArea", "country", "id", "isDeleted", "isPreferred", "name", "phone", "rating", "status", "supplierNumber", "supplierType"].sort());

  const redacted = mapRowToSupplier(row, { canViewSensitive: false, canReadBank: false });
  assert.equal(redacted.vatNumber, null);
  assert.equal(redacted.crNumber, null);
  assert.equal(redacted.notes, null);
  assert.equal(redacted.bankName, null);
  assert.equal(redacted.iban, null);

  const admin = mapRowToSupplier(row, { canViewSensitive: true, canReadBank: true });
  assert.equal(admin.vatNumber, "300000000000003");
  assert.equal(admin.bankName, "Bank");
  assert.equal(admin.iban, "SA0000000000000000000000");
});

test("Supplier server actions retain bank, delete, dependency, restore, and affected-row controls", () => {
  const actions = source(ACTIONS);
  assert.match(actions, /requirePermission\("suppliers:write_bank"\)/);
  assert.match(actions, /requirePermission\("suppliers:delete"\)/);
  assert.match(actions, /service_supplier_allocations/);
  assert.match(actions, /supplier_bookings/);
  assert.match(actions, /neq\("status", "cancelled"\)/);
  assert.match(actions, /const restoredStatus = existingStatus === "blacklisted" \? "blacklisted" : "inactive"/);
  assert.match(actions, /select\("id"\)\s*\.maybeSingle\(\)/);
  assert.equal(updateSupplierSchema.safeParse({ ...validInput, id: "00000000-0000-4000-8000-000000000001", bankName: "Bank", bankAccountName: "Account", iban: "SA0000000000000000000000" }).success, true);
});

test("Supplier queries keep deleted rows separate and list fields non-sensitive", () => {
  const queries = source(QUERIES);
  const directoryBlock = queries.slice(0, queries.indexOf("const SUPPLIER_DETAIL_SELECT"));
  assert.doesNotMatch(directoryBlock, /vat_number|cr_number|notes|blacklisted_reason|bank_name|iban/);
  assert.match(queries, /request\.eq\("is_deleted", false\)\.is\("deleted_at", null\)/);
  assert.match(queries, /request\.eq\("is_deleted", true\)/);
  assert.match(queries, /checkPermission\("suppliers:read_bank"\)/);
});

test("Supplier directory pagination is server-ranged and query-safe", () => {
  const queries = source(QUERIES);
  const client = source(LIST_CLIENT);

  assert.equal(SUPPLIER_PAGE_SIZE, 10);
  assert.equal(normalizeSupplierListPage(undefined), 1);
  assert.equal(normalizeSupplierListPage("0"), 1);
  assert.equal(normalizeSupplierListPage("invalid"), 1);
  assert.equal(normalizeSupplierListPage("999999999999999999999"), 1);
  assert.equal(normalizeSupplierListPage("3"), 3);
  assert.equal(normalizeSupplierListSearch("  Supplier-01!  "), "Supplier-01");
  assert.equal(normalizeSupplierListSearch("!!!"), undefined);
  for (const { pageSize, ranges } of [
    { pageSize: 10, ranges: [[1, 0, 9], [2, 10, 19], [3, 20, 29]] },
    { pageSize: 20, ranges: [[1, 0, 19], [2, 20, 39], [3, 40, 59]] },
    { pageSize: 50, ranges: [[1, 0, 49], [2, 50, 99], [3, 100, 149]] },
  ]) {
    assert.equal(normalizeSupplierListPageSize(String(pageSize)), pageSize);
    for (const [page, expectedStart, expectedEnd] of ranges) {
      const rangeStart = (page - 1) * pageSize;
      assert.equal(rangeStart, expectedStart);
      assert.equal(rangeStart + pageSize - 1, expectedEnd);
    }
  }
  assert.match(queries, /select\("id", \{ count: "exact", head: true \}\)/);
  assert.match(queries, /dataRequest\.range\(/);
  assert.match(queries, /const pageSize = normalizeSupplierListPageSize\(options\.pageSize\)/);
  assert.match(queries, /const rangeStart = \(page - 1\) \* pageSize;/);
  assert.match(queries, /rangeStart,\s*rangeStart \+ pageSize - 1/);
  assert.match(queries, /Math\.min\(Math\.max\(options\.page \?\? 1, 1\), totalPages\)/);
  assert.match(client, /navigate\(supplierListHref\(\{ \.\.\.filters, page \}, showDeleted\), "push"\)/);
  assert.match(client, /onSubmit=\{\(_, nextSearch\) => updateFilters\(\{ search: nextSearch \}, true\)\}/);
  assert.match(client, /updateFilters\(\{ status \}, true\)/);
  assert.match(client, /updateFilters\(\{ category \}, true\)/);
});
