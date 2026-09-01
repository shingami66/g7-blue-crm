import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { mapLegacyServiceStatus } from "./lifecycle.ts";

const MIGRATION = readFileSync(
  new URL("../../../supabase/migrations/20260901110000_w3_event_lifecycle_compatibility.sql", import.meta.url),
  "utf8",
);

const SERVICE_ID = "11111111-1111-4111-8111-111111111111";

test("legacy Service statuses map to independent W3 dimensions without using Deposit Paid as readiness", () => {
  const expected = {
    Inquiry: ["inquiry", "unassessed", "not_started", "pending", "open"],
    Quoted: ["quoted", "unassessed", "not_started", "pending", "open"],
    Approved: ["approved", "unassessed", "not_started", "pending", "open"],
    "Deposit Paid": ["approved", "unassessed", "not_started", "pending", "open"],
    "In Progress": ["approved", "ready", "in_progress", "pending", "open"],
    Completed: ["approved", "ready", "ended", "confirmed", "open"],
    Cancelled: ["cancelled", "not_applicable", "not_applicable", "not_applicable", "open"],
  } as const;

  for (const [legacyStatus, [commercial, readiness, execution, completion, close]] of Object.entries(expected)) {
    const state = mapLegacyServiceStatus(SERVICE_ID, legacyStatus as keyof typeof expected);
    assert.deepEqual(
      [state.commercialState, state.readinessState, state.executionState, state.completionState, state.closeState],
      [commercial, readiness, execution, completion, close],
      legacyStatus,
    );
    assert.equal(state.paymentState, "unassessed", legacyStatus);
    assert.equal(state.startGateBasis, null, legacyStatus);
  }
});

test("W3 payment projection excludes historical voided and cancelled deposits", () => {
  assert.match(MIGRATION, /v_deposit_count = 0 THEN\s+RETURN 'unassessed'/);
  assert.match(MIGRATION, /i\.voided_at IS NULL/);
  assert.match(MIGRATION, /i\.status NOT IN \('voided', 'cancelled'\)/);
  assert.doesNotMatch(MIGRATION, /historical.*inconsistent/i);
});

test("W3 migration is additive, finite, and does not widen permission overrides", () => {
  assert.match(MIGRATION, /CREATE TABLE public\.service_lifecycle_states/);
  assert.match(MIGRATION, /INSERT INTO public\.service_lifecycle_states/);
  assert.match(MIGRATION, /FROM public\.services s/);
  assert.match(MIGRATION, /CREATE OR REPLACE FUNCTION public\.transition_service_lifecycle/);
  assert.match(MIGRATION, /p_action IS NULL OR p_action NOT IN \('mark_ready', 'block_readiness', 'start', 'complete', 'close', 'reopen_delivery', 'reopen_closeout'\)/);
  assert.match(MIGRATION, /p_gate_basis = 'authorized_credit' AND p_actor_role NOT IN \('admin', 'manager'\)/);
  assert.match(MIGRATION, /p_action <> 'start' AND p_gate_basis IS NOT NULL/);
  assert.match(MIGRATION, /'lifecycle_version', 'w3-v1'/);
  assert.match(MIGRATION, /'request_id', p_request_id/);
  assert.match(MIGRATION, /WHEN NEW\.status = 'Cancelled' THEN 'open'/);
  assert.match(MIGRATION, /WHEN NEW\.status = 'Cancelled' THEN NULL/);
  assert.match(MIGRATION, /service_lifecycle_cancel_forbidden/);
  assert.match(MIGRATION, /v_lifecycle_execution_state IN \('in_progress', 'ended'\)/);
  assert.match(MIGRATION, /PERFORM s\.id[\s\S]*FROM public\.services s[\s\S]*FOR UPDATE/);
  assert.doesNotMatch(MIGRATION, /app_user_permission_overrides/);
  assert.doesNotMatch(MIGRATION, /CREATE INDEX/);
  assert.doesNotMatch(MIGRATION, /SET status = 'In Progress'/);
  assert.doesNotMatch(MIGRATION, /SET status = 'Completed'/);
  assert.doesNotMatch(MIGRATION, /RETURN COALESCE\(NEW, OLD\)/);
});

test("W3 lifecycle migration secures the exposed projection and preserves close separation", () => {
  assert.match(MIGRATION, /ALTER TABLE public\.service_lifecycle_states ENABLE ROW LEVEL SECURITY/);
  assert.match(MIGRATION, /REVOKE ALL ON TABLE public\.service_lifecycle_states FROM PUBLIC, anon, authenticated/);
  assert.match(MIGRATION, /GRANT ALL ON TABLE public\.service_lifecycle_states TO service_role/);
  assert.match(MIGRATION, /close_state = 'open'\s+OR \(execution_state = 'ended' AND completion_state = 'confirmed'\)/);
  assert.doesNotMatch(MIGRATION, /financial_close|accounting_close|approved_billing_scopes|supplier_allocations|supplier_bookings/);
});
