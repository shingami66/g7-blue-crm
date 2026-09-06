import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const REPO_ROOT = join(import.meta.dirname, "../../..");
const migration = readFileSync(join(REPO_ROOT, "supabase/migrations/20260902110000_l1_d07_commitment_receipt.sql"), "utf8");

function executableSql(source: string) {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/--.*$/gm, "");
}

type CorrectionReplayPayload = {
  receiptId: string;
  correctedAcceptanceStatus: string;
  correctedReceivedAmount: number | null;
  correctedConditionsNotes: string | null;
  correctionReason: string;
};

type CorrectionReplayRow = {
  id: string;
  receiptId: string;
  requestId: string;
  correctedAcceptanceStatus: string;
  correctedReceivedAmount: number | null;
};

type CorrectionReplayAudit = {
  entityId: string;
  requestId: string;
  payload: CorrectionReplayPayload;
  correctionId: string;
};

type CorrectionReplayResult = {
  errorCode?: string;
  receiptId: string;
  acceptanceStatus?: string;
  receivedAmount?: number | null;
  idempotentReplay: boolean;
};

function simulateCorrectionReplay(
  corrections: CorrectionReplayRow[],
  audits: CorrectionReplayAudit[],
  requestId: string,
  payload: CorrectionReplayPayload,
): CorrectionReplayResult {
  const existing = corrections.find((row) => row.requestId === requestId);
  if (existing) {
    const audit = audits.find(
      (row) => row.entityId === existing.receiptId && row.requestId === requestId,
    );
    assert.ok(audit, "a correction must retain its receipt-level audit evidence");
    if (JSON.stringify(audit.payload) !== JSON.stringify(payload)) {
      return {
        errorCode: "service_receipt_correction_request_conflict",
        receiptId: existing.receiptId,
        idempotentReplay: false,
      };
    }
    return {
      receiptId: existing.receiptId,
      acceptanceStatus: existing.correctedAcceptanceStatus,
      receivedAmount: existing.correctedReceivedAmount,
      idempotentReplay: true,
    };
  }

  const correction = {
    id: `correction-${corrections.length + 1}`,
    receiptId: payload.receiptId,
    requestId,
    correctedAcceptanceStatus: payload.correctedAcceptanceStatus,
    correctedReceivedAmount: payload.correctedReceivedAmount,
  };
  corrections.push(correction);
  audits.push({
    entityId: payload.receiptId,
    requestId,
    payload,
    correctionId: correction.id,
  });
  return {
    receiptId: correction.receiptId,
    acceptanceStatus: correction.correctedAcceptanceStatus,
    receivedAmount: correction.correctedReceivedAmount,
    idempotentReplay: false,
  };
}

type ClosureReceipt = {
  id: string;
  acceptanceStatus: "ACCEPTED" | "REJECTED";
  receivedAmount: number | null;
};

type ClosureCommitment = {
  status: "open" | "closed";
  authorizedAmount: number;
  receipts: ClosureReceipt[];
};

function closeFullyAcceptedCommitment(commitment: ClosureCommitment) {
  const acceptedAmount = commitment.receipts.reduce(
    (total, receipt) =>
      receipt.acceptanceStatus === "ACCEPTED" ? total + (receipt.receivedAmount ?? 0) : total,
    0,
  );
  if (acceptedAmount !== commitment.authorizedAmount) {
    return "approved_commitment_open_amount_remaining";
  }
  commitment.status = "closed";
  return null;
}

function attemptCorrection(
  commitment: ClosureCommitment,
  receipt: ClosureReceipt,
  corrections: string[],
  audits: string[],
) {
  if (commitment.status !== "open") {
    return {
      errorCode: "service_receipt_commitment_not_open",
      receiptId: receipt.id,
      acceptanceStatus: receipt.acceptanceStatus,
      receivedAmount: receipt.receivedAmount,
    };
  }
  corrections.push(receipt.id);
  audits.push(receipt.id);
  return null;
}

