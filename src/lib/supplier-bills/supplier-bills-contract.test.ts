import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(
  new URL("../../../supabase/migrations/20260913120000_w6a_supplier_bills_foundation.sql", import.meta.url),
  "utf8",
);
const sidebar = readFileSync(new URL("../../components/layout/Sidebar.tsx", import.meta.url), "utf8");
const permissions = readFileSync(new URL("../auth/role-permissions.ts", import.meta.url), "utf8");
const storage = readFileSync(new URL("../documents/storage.ts", import.meta.url), "utf8");
const listClient = readFileSync(new URL("../../app/(dashboard)/supplier-bills/SupplierBillsClient.tsx", import.meta.url), "utf8");
const detailClient = readFileSync(new URL("../../app/(dashboard)/supplier-bills/SupplierBillDetailClient.tsx", import.meta.url), "utf8");
const dictionary = readFileSync(new URL("../i18n/dictionaries/supplier-bills.ts", import.meta.url), "utf8");

function functionBody(name: string): string {
  const start = migration.indexOf(`CREATE OR REPLACE FUNCTION public.${name}`);
  assert.notEqual(start, -1, `${name} must be declared`);
  const end = migration.indexOf("CREATE OR REPLACE FUNCTION public.", start + 1);
  return migration.slice(start, end === -1 ? migration.length : end);
}

test("W6A durable model links supplier bills to approved commitment and receipt scope", () => {
  assert.match(migration, /CREATE TABLE public\.supplier_bills/);
  assert.match(migration, /CREATE TABLE public\.supplier_bill_documents/);
  assert.match(migration, /FOREIGN KEY \(commitment_id, service_id, supplier_id\)/);
  assert.match(migration, /FOREIGN KEY \(service_receipt_id, service_id, supplier_id, commitment_id\)/);
  assert.match(migration, /supplier_bills_supplier_invoice_unique_idx/);
  assert.match(migration, /record_request_id uuid NOT NULL UNIQUE/);
  assert.match(migration, /supplier_name_snapshot/);
  assert.match(migration, /supplier_vat_number_snapshot/);
  assert.match(migration, /document_type = 'supplier_invoice'/);
  assert.match(migration, /bucket_id = 'business-evidence'/);
  assert.match(migration, /supplier_bills_approved_immutable/);
  assert.match(migration, /BILL-YYYY-0001/);
});

test("W6A mutation RPCs are service-role-only SECURITY DEFINER operations", () => {
  for (const name of [
    "create_supplier_bill(",
    "update_supplier_bill(",
    "attach_supplier_bill_documents(",
    "approve_supplier_bill(",
  ]) {
    const body = functionBody(name);
    assert.match(body, /SECURITY DEFINER/);
    assert.match(body, /SET search_path = pg_catalog, public/);
  }
  assert.match(migration, /REVOKE ALL ON FUNCTION public\.create_supplier_bill/);
  assert.match(migration, /GRANT EXECUTE ON FUNCTION public\.create_supplier_bill[\s\S]*TO service_role/);
  assert.match(migration, /REVOKE ALL ON TABLE public\.supplier_bills/);
  assert.match(migration, /GRANT ALL ON TABLE public\.supplier_bills TO service_role/);
  assert.match(migration, /ALTER TABLE public\.supplier_bills ENABLE ROW LEVEL SECURITY/);
});

test("W6A approval fails closed on every governed evidence and authority gate", () => {
  const approval = functionBody("approve_supplier_bill(");
  for (const code of [
    "supplier_bill_approval_permission_denied",
    "supplier_bill_self_approval_forbidden",
    "supplier_bill_commitment_not_eligible",
    "supplier_bill_currency_mismatch",
    "supplier_bill_receipt_not_accepted",
    "supplier_bill_invoice_evidence_required",
    "supplier_bill_commitment_ceiling_exceeded",
    "supplier_bill_received_value_ceiling_exceeded",
  ]) {
    assert.match(approval, new RegExp(code));
  }
  assert.match(approval, /r\.acceptance_status/);
  assert.match(approval, /r\.reviewed_at/);
  assert.match(approval, /r\.reviewed_by/);
  assert.match(approval, /v_approved_receipt_billed_amount/);
  assert.match(approval, /b\.service_receipt_id = v_receipt_id/);
  assert.match(approval, /b\.commitment_id = v_commitment_id/);
  assert.match(approval, /v_approved_billed_amount \+ v_total_amount > v_authorized_amount/);
  assert.match(approval, /v_approved_billed_amount \+ v_total_amount > v_accepted_amount/);
  assert.match(migration, /supplier_bills b[\s\S]*lower\(btrim\(b\.invoice_number\)\)/);
  assert.match(migration, /supplier_bill_duplicate_invoice/);
});

test("W6A request replay, conflict, and approved immutability contracts are retained", () => {
  for (const name of ["create_supplier_bill(", "update_supplier_bill(", "attach_supplier_bill_documents(", "approve_supplier_bill("]) {
    assert.match(functionBody(name), /pg_advisory_xact_lock/);
    assert.match(functionBody(name), /request_id/);
  }
  assert.match(migration, /supplier_bill_request_conflict/);
  assert.match(migration, /supplier_bill_document_request_conflict/);
  assert.match(migration, /supplier_bill_approval_request_conflict/);
  assert.match(migration, /IF OLD\.status = 'approved'/);
});

test("W6A exposes a distinct bilingual Supplier Bills workspace with one approval action", () => {
  assert.match(permissions, /SUPPLIER_BILL_PERMISSIONS/);
  assert.match(permissions, /supplier_bills:record/);
  assert.match(permissions, /supplier_bills:approve/);
  assert.match(sidebar, /\/supplier-bills/);
  assert.match(listClient, /table-fixed/);
  assert.match(listClient, /<colgroup>/);
  assert.match(listClient, /supplier-bills-mobile-cards/);
  assert.match(listClient, /<bdi dir="ltr">/);
  assert.match(detailClient, /dictionary\.actions\.approve/);
  assert.doesNotMatch(detailClient, /Finance Review|finance review/i);
  assert.match(dictionary, /Supplier Bills/);
  assert.match(dictionary, /فواتير الموردين/);
  assert.match(dictionary, /supplier_bill_self_approval_forbidden/);
});

test("supplier invoice storage reuses the private business-document pipeline with AP permission", () => {
  assert.match(storage, /uploadPrivateSupplierBillInvoice/);
  assert.match(storage, /SUPPLIER_BILL_PERMISSIONS\.record/);
  assert.match(storage, /createPrivateSupplierBillInvoiceUrl/);
  assert.match(storage, /SUPPLIER_BILL_PERMISSIONS\.read/);
});
