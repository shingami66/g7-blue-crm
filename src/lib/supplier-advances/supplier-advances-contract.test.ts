import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const root = new URL("../../../", import.meta.url);
const read = (path: string) => readFileSync(new URL(path, root), "utf8");
const migration = read("supabase/migrations/20260915070149_w6c_supplier_advances_foundation.sql");
const permissions = read("src/lib/auth/role-permissions.ts");
const layout = read("src/app/(dashboard)/layout.tsx");
const sidebar = read("src/components/layout/Sidebar.tsx");
const navDictionary = read("src/lib/i18n/dictionaries/navigation.ts");
const dictionary = read("src/lib/i18n/dictionaries/supplier-advances.ts");
const actions = read("src/lib/supplier-advances/actions.ts");
const queries = read("src/lib/supplier-advances/queries.ts");
const list = read("src/app/(dashboard)/supplier-advances/SupplierAdvancesClient.tsx");
const authorizationForm = read("src/app/(dashboard)/supplier-advances/SupplierAdvanceAuthorizationForm.tsx");
const detail = read("src/app/(dashboard)/supplier-advances/[id]/SupplierAdvanceDetailClient.tsx");
const billQueries = read("src/lib/supplier-bills/queries.ts");
const billDetail = read("src/app/(dashboard)/supplier-bills/SupplierBillDetailClient.tsx");
const supplierPaymentQueries = read("src/lib/supplier-payments/queries.ts");
const paymentTypes = read("src/lib/supplier-payments/types.ts");
const advanceFormatting = read("src/lib/supplier-advances/formatting.ts");
const supplierAdvanceEventTables = [
  "supplier_advances",
  "supplier_advance_payments",
  "supplier_advance_payment_reversals",
  "supplier_advance_refunds",
  "supplier_advance_allocations",
  "supplier_advance_allocation_reversals",
  "supplier_advance_authorization_documents",
  "supplier_advance_payment_documents",
  "supplier_advance_refund_documents",
];

function functionBody(name: string): string {
  const start = migration.indexOf(`CREATE OR REPLACE FUNCTION public.${name}`);
  assert.notEqual(start, -1, `${name} must be defined`);
  const end = migration.indexOf("$$;", start);
  assert.notEqual(end, -1, `${name} must have a closed body`);
  return migration.slice(start, end + 3).replace(/--.*$/gm, "").replace(/\s+/g, " ");
}

