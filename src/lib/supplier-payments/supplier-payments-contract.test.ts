import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(new URL("../../../supabase/migrations/20260914112636_w6b_supplier_payments_foundation.sql", import.meta.url), "utf8");
const permissions = readFileSync(new URL("../auth/role-permissions.ts", import.meta.url), "utf8");
const navigation = readFileSync(new URL("../i18n/dictionaries/navigation.ts", import.meta.url), "utf8");
const sidebar = readFileSync(new URL("../../components/layout/Sidebar.tsx", import.meta.url), "utf8");
const layout = readFileSync(new URL("../../app/(dashboard)/layout.tsx", import.meta.url), "utf8");
const actions = readFileSync(new URL("./actions.ts", import.meta.url), "utf8");
const queries = readFileSync(new URL("./queries.ts", import.meta.url), "utf8");
const listClient = readFileSync(new URL("../../app/(dashboard)/supplier-payments/SupplierPaymentsClient.tsx", import.meta.url), "utf8");
const formClient = readFileSync(new URL("../../app/(dashboard)/supplier-payments/SupplierPaymentForm.tsx", import.meta.url), "utf8");
const detailClient = readFileSync(new URL("../../app/(dashboard)/supplier-payments/SupplierPaymentDetailClient.tsx", import.meta.url), "utf8");
const billDetail = readFileSync(new URL("../../app/(dashboard)/supplier-bills/SupplierBillDetailClient.tsx", import.meta.url), "utf8");
const storage = readFileSync(new URL("../documents/storage.ts", import.meta.url), "utf8");
const dictionary = readFileSync(new URL("../i18n/dictionaries/supplier-payments.ts", import.meta.url), "utf8");

function body(name: string): string {
  const start = migration.indexOf(`CREATE OR REPLACE FUNCTION public.${name}`);
  assert.notEqual(start, -1, `${name} must be declared`);
  const end = migration.indexOf("$$;", start);
  assert.notEqual(end, -1, `${name} body must be complete`);
  return migration.slice(start, end + 3).replace(/--.*$/gm, "").replace(/\s+/g, " ");
}

test("W6B uses a separate normalized payment, evidence, and reversal model", () => {
  assert.match(migration, /CREATE TABLE public\.supplier_payments/);
  assert.match(migration, /CREATE TABLE public\.supplier_payment_documents/);
  assert.match(migration, /CREATE TABLE public\.supplier_payment_reversals/);
  assert.match(migration, /CREATE OR REPLACE VIEW public\.supplier_bill_payment_balances/);
  assert.match(migration, /supplier_bill_id uuid NOT NULL REFERENCES public\.supplier_bills/);
  assert.match(migration, /record_request_id uuid NOT NULL UNIQUE/);
  assert.match(migration, /reversal_request_id uuid NOT NULL UNIQUE/);
  assert.match(migration, /method IN \('bank_transfer', 'cash', 'cheque'\)/);
  assert.match(migration, /bank_name_snapshot/);
  assert.match(migration, /bank_account_name_snapshot/);
  assert.match(migration, /iban_snapshot/);
  assert.doesNotMatch(migration, /record_invoice_payment/);
  assert.doesNotMatch(migration, /CREATE TABLE public\.payments/);
});

test("W6B mutation boundaries are service-role-only and fail closed", () => {
  for (const name of ["record_supplier_payment(", "reverse_supplier_payment("]) {
    const functionBody = body(name);
    assert.match(functionBody, /SECURITY DEFINER/);
    assert.match(functionBody, /SET search_path = pg_catalog, public/);
    assert.match(functionBody, /p_actor_role/);
    assert.match(functionBody, /app_users u/);
    assert.match(functionBody, /u\.is_active = true AND u\.role = p_actor_role/);
  }
  assert.match(migration, /REVOKE ALL ON FUNCTION public\.record_supplier_payment/);
  assert.match(migration, /GRANT EXECUTE ON FUNCTION public\.record_supplier_payment[\s\S]*TO service_role/);
  assert.match(migration, /REVOKE ALL ON FUNCTION public\.reverse_supplier_payment/);
  assert.match(migration, /GRANT EXECUTE ON FUNCTION public\.reverse_supplier_payment[\s\S]*TO service_role/);
  assert.match(migration, /ALTER TABLE public\.supplier_payments ENABLE ROW LEVEL SECURITY/);
  assert.match(migration, /REVOKE ALL ON TABLE public\.supplier_payments/);
});

test("recording enforces approved-bill, evidence, stored-bank, and concurrency ceilings", () => {
  const record = body("record_supplier_payment(");
  for (const code of [
    "supplier_payment_bill_not_approved",
    "supplier_payment_evidence_required",
    "supplier_payment_bank_details_required",
    "supplier_payment_exceeds_outstanding",
    "supplier_payment_supplier_not_found",
  ]) assert.match(record, new RegExp(code));
  assert.match(record, /d\.document_type = 'supplier_payment_evidence'/);
  assert.match(record, /l\.link_purpose = 'supplier_payment'/);
  assert.match(record, /s\.iban/);
  assert.match(record, /bank_name_snapshot/);
  assert.match(record, /p_amount > v_outstanding/);
  assert.match(record, /LEFT JOIN public\.supplier_payment_reversals/);
  assert.match(record, /FILTER \(WHERE r\.id IS NULL\)/);
  assert.match(record, /FOR UPDATE/);
  assert.match(record, /generate_document_number\('supplier_payment'\)/);
  assert.match(migration, /supplier_payment_recorded/);
});

