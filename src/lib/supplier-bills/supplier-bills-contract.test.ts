import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(
  new URL("../../../supabase/migrations/20260913120000_w6a_supplier_bills_foundation.sql", import.meta.url),
  "utf8",
);
const correctiveMigration = readFileSync(
  new URL("../../../supabase/migrations/20260914051846_w6a_supplier_bill_admin_self_approval.sql", import.meta.url),
  "utf8",
);
const sidebar = readFileSync(new URL("../../components/layout/Sidebar.tsx", import.meta.url), "utf8");
const permissions = readFileSync(new URL("../auth/role-permissions.ts", import.meta.url), "utf8");
const storage = readFileSync(new URL("../documents/storage.ts", import.meta.url), "utf8");
const listQueries = readFileSync(new URL("./queries.ts", import.meta.url), "utf8");
const listPage = readFileSync(new URL("../../app/(dashboard)/supplier-bills/page.tsx", import.meta.url), "utf8");
const listClient = readFileSync(new URL("../../app/(dashboard)/supplier-bills/SupplierBillsClient.tsx", import.meta.url), "utf8");
const detailClient = readFileSync(new URL("../../app/(dashboard)/supplier-bills/SupplierBillDetailClient.tsx", import.meta.url), "utf8");
const formClient = readFileSync(new URL("../../app/(dashboard)/supplier-bills/SupplierBillForm.tsx", import.meta.url), "utf8");
const newPage = readFileSync(new URL("../../app/(dashboard)/supplier-bills/new/page.tsx", import.meta.url), "utf8");
const dateText = readFileSync(new URL("../../components/i18n/UiDateText.tsx", import.meta.url), "utf8");
const dictionary = readFileSync(new URL("../i18n/dictionaries/supplier-bills.ts", import.meta.url), "utf8");

function functionBody(source: string, name: string): string {
  const start = source.indexOf(`CREATE OR REPLACE FUNCTION public.${name}`);
  assert.notEqual(start, -1, `${name} must be declared`);
  const end = source.indexOf("$$;", start);
  assert.notEqual(end, -1, `${name} body must be complete`);
  return source.slice(start, end + 3).replace(/--.*$/gm, "").replace(/\s+/g, " ").trim();
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
    const body = functionBody(migration, name);
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
  const approval = functionBody(correctiveMigration, "approve_supplier_bill(");
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
  assert.match(approval, /v_recorded_by = v_actor_uuid AND p_actor_role <> 'admin'/);
  assert.doesNotMatch(approval, /IF v_recorded_by = v_actor_uuid THEN/);
  assert.equal(
    approval,
    functionBody(migration, "approve_supplier_bill(").replace(
      "IF v_recorded_by = v_actor_uuid THEN",
      "IF v_recorded_by = v_actor_uuid AND p_actor_role <> 'admin' THEN",
    ),
  );
  assert.match(migration, /supplier_bills b[\s\S]*lower\(btrim\(b\.invoice_number\)\)/);
  assert.match(migration, /supplier_bill_duplicate_invoice/);
});

test("W6A request replay, conflict, and approved immutability contracts are retained", () => {
  for (const name of ["create_supplier_bill(", "update_supplier_bill(", "attach_supplier_bill_documents(", "approve_supplier_bill("]) {
    assert.match(functionBody(migration, name), /pg_advisory_xact_lock/);
    assert.match(functionBody(migration, name), /request_id/);
  }
  assert.match(functionBody(correctiveMigration, "approve_supplier_bill("), /pg_advisory_xact_lock/);
  assert.match(migration, /supplier_bill_request_conflict/);
  assert.match(migration, /supplier_bill_document_request_conflict/);
  assert.match(migration, /supplier_bill_approval_request_conflict/);
  assert.match(migration, /IF OLD\.status = 'approved'/);
});

