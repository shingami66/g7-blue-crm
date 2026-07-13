import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import {
  getSupplierCategoryLabel,
  getSupplierStatusLabel,
  getSupplierTypeLabel,
  getSuppliersDictionary,
} from "./dictionaries/suppliers.ts";
import { formatSarAmount, formatUiDate, formatUiNumber } from "./formatting.ts";

const REPO_ROOT = join(import.meta.dirname, "../../..");
const LIST_PAGE = join(REPO_ROOT, "src/app/(dashboard)/suppliers/page.tsx");
const LIST_CLIENT = join(REPO_ROOT, "src/app/(dashboard)/suppliers/SuppliersClient.tsx");
const CREATE_PAGE = join(REPO_ROOT, "src/app/(dashboard)/suppliers/new/page.tsx");
const CREATE_FORM = join(REPO_ROOT, "src/app/(dashboard)/suppliers/new/SupplierCreateForm.tsx");
const EDIT_PAGE = join(REPO_ROOT, "src/app/(dashboard)/suppliers/[id]/edit/page.tsx");
const EDIT_FORM = join(REPO_ROOT, "src/app/(dashboard)/suppliers/[id]/edit/SupplierEditForm.tsx");
const BLACKLIST = join(REPO_ROOT, "src/app/(dashboard)/suppliers/SupplierBlacklistActions.tsx");
const RATE_CARDS = join(REPO_ROOT, "src/app/(dashboard)/suppliers/SupplierRateCardsList.tsx");
const ACTIONS = join(REPO_ROOT, "src/lib/suppliers/actions.ts");
const PERMISSIONS = join(REPO_ROOT, "src/lib/auth/permissions.ts");

const ARABIC_INDIC = /[٠-٩]/;
const STATUS_CODES = ["active", "on_hold", "blacklisted", "inactive"] as const;
const TYPE_CODES = ["company", "individual"] as const;

function listNestedKeys(value: unknown, prefix = ""): string[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return prefix ? [prefix] : [];
  }
  return Object.entries(value as Record<string, unknown>).flatMap(([key, nested]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    if (nested && typeof nested === "object" && !Array.isArray(nested)) {
      return listNestedKeys(nested, path);
    }
    return [path];
  });
}

function read(path: string) {
  return readFileSync(path, "utf8");
}

test("1. Suppliers dictionary EN/AR shapes aligned", () => {
  const en = getSuppliersDictionary("en");
  const ar = getSuppliersDictionary("ar");
  assert.deepEqual(listNestedKeys(en).sort(), listNestedKeys(ar).sort());
});

test("2. List headings, filters, empty states localize", () => {
  const en = getSuppliersDictionary("en");
  const ar = getSuppliersDictionary("ar");
  assert.equal(en.list.title, "Suppliers");
  assert.equal(ar.list.title, "الموردون");
  assert.equal(ar.list.newSupplier, "مورد جديد");
  assert.equal(ar.states.noSuppliers.includes("مورد"), true);
  assert.notEqual(en.states.noSuppliers, en.states.noFilteredSuppliers);
  assert.match(read(LIST_CLIENT), /dictionary\.list\.title/);
  assert.match(read(LIST_CLIENT), /statusFilter/);
  assert.match(read(LIST_CLIENT), /value="active"|STATUS_OPTIONS/);
});

test("3-5. Status/type codes stable; preferred separate; unblacklist inactive preserved", () => {
  assert.equal(getSupplierStatusLabel("ar", "active"), "نشط");
  assert.equal(getSupplierStatusLabel("ar", "blacklisted"), "قائمة سوداء");
  assert.equal(getSupplierTypeLabel("ar", "company"), "شركة");
  assert.equal(getSupplierTypeLabel("ar", "individual"), "فرد");
  assert.deepEqual(Object.keys(getSuppliersDictionary("en").statuses).sort(), [
    ...STATUS_CODES,
  ].sort());
  assert.deepEqual(Object.keys(getSuppliersDictionary("en").types).sort(), [...TYPE_CODES].sort());

  const blacklist = read(BLACKLIST);
  assert.match(blacklist, /blacklistSupplier|unblacklistSupplier/);
  assert.match(blacklist, /dictionary\.unblacklistBody|inactive/);
  // Action still used; unblacklist body documents inactive restore
  assert.match(read(ACTIONS), /unblacklistSupplier|inactive/);
});