test("W6C is a distinct immutable event model, separate from Supplier Bills and Supplier Payments", () => {
  for (const table of supplierAdvanceEventTables) assert.match(migration, new RegExp(`CREATE TABLE public\\.${table}`));
  assert.match(migration, /CREATE VIEW public\.supplier_advance_balances WITH \(security_invoker = true\)/);
  assert.match(migration, /CREATE VIEW public\.supplier_advance_commitment_balances WITH \(security_invoker = true\)/);
  assert.match(migration, /supplier_advances_commitment_lineage_fkey/);
  assert.match(migration, /FOREIGN KEY \(commitment_id, service_id, supplier_id\)/);
  assert.match(migration, /supplier_advance_event_immutable/);
  assert.doesNotMatch(migration, /CREATE TABLE public\.payments\s*\(/);
  assert.doesNotMatch(migration, /CREATE TABLE public\.supplier_credits\s*\(/);
  assert.doesNotMatch(migration, /CREATE TABLE public\.general_ledger\s*\(/i);
});

test("only Admin/Manager authorize; Admin/Accountant pay, allocate, refund, reverse, and correct", () => {
  assert.match(permissions, /SUPPLIER_ADVANCE_PERMISSIONS\s*=\s*\{/);
  assert.match(permissions, /read:\s*"supplier_advances:read"/);
  assert.match(permissions, /authorize:\s*"supplier_advances:authorize"/);
  const manager = permissions.match(/manager:\s*\[([\s\S]*?)\n\s*\],\s*sales:/)?.[1] ?? "";
  const accountant = permissions.match(/accountant:\s*\[([\s\S]*?)\n\s*\],\s*viewer:/)?.[1] ?? "";
  const sales = permissions.match(/sales:\s*\[([\s\S]*?)\n\s*\],\s*operations:/)?.[1] ?? "";
  const operations = permissions.match(/operations:\s*\[([\s\S]*?)\n\s*\],\s*accountant:/)?.[1] ?? "";
  const viewer = permissions.match(/viewer:\s*\[([\s\S]*?)\n\s*\],?\s*\n\}/)?.[1] ?? "";
  assert.match(manager, /SUPPLIER_ADVANCE_PERMISSIONS\.read/);
  assert.match(manager, /SUPPLIER_ADVANCE_PERMISSIONS\.authorize/);
  for (const permission of ["pay", "allocate", "refund", "reverse", "correct"]) {
    assert.match(accountant, new RegExp(`SUPPLIER_ADVANCE_PERMISSIONS\\.${permission}`));
    assert.doesNotMatch(manager, new RegExp(`SUPPLIER_ADVANCE_PERMISSIONS\\.${permission}`));
  }
  for (const role of [sales, operations, viewer]) assert.doesNotMatch(role, /SUPPLIER_ADVANCE_PERMISSIONS/);
  assert.match(layout, /checkPermission\(SUPPLIER_ADVANCE_PERMISSIONS\.read\)/);
  assert.match(sidebar, /canReadSupplierAdvances/);
  assert.match(sidebar, /href: "\/supplier-advances"/);
  assert.match(navDictionary, /supplierAdvances: "Supplier Advances"/);
  assert.match(navDictionary, /supplierAdvances: "سلف الموردين"/);
});

test("all six mutation RPCs pin SECURITY DEFINER, validate active actors, and grant service_role only", () => {
  const functions = [
    ["authorize_supplier_advance(", "authorize_supplier_advance"],
    ["record_supplier_advance_payment(", "record_supplier_advance_payment"],
    ["allocate_supplier_advance(", "allocate_supplier_advance"],
    ["refund_supplier_advance(", "refund_supplier_advance"],
    ["reverse_supplier_advance_payment(", "reverse_supplier_advance_payment"],
    ["reverse_supplier_advance_allocation(", "reverse_supplier_advance_allocation"],
  ] as const;
  for (const [name, grantName] of functions) {
    const body = functionBody(name);
    assert.match(body, /SECURITY DEFINER SET search_path = pg_catalog, public/);
    assert.match(body, /app_users u/);
    assert.match(body, /u\.is_active\s*=\s*true AND u\.role\s*=\s*p_actor_role/);
    assert.match(migration, new RegExp(`REVOKE ALL ON FUNCTION public\\.${grantName}`));
    assert.match(migration, new RegExp(`GRANT EXECUTE ON FUNCTION public\\.${grantName}[\\s\\S]*?TO service_role`));
  }
  assert.match(migration, /ALTER TABLE public\.supplier_advances ENABLE ROW LEVEL SECURITY/);
  const serviceRoleRevocation = migration.match(/REVOKE ALL ON TABLE ([\s\S]*?) FROM PUBLIC, anon, authenticated, service_role;/)?.[1] ?? "";
  const serviceRoleReadGrant = migration.match(/GRANT SELECT ON TABLE ([\s\S]*?) TO service_role;/)?.[1] ?? "";
  const serviceRoleTableGrants = migration
    .split(";")
    .map((statement) => statement.trim())
    .filter((statement) => /^GRANT\b/i.test(statement) && /\bON TABLE\b/i.test(statement) && /\bTO service_role\b/i.test(statement));
  for (const table of supplierAdvanceEventTables) {
    assert.ok(serviceRoleRevocation.includes(`public.${table}`), `${table} direct privileges must be revoked`);
    assert.ok(serviceRoleReadGrant.includes(`public.${table}`), `${table} read access must remain available`);
  }
  for (const grant of serviceRoleTableGrants) {
    assert.match(grant, /^GRANT\s+SELECT\s+ON TABLE/i, "service_role table grants must be read-only");
  }
});

test("authorization serializes commitment capacity and does not require a bill or receipt", () => {
  const body = functionBody("authorize_supplier_advance(");
  assert.match(body, /FOR UPDATE OF c/);
  assert.match(body, /w6c:authorize:/);
  assert.match(body, /commitment_status|status <> 'open'/);
  assert.match(body, /supplier_advance_ceiling_exceeded/);
  assert.match(body, /v_commitment\.open_commitment_amount - COALESCE\(SUM/);
  assert.match(body, /a\.authorized_amount - COALESCE\(x\.allocated_amount/);
  assert.match(body, /supplier_advance_authorization_evidence/);
  assert.match(body, /v_commitment\.currency/);
  assert.doesNotMatch(body, /currency <> 'SAR'/);
  assert.doesNotMatch(migration, /currency char\(3\) NOT NULL DEFAULT 'SAR' CHECK \(currency = 'SAR'\)/);
  assert.match(advanceFormatting, /formatSupplierAdvanceAmount/);
  assert.match(advanceFormatting, /code === "SAR"/);
  assert.match(advanceFormatting, /return `\$\{code\} \$\{amount\}`/);
  assert.doesNotMatch(body, /service_receipts|supplier_bills/);
  assert.match(migration, /approved_commitment_supplier_advance_reserved/);
  assert.match(migration, /approved_commitment_supplier_advance_amendment_guard/);
  assert.match(migration, /approved_commitment_supplier_advance_status_guard/);
});

test("partial payments are capped, evidence is hash-bound, and bank data is snapshotted from supplier", () => {
  const body = functionBody("record_supplier_advance_payment(");
  assert.match(body, /supplier_advance_payment_exceeds_authorized/);
  assert.match(body, /v_advance\.authorized_amount\s*-\s*v_paid/);
  assert.match(body, /supplier_advance_payment_evidence/);
  assert.match(body, /content_sha256=p_evidence_sha256/);
  assert.match(body, /FROM public\.suppliers s[\s\S]*FOR UPDATE/);
  assert.match(body, /CASE WHEN v_method='bank_transfer' THEN v_supplier\.iban END/);
  assert.match(body, /bank_name_snapshot/);
  assert.match(body, /bank_account_name_snapshot/);
  assert.match(body, /iban_snapshot/);
  assert.match(body, /w6c:payment:/);
  assert.match(actions, /createHash\("sha256"\)/);
  assert.match(authorizationForm, /name="document"/);
  assert.match(detail, /dictionary\.forms\.bankDetailsNotice/);
  assert.doesNotMatch(detail, /name="iban"|name="bank_account|name="bank_name/);
});

test("allocation requires exact lineage and serializes against Supplier Payment outstanding", () => {
  const body = functionBody("allocate_supplier_advance(");
  assert.match(body, /FOR UPDATE/);
  assert.match(body, /v_advance\.commitment_id IS DISTINCT FROM v_bill\.commitment_id/);
  assert.match(body, /v_advance\.service_id IS DISTINCT FROM v_bill\.service_id/);
  assert.match(body, /v_advance\.supplier_id IS DISTINCT FROM v_bill\.supplier_id/);
  assert.match(body, /v_advance\.currency IS DISTINCT FROM v_bill\.currency/);
  assert.match(body, /supplier_advance_allocation_exceeds_unallocated/);
  assert.match(body, /supplier_advance_allocation_exceeds_outstanding/);
  assert.match(body, /supplier_bill_payment_balances/);
  assert.match(migration, /CREATE TRIGGER supplier_payment_advance_outstanding_guard/);
  assert.match(functionBody("guard_supplier_payment_advance_outstanding()"), /FOR UPDATE/);
  assert.match(functionBody("guard_supplier_payment_advance_outstanding()"), /supplier_payment_exceeds_outstanding/);
});

test("refunds and payment reversals are append-only and bounded by currently unallocated cash", () => {
  const refund = functionBody("refund_supplier_advance(");
  const reversal = functionBody("reverse_supplier_advance_payment(");
  assert.match(refund, /supplier_advance_refund_evidence/);
  assert.match(refund, /supplier_advance_refund_exceeds_unallocated/);
  assert.match(refund, /p_amount>v_paid-v_allocated-v_refunded/);
  assert.match(refund, /supplier_advance_refund_recorded/);
  assert.match(reversal, /supplier_advance_payment_reverse_unavailable/);
  assert.match(reversal, /remaining_unallocated_amount/);
  assert.match(reversal, /supplier_advance_payment_already_reversed/);
  assert.match(reversal, /supplier_advance_payment_reversed/);
  assert.match(migration, /supplier_advance_payment_reversals\(supplier_advance_payment_id,reason,reversed_by,reversed_at,reversal_request_id\)/);
});

test("bill balance separates ordinary payments from advance allocation and avoids payable duplication", () => {
  assert.match(migration, /CREATE OR REPLACE VIEW public\.supplier_bill_payment_balances/);
  assert.match(migration, /b\.total_amount AS payable_amount/);
  assert.match(migration, /AS paid_amount/);
  assert.match(migration, /AS advance_allocated_amount/);
  assert.match(migration, /b\.total_amount - COALESCE\(p\.paid_amount, 0\) - COALESCE\(a\.advance_allocated_amount, 0\)/);
  assert.match(paymentTypes, /advance_allocated_amount: number/);
  assert.match(supplierPaymentQueries, /advance_allocated_amount: number\(row\.advance_allocated_amount\)/);
  assert.match(billQueries, /getSupplierBillAdvanceAllocationHistory/);
  assert.match(billQueries, /advanceAllocationHistory/);
  assert.match(billDetail, /advanceAllocationHistory/);
  assert.match(billDetail, /paymentSummary\.advance_allocated_amount/);
});

test("Supplier Advances UI is bilingual, responsive, localized, and bidi-isolated", () => {
  assert.match(dictionary, /title: "Supplier Advances"/);
  assert.match(dictionary, /title: "سلف الموردين"/);
  assert.match(dictionary, /commitment no longer has enough open capacity/i);
  assert.match(dictionary, /لم تعد سعة الالتزام المفتوحة كافية/);
  assert.match(list, /table-fixed/);
  assert.match(list, /supplier-advances-mobile-cards/);
  assert.match(list, /<bdi dir="ltr">\{advance\.advance_number\}<\/bdi>/);
  assert.match(list, /<bdi dir="auto">\{advance\.supplier_name\}<\/bdi>/);
  assert.match(authorizationForm, /isolateBidiText/);
  assert.match(authorizationForm, /<option key=\{commitment\.id\} value=\{commitment\.id\}>\{label\}<\/option>/);
  assert.match(detail, /<UiDateTimeText locale=\{locale\} value=\{advance\.authorized_at\} \/>/);
  assert.match(detail, /<UiDateTimeText locale=\{locale\} value=\{payment\.recorded_at\} \/>/);
  assert.match(detail, /<bdi dir="ltr" className="tabular-nums">/);
  assert.match(detail, /<bdi dir="auto">\{advance\.supplier_name\}<\/bdi>/);
  assert.match(detail, /aria-expanded=\{expanded\}/);
  assert.match(detail, /data-testid="supplier-advance-active-panel"/);
  assert.match(detail, /firstField\.current\?\.focus\(\)/);
  assert.match(queries, /iban_snapshot_masked: maskIban\(text\(row\.iban_snapshot\)\)/);
  assert.doesNotMatch(detail, /payment\.iban_snapshot/);
  assert.doesNotMatch(detail, /commitment_id\}|service_receipt_id\}|\.reversed_by\}|\.allocated_by\}/);
});

test("request IDs are replay-safe and conflicting payloads are rejected without exposing database text", () => {
  for (const prefix of ["w6c:authorize:", "w6c:payment:", "w6c:allocate:", "w6c:refund:", "w6c:payment-reversal:", "w6c:allocation-correction:"]) {
    assert.ok(migration.includes(prefix), `missing request lock ${prefix}`);
  }
  assert.match(migration, /supplier_advance_request_conflict/);
  assert.match(migration, /record_request_id uuid NOT NULL UNIQUE/);
  assert.match(migration, /authorization_request_id uuid NOT NULL UNIQUE/);
  assert.match(migration, /allocation_request_id uuid NOT NULL UNIQUE/);
  assert.match(migration, /correction_request_id uuid NOT NULL UNIQUE/);
  assert.match(actions, /supplier_advance_request_conflict/);
  assert.match(actions, /catch \{[\s\S]*return errorResult\("supplier_advance/);
  assert.doesNotMatch(actions, /error\.message/);
});