test("W6A field failures return stable user-facing validation codes before governed writes", () => {
  for (const name of ["create_supplier_bill(", "update_supplier_bill("]) {
    const body = functionBody(correctiveMigration, name);
    assert.match(body, /supplier_bill_fields_invalid/);
    assert.match(body, /supplier_bill_total_mismatch/);
    assert.match(body, /supplier_bill_due_date_invalid/);
    assert.match(body, /SECURITY DEFINER/);
    assert.match(body, /SET search_path = pg_catalog, public/);
  }
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
  assert.match(detailClient, /useState\(false\)/);
  assert.match(detailClient, /aria-expanded=\{isEditOpen\}/);
  assert.match(detailClient, /dictionary\.actions\.editBill/);
  assert.doesNotMatch(detailClient, /value=\{bill\.commitment_id\}/);
  assert.doesNotMatch(detailClient, /value=\{bill\.service_receipt_id\}/);
  assert.match(detailClient, /dictionary\.acceptanceStatuses\[bill\.receipt_acceptance_status\]/);
  assert.match(detailClient, /<bdi dir="ltr">\{bill\.service_number\}<\/bdi>/);
  assert.doesNotMatch(detailClient, /Finance Review|finance review/i);
  assert.match(dictionary, /Supplier Bills/);
  assert.match(dictionary, /فواتير الموردين/);
  assert.match(dictionary, /ACCEPTED_WITH_CONDITIONS: "Accepted with conditions"/);
  assert.match(dictionary, /ACCEPTED_WITH_CONDITIONS: "مقبول بشروط"/);
  for (const code of ["supplier_bill_total_mismatch", "supplier_bill_due_date_invalid", "supplier_bill_fields_invalid", "supplier_bill_duplicate_invoice", "supplier_bill_invoice_evidence_required", "supplier_bill_commitment_ceiling_exceeded", "supplier_bill_received_value_ceiling_exceeded", "supplier_bill_currency_mismatch", "supplier_bill_receipt_not_accepted", "supplier_bill_commitment_not_eligible", "supplier_bill_self_approval_forbidden", "supplier_bill_approval_permission_denied", "supplier_bill_approval_request_conflict", "supplier_bill_unavailable", "supplier_bill_not_found", "supplier_bill_already_approved"]) {
    assert.match(dictionary, new RegExp(code));
  }
  assert.match(dictionary, /supplier_bill_self_approval_forbidden/);
});

test("Supplier Bills list uses shared server pagination and keeps URL page state", () => {
  const start = listQueries.indexOf("export async function getSupplierBillsList");
  const end = listQueries.indexOf("export async function getSupplierBillById", start);
  assert.ok(start >= 0 && end > start, "the paginated Supplier Bills query must remain identifiable");
  const listQuery = listQueries.slice(start, end);
  const countStart = listQueries.indexOf("async function getSupplierBillsCount");
  const countEnd = listQueries.indexOf("function getSupplierBillsPagination", countStart);
  const pageRowsStart = listQueries.indexOf("async function getSupplierBillListRows");
  const pageRowsEnd = listQueries.indexOf("function mapSupplierBillListItem", pageRowsStart);
  const countQuery = listQueries.slice(countStart, countEnd);
  const pageRowsQuery = listQueries.slice(pageRowsStart, pageRowsEnd);
  assert.match(listQuery, /getSupplierBillsCount\(supabase\)/);
  assert.match(listQuery, /getSupplierBillListRows\(supabase, pagination\)/);
  assert.match(countQuery, /\.select\("id", \{ count: "exact", head: true \}\)/);
  assert.match(pageRowsQuery, /\.select\(SUPPLIER_BILL_LIST_SELECT\)/);
  assert.match(pageRowsQuery, /\.range\(rangeStart, rangeStart \+ pagination\.pageSize - 1\)/);
  assert.doesNotMatch(pageRowsQuery, /\.select\("\*"\)/);
  assert.match(listPage, /searchParams: Promise<SupplierBillsSearchParams>/);
  assert.match(listPage, /page: normalizeListPage\(params\.page\)/);
  assert.match(listPage, /pageSize: normalizeListPageSize\(params\.pageSize\)/);
  assert.match(listClient, /<PaginationFooter/);
  assert.match(listClient, /paginationMode="bounded"/);
  assert.match(listClient, /supplierBillsHref\(page, pagination\.pageSize\)/);
  assert.match(listClient, /supplierBillsHref\(1, pageSize\)/);
  assert.match(listClient, /data-testid="supplier-bills-desktop-table"/);
  assert.match(listClient, /data-testid="supplier-bills-mobile-cards"/);
});