test("6-8. Create/edit forms dictionary-driven; payloads unchanged", () => {
  const ar = getSuppliersDictionary("ar");
  assert.equal(ar.form.buttons.create, "إنشاء المورد");
  assert.equal(ar.form.buttons.update, "تحديث المورد");
  assert.match(read(CREATE_FORM), /createSupplier/);
  assert.match(read(CREATE_FORM), /displayName|phone/);
  assert.match(read(EDIT_FORM), /updateSupplier/);
  assert.match(read(EDIT_FORM), /supplier\.id/);
  assert.doesNotMatch(read(CREATE_FORM), /iban|bank_account|bankName/i);
  assert.doesNotMatch(read(EDIT_FORM), /iban|bank_account|bankName/i);
});

test("9-11. Rate cards read-only; costing permission gate; no cost leak to unauthorized", () => {
  assert.match(read(LIST_CLIENT), /canViewCosting/);
  assert.match(read(LIST_PAGE), /supplier_costing:read/);
  assert.match(read(RATE_CARDS), /getSupplierRateCards/);
  assert.doesNotMatch(read(RATE_CARDS), /createRateCard|updateRateCard|deleteRateCard/);
  assert.match(read(RATE_CARDS), /formatSarAmount|UiDateText|formatUiDate/);
  // Panel only when canViewCosting
  assert.match(read(LIST_CLIENT), /canViewCosting &&/);
});

test("12-14. Blacklist UI localized; no delete/restore; permissions", () => {
  assert.match(read(BLACKLIST), /dictionary\.blacklistTitle|blacklistTitle/);
  assert.doesNotMatch(read(LIST_CLIENT), /deleteSupplier|restoreSupplier/);
  assert.doesNotMatch(read(ACTIONS), /hardDelete|restoreSupplier/);
  assert.match(read(PERMISSIONS), /suppliers:read|suppliers:write/);
  assert.match(read(LIST_PAGE), /getCurrentSessionEffectiveLocale/);
  assert.match(read(CREATE_PAGE), /requirePermission\("suppliers:write"\)/);
  assert.match(read(EDIT_PAGE), /requirePermission\("suppliers:write"\)/);
});

test("15-17. Formatting, bidi, stored data preserved", () => {
  assert.match(read(LIST_CLIENT), /isolateBidiText/);
  assert.match(read(LIST_CLIENT), /formatUiNumber|formatUiDate|UiDateText/);
  assert.match(read(LIST_CLIENT), /dir="auto"/);
  assert.match(read(LIST_CLIENT), /supplier\.name|supplier\.contactName/);
  assert.doesNotMatch(read(LIST_CLIENT), /toLocaleString|toLocaleDateString/);
  assert.doesNotMatch(read(RATE_CARDS), /toLocaleString|toLocaleDateString/);
  assert.equal(formatSarAmount("ar", 100), "SAR 100.00");
  assert.doesNotMatch(formatSarAmount("ar", 100), ARABIC_INDIC);
  assert.doesNotMatch(formatUiNumber("ar", 4.5), ARABIC_INDIC);
  assert.doesNotMatch(formatUiDate("ar", "2026-07-10"), ARABIC_INDIC);
  // Unknown free-text category remains as stored
  assert.equal(getSupplierCategoryLabel("ar", "Custom Label"), "Custom Label");
});

test("18-20. Empty/denied distinct; no raw errors; no allocations/bookings rewrite", () => {
  const en = getSuppliersDictionary("en");
  assert.notEqual(en.states.listForbidden, en.states.listLoadError);
  assert.notEqual(en.states.noSuppliers, en.states.noFilteredSuppliers);
  for (const file of [LIST_PAGE, LIST_CLIENT, CREATE_FORM, EDIT_FORM, BLACKLIST, RATE_CARDS]) {
    assert.doesNotMatch(read(file), /\{error\.message\}/);
    assert.doesNotMatch(read(file), /service_role|PGRST|postgres error/i);
  }
  assert.doesNotMatch(read(LIST_CLIENT), /SupplierAllocationsPanel|SupplierBookingsPanel/);
});

test("21. No hardcoded English shells on Suppliers Arabic UI sources", () => {
  const forbidden = [
    "Access Denied",
    "Supplier Network",
    "New Supplier",
    "Blacklist Supplier",
    "Loading rate cards",
    "Create Supplier",
  ];
  for (const file of [LIST_PAGE, LIST_CLIENT, CREATE_PAGE, CREATE_FORM, EDIT_PAGE, EDIT_FORM, BLACKLIST, RATE_CARDS]) {
    const source = read(file);
    const offenders = forbidden.filter(
      (phrase) =>
        source.includes(`"${phrase}"`) ||
        source.includes(`'${phrase}'`) ||
        source.includes(`>${phrase}<`),
    );
    assert.deepEqual(offenders, [], `Hardcoded English in ${file}: ${offenders.join(", ")}`);
  }
});