test("L1-D07 migration is additive and replay guarded", () => {
  const sql = executableSql(migration);
  for (const table of [
    "approved_commitments",
    "approved_commitment_amendments",
    "approved_commitment_documents",
    "service_receipts",
    "service_receipt_documents",
    "service_receipt_corrections",
  ]) assert.match(sql, new RegExp(`CREATE TABLE public\\.${table}`));
  assert.match(sql, /CREATE VIEW public\.approved_commitment_balances/);
  assert.equal((sql.match(/CREATE OR REPLACE FUNCTION/g) ?? []).length, 8);
  assert.equal((sql.match(/SECURITY DEFINER/g) ?? []).length, 8);
  assert.equal((sql.match(/SET search_path = pg_catalog, public/g) ?? []).length, 8);
  assert.match(sql, /IF to_regclass\('public\.approved_commitments'\) IS NOT NULL/);
  assert.match(sql, /to_regprocedure\('public\.create_approved_commitment/);
  assert.match(sql, /to_regprocedure\('public\.create_service_receipt\(uuid,uuid,date,text,numeric,numeric,text,numeric,text,text,text,text,uuid,text,text\)'/);
  assert.match(sql, /to_regprocedure\('public\.correct_service_receipt\(uuid,text,numeric,text,text,uuid,text,text\)'/);
  assert.match(sql, /pg_advisory_xact_lock\(hashtextextended\('l1-d07-/);
  assert.match(sql, /'request_id', p_request_id::text/);
  assert.match(sql, /'payload', v_payload/);
  assert.match(sql, /BEGIN;[\s\S]*COMMIT;/);
  assert.doesNotMatch(sql, /\b(DROP|TRUNCATE)\s+(TABLE|VIEW|FUNCTION)/i);
  assert.doesNotMatch(sql, /\b(UPDATE|DELETE)\s+public\.(supplier_bookings|supplier_allocations|supplier_quotations|service_procurement_candidates|business_documents|business_document_links)/i);
});

test("L1-D07 commitment and receipt invariants are explicit", () => {
  const sql = executableSql(migration);
  assert.match(sql, /original_approved_amount numeric\(14,2\) NOT NULL/);
  assert.match(migration, /original_approved_amount[\s\S]*never rewritten by an amendment or cancellation/);
  assert.match(sql, /amendment_type IN \('increase', 'reduction'\)/);
  assert.match(sql, /UNIQUE \(commitment_id, amendment_number\)/);
  assert.match(sql, /UNIQUE \(receipt_id, correction_number\)/);
  assert.match(sql, /UNIQUE \(request_id\)/);
  assert.match(sql, /acceptance_status IN \('PENDING', 'ACCEPTED', 'ACCEPTED_WITH_CONDITIONS', 'REJECTED'\)/);
  assert.match(sql, /FOREIGN KEY \(commitment_id, service_id, supplier_id\)/);
  assert.match(sql, /ADD CONSTRAINT supplier_quotations_id_service_supplier_key UNIQUE \(id, service_id, supplier_id\)/);
  assert.match(sql, /FOREIGN KEY \(supplier_quotation_id, service_id, supplier_id\)/);
  assert.match(sql, /v_reserved_amount \+ p_received_amount > v_authorized_amount/);
  assert.match(sql, /acceptance_status <> 'ACCEPTED_WITH_CONDITIONS'[\s\S]*conditions_notes/);
  assert.match(sql, /ON DELETE RESTRICT/);
  assert.match(sql, /link_purpose = 'approved_commitment'/);
  assert.match(sql, /link_purpose = 'service_receipt'/);
  assert.match(sql, /REVOKE ALL ON TABLE public\.approved_commitments FROM PUBLIC, anon, authenticated/);
  assert.match(sql, /REVOKE ALL ON TABLE public\.approved_commitments FROM service_role/);
  assert.match(sql, /GRANT SELECT ON TABLE public\.approved_commitments TO service_role/);
  assert.doesNotMatch(sql, /GRANT ALL ON TABLE public\.(approved_commitments|approved_commitment_amendments|approved_commitment_documents|service_receipts|service_receipt_documents|service_receipt_corrections) TO service_role/);
  assert.match(sql, /REVOKE ALL ON FUNCTION public\.create_service_receipt/);
  assert.match(sql, /GRANT EXECUTE ON FUNCTION public\.create_service_receipt/);
  assert.match(sql, /GRANT EXECUTE ON FUNCTION public\.correct_service_receipt/);
  assert.match(sql, /service_receipt_correction/);
  assert.match(sql, /service_receipt_already_reviewed/);
  assert.match(sql, /prior_acceptance_status/);
  assert.match(sql, /prior_decision_at/);
  assert.match(sql, /UPDATE public\.service_receipts r[\s\S]*acceptance_status = p_corrected_acceptance_status/);
  assert.match(sql, /r2\.id <> p_receipt_id/);
  assert.match(sql, /'event_type', 'service_receipt_corrected'/);
  assert.match(sql, /IF v_commitment_status <> 'open'\s*THEN/);
  assert.doesNotMatch(sql, /IF p_corrected_acceptance_status <> 'REJECTED'[\s\S]*v_commitment_status <> 'open'/);
  assert.match(sql, /Supplier Booking/);
  assert.match(sql, /Supplier Allocation/);
});

test("L1-D07 correction replay uses correction request identity", () => {
  const sql = executableSql(migration);
  const functionStart = sql.indexOf("CREATE OR REPLACE FUNCTION public.correct_service_receipt");
  const functionEnd = sql.indexOf(
    "CREATE OR REPLACE FUNCTION public.attach_approved_commitment_documents",
    functionStart,
  );
  assert.notEqual(functionStart, -1);
  assert.notEqual(functionEnd, -1);
  const correctionFunction = sql.slice(functionStart, functionEnd);

  assert.match(
    correctionFunction,
    /FROM public\.service_receipt_corrections c[\s\S]*WHERE c\.request_id = p_request_id/,
  );
  assert.match(correctionFunction, /a\.entity_id = c\.receipt_id/);
  assert.match(correctionFunction, /SELECT sc\.id, r\.service_id/);
  assert.doesNotMatch(
    correctionFunction,
    /SELECT a\.entity_id, a\.details -> 'payload'[\s\S]*?WHERE sc\.id = v_existing_correction_id/,
  );

  const corrections: CorrectionReplayRow[] = [];
  const audits: CorrectionReplayAudit[] = [];
  const payload: CorrectionReplayPayload = {
    receiptId: "receipt-1",
    correctedAcceptanceStatus: "ACCEPTED_WITH_CONDITIONS",
    correctedReceivedAmount: 1250,
    correctedConditionsNotes: "Replace damaged component",
    correctionReason: "Original quantity was overstated",
  };

  const fresh = simulateCorrectionReplay(corrections, audits, "request-1", payload);
  assert.deepEqual(fresh, {
    receiptId: "receipt-1",
    acceptanceStatus: "ACCEPTED_WITH_CONDITIONS",
    receivedAmount: 1250,
    idempotentReplay: false,
  });

  const replay = simulateCorrectionReplay(corrections, audits, "request-1", payload);
  assert.deepEqual(replay, { ...fresh, idempotentReplay: true });

  const conflict = simulateCorrectionReplay(corrections, audits, "request-1", {
    ...payload,
    correctedReceivedAmount: 1300,
  });
  assert.deepEqual(conflict, {
    errorCode: "service_receipt_correction_request_conflict",
    receiptId: "receipt-1",
    idempotentReplay: false,
  });
  assert.equal(corrections.length, 1);
  assert.equal(audits.length, 1);
  assert.equal(audits[0]?.correctionId, corrections[0]?.id);
});

test("L1-D07 closed commitments reject receipt correction", () => {
  const sql = executableSql(migration);
  const functionStart = sql.indexOf("CREATE OR REPLACE FUNCTION public.correct_service_receipt");
  const functionEnd = sql.indexOf(
    "CREATE OR REPLACE FUNCTION public.attach_approved_commitment_documents",
    functionStart,
  );
  const correctionFunction = sql.slice(functionStart, functionEnd);
  const openGuardIndex = correctionFunction.indexOf("IF v_commitment_status <> 'open'");
  assert.ok(openGuardIndex >= 0);
  for (const write of [
    "INSERT INTO public.service_receipt_corrections",
    "UPDATE public.service_receipts r",
    "INSERT INTO public.audit_logs",
  ]) {
    const writeIndex = correctionFunction.indexOf(write);
    assert.ok(writeIndex > openGuardIndex, `${write} must follow the open-commitment guard`);
  }
  assert.doesNotMatch(correctionFunction, /UPDATE public\.approved_commitments/);
  assert.match(correctionFunction, /IF v_commitment_status <> 'open'\s*THEN/);
  assert.doesNotMatch(
    correctionFunction,
    /IF p_corrected_acceptance_status <> 'REJECTED'[\s\S]*v_commitment_status <> 'open'/,
  );

  const receipt: ClosureReceipt = {
    id: "receipt-1",
    acceptanceStatus: "ACCEPTED",
    receivedAmount: 1000,
  };
  const commitment: ClosureCommitment = {
    status: "open",
    authorizedAmount: 1000,
    receipts: [receipt],
  };
  assert.equal(closeFullyAcceptedCommitment(commitment), null);
  assert.equal(commitment.status, "closed");

  const receiptBeforeCorrection = { ...receipt };
  const corrections: string[] = [];
  const audits: string[] = [];
  assert.deepEqual(attemptCorrection(commitment, receipt, corrections, audits), {
    errorCode: "service_receipt_commitment_not_open",
    receiptId: "receipt-1",
    acceptanceStatus: "ACCEPTED",
    receivedAmount: 1000,
  });
  assert.deepEqual(receipt, receiptBeforeCorrection);
  assert.equal(corrections.length, 0);
  assert.equal(audits.length, 0);
});