test("Supplier Bills keep RTL table alignment and isolate atomic values at the leaf", () => {
  assert.doesNotMatch(listClient, /<(?:td|th)\b[^>]*\bdir\s*=/);
  assert.doesNotMatch(listClient, /<PendingLink\b[^>]*\bdir\s*=/);
  assert.match(listClient, /<th className="px-4 py-3 text-start">\{dictionary\.columns\.bill\}<\/th>/);
  assert.match(listClient, /<td className="px-4 py-4 align-top text-start">/);
  assert.match(listClient, /<td className="px-4 py-4 text-end align-top"><bdi dir="ltr" className="font-semibold tabular-nums">\{formatSarAmount/);
  assert.match(listClient, /<bdi dir="ltr">\{bill\.bill_number\}<\/bdi>/);
  assert.match(listClient, /<bdi dir="auto">\{bill\.supplier_name\}<\/bdi>/);
  assert.match(listClient, /<bdi dir="ltr">\{bill\.service_number\}<\/bdi>/);
  assert.match(listClient, /<bdi dir="auto">\{bill\.event_name \|\| bill\.service_title\}<\/bdi>/);
  assert.doesNotMatch(detailClient, /<p\b[^>]*\bdir\s*=\s*"auto"/);
  assert.doesNotMatch(detailClient, /<span\b[^>]*\bdir\s*=\s*"auto"/);
  assert.doesNotMatch(detailClient, /<dd\b[^>]*\bdir\s*=/);
  assert.match(detailClient, /<h1 className="[^"]+"><bdi dir="ltr">\{bill\.bill_number\}<\/bdi><\/h1>/);
  assert.match(detailClient, /<bdi dir="ltr">\{bill\.service_number\}<\/bdi>/);
  assert.match(detailClient, /<bdi dir="auto">\{bill\.event_name \|\| bill\.service_title\}<\/bdi>/);
  assert.match(detailClient, /isRtl \? <ArrowRight[^>]+> : <ArrowLeft/);
  assert.match(newPage, /isRtl \? <ArrowRight[^>]+> : <ArrowLeft/);
  assert.match(newPage, /inline-flex items-center gap-2/);
});

test("Supplier Bills use structured dates, stable context rows, and text-safe native options", () => {
  assert.match(dateText, /resolveUiDateDisplay/);
  assert.match(dateText, /resolveUiDateTimeDisplay/);
  assert.match(dateText, /<span\s+dir="rtl"/);
  assert.match(listClient, /<UiDateText locale=\{locale\} value=\{bill\.invoice_date\} \/>/);
  assert.match(detailClient, /<UiDateText locale=\{locale\} value=\{bill\.invoice_date\} \/>/);
  assert.match(detailClient, /<UiDateText locale=\{locale\} value=\{bill\.due_date\} \/>/);
  assert.match(detailClient, /<UiDateTimeText locale=\{locale\} value=\{bill\.recorded_at\} \/>/);
  assert.match(detailClient, /<ContextRow label=\{dictionary\.fields\.performanceDate\}><UiDateText/);
  assert.match(detailClient, /function ContextRow/);
  assert.doesNotMatch(detailClient, /bill\.commitment_currency/);
  assert.doesNotMatch(detailClient, /SAR\s+SAR/);
  assert.doesNotMatch(detailClient, /\b(?:ACCEPTED|ACCEPTED_WITH_CONDITIONS|REJECTED|PENDING)\b/);
  assert.doesNotMatch(detailClient, /commitment_id|service_receipt_id/);

  const optionBlocks = formClient.match(/<option\b[^>]*>[\s\S]*?<\/option>/g) ?? [];
  assert.ok(optionBlocks.length >= 4, "supplier form should keep its native option labels");
  for (const optionBlock of optionBlocks) {
    assert.doesNotMatch(optionBlock, /<bdi|<span/);
  }
  assert.match(formClient, /isolateBidiText/);
  assert.match(formClient, /isolateLtrText/);
});

test("supplier invoice storage reuses the private business-document pipeline with AP permission", () => {
  assert.match(storage, /uploadPrivateSupplierBillInvoice/);
  assert.match(storage, /SUPPLIER_BILL_PERMISSIONS\.record/);
  assert.match(storage, /createPrivateSupplierBillInvoiceUrl/);
  assert.match(storage, /SUPPLIER_BILL_PERMISSIONS\.read/);
});