test("replay, conflict, reversal, and immutable-history contracts are explicit", () => {
  const record = body("record_supplier_payment(");
  const reverse = body("reverse_supplier_payment(");
  assert.match(record, /w6b:supplier_payment_record/);
  assert.match(record, /supplier_payment_request_conflict/);
  assert.match(record, /record_request_id = p_request_id/);
  assert.match(record, /supplier_payment_documents/);
  assert.match(reverse, /w6b:supplier_payment_reverse/);
  assert.match(reverse, /supplier_payment_request_conflict/);
  assert.match(reverse, /supplier_payment_already_reversed/);
  assert.match(reverse, /supplier_payment_reversed/);
  assert.match(reverse, /INSERT INTO public\.supplier_payment_reversals/);
  assert.match(migration, /supplier_payments_immutable/);
  assert.match(migration, /supplier_payment_reversals_immutable/);
  assert.match(migration, /supplier_payment_documents_immutable/);
  assert.match(migration, /supplier_payment_immutable/);
  assert.match(migration, /supplier_payment_reversal_immutable/);
  assert.match(migration, /supplier_payment_document_immutable/);
  assert.match(migration, /w6b:supplier_payment_record/);
  assert.match(actions, /existingPaymentForRequest/);
  assert.match(actions, /row\?\.error_code === "supplier_payment_request_conflict"/);
  assert.match(detailClient, /reverseRequestId/);
  assert.match(detailClient, /request_id: reverseRequestId/);
});

test("payable view is derived from approved bills and excludes reversed payments", () => {
  assert.match(migration, /WHERE b\.status = 'approved'/);
  assert.match(migration, /SUM\(p\.amount\) FILTER \(WHERE r\.id IS NULL\)/);
  assert.match(migration, /WHEN .* < b\.total_amount THEN 'partially_paid'/);
  assert.match(migration, /WHEN .* = 0 THEN 'unpaid'/);
  assert.match(migration, /security_invoker = true/);
  assert.match(queries, /getSupplierBillPaymentSummary/);
  assert.match(queries, /getSupplierBillPaymentHistory/);
  assert.match(queries, /supplier_bill_payment_balances/);
  assert.match(queries, /supplier_payment_reversals/);
});

test("permissions and navigation keep Supplier Payments distinct from customer payments", () => {
  assert.match(permissions, /SUPPLIER_PAYMENT_PERMISSIONS/);
  assert.match(permissions, /supplier_payments:read/);
  assert.match(permissions, /supplier_payments:record/);
  assert.match(permissions, /supplier_payments:reverse/);
  assert.match(permissions, /SUPPLIER_PAYMENT_PERMISSIONS\.read,[\s\S]*SUPPLIER_PAYMENT_PERMISSIONS\.record,[\s\S]*SUPPLIER_PAYMENT_PERMISSIONS\.reverse/);
  assert.match(permissions, /manager[\s\S]*SUPPLIER_PAYMENT_PERMISSIONS\.read/);
  assert.match(permissions, /accountant[\s\S]*SUPPLIER_PAYMENT_PERMISSIONS\.record/);
  assert.match(navigation, /supplierPayments: string/);
  assert.match(navigation, /supplierPayments: "Supplier Payments"/);
  assert.match(navigation, /supplierPayments: "مدفوعات الموردين"/);
  assert.match(sidebar, /supplier-payments/);
  assert.match(sidebar, /canReadSupplierPayments/);
  assert.match(layout, /SUPPLIER_PAYMENT_PERMISSIONS\.read/);
  assert.doesNotMatch(actions, /payments:write|record_invoice_payment/);
});

test("Supplier Payments presentation is bilingual, responsive, and bidi-safe", () => {
  assert.match(listClient, /table-fixed/);
  assert.match(listClient, /<colgroup>/);
  assert.match(listClient, /supplier-payments-mobile-cards/);
  assert.match(listClient, /<bdi dir="ltr">\{payment\.payment_number\}<\/bdi>/);
  assert.match(listClient, /<bdi dir="auto">\{payment\.supplier_name\}<\/bdi>/);
  assert.match(listClient, /<UiDateText locale=\{locale\} value=\{payment\.payment_date\} \/>/);
  assert.doesNotMatch(listClient, /<(?:td|th)\b[^>]*\bdir\s*=/);
  assert.match(formClient, /name="document"/);
  assert.match(formClient, /name="method"/);
  assert.match(formClient, /name="reference"/);
  assert.match(formClient, /crypto\.randomUUID/);
  assert.match(formClient, /capture|const form = event\.currentTarget/);
  assert.match(detailClient, /dictionary\.methods\[payment\.method\]/);
  assert.match(detailClient, /UiDateTimeText/);
  assert.match(detailClient, /maskedIban/);
  assert.match(dictionary, /Supplier Payments/);
  assert.match(dictionary, /مدفوعات الموردين/);
  assert.match(dictionary, /Bank transfer/);
  assert.match(dictionary, /تحويل بنكي/);
  assert.match(storage, /uploadPrivateSupplierPaymentEvidence/);
  assert.match(storage, /createPrivateSupplierPaymentEvidenceUrl/);
});

test("approved Supplier Bill shows payment summary/history and one clear payment entry action", () => {
  assert.match(billDetail, /bill\.paymentSummary/);
  assert.match(billDetail, /bill\.paymentHistory/);
  assert.match(billDetail, /supplier-payments\/new\?billId=/);
  assert.match(billDetail, /dictionary\.actions\.recordPayment/);
  assert.doesNotMatch(billDetail, /Create Payable|Finance Review/i);
});
