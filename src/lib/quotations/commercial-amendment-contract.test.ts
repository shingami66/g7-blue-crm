import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  executeApproveApprovedCommercialAmendment,
  executeCreateApprovedCommercialAmendment,
} from "./commercial-amendment-contract.ts";

const SOURCE_ID = "11111111-1111-4111-8111-111111111111";
const SUCCESSOR_ID = "22222222-2222-4222-8222-222222222222";
const SERVICE_ID = "33333333-3333-4333-8333-333333333333";
const SCOPE_ID = "44444444-4444-4444-8444-444444444444";
const ACTOR = { clerk_user_id: "staff-1", role: "admin" };

test("creation contract validates bounded input and sends actor identity to the RPC", async () => {
  let received: Record<string, string> | null = null;
  const result = await executeCreateApprovedCommercialAmendment({
    value: {
      source_quotation_id: SOURCE_ID,
      amendment_reason: "Customer requested an added Authority Line",
      mutation_key: "amendment-create-1",
    },
    actor: ACTOR,
    invoke: async (params) => {
      received = params;
      return {
        error: null,
        data: [{
          error_code: null,
          source_quotation_id: SOURCE_ID,
          successor_quotation_id: SUCCESSOR_ID,
          quotation_number: "QT-2",
          quotation_family_id: SOURCE_ID,
          revision_number: 2,
          service_id: SERVICE_ID,
          created: true,
          idempotent_replay: false,
        }],
      };
    },
  });

  assert.equal(result.success, true);
  assert.deepEqual(received, {
    p_source_quotation_id: SOURCE_ID,
    p_amendment_reason: "Customer requested an added Authority Line",
    p_mutation_key: "amendment-create-1",
    p_actor_id: "staff-1",
    p_actor_role: "admin",
  });
});

test("creation contract accepts an exact idempotent replay", async () => {
  const result = await executeCreateApprovedCommercialAmendment({
    value: {
      source_quotation_id: SOURCE_ID,
      amendment_reason: "Customer requested an added Authority Line",
      mutation_key: "amendment-create-1",
    },
    actor: ACTOR,
    invoke: async () => ({
      error: null,
      data: [{
        error_code: null,
        source_quotation_id: SOURCE_ID,
        successor_quotation_id: SUCCESSOR_ID,
        quotation_number: "QT-2",
        quotation_family_id: SOURCE_ID,
        revision_number: 2,
        service_id: SERVICE_ID,
        created: true,
        idempotent_replay: true,
      }],
    }),
  });

  assert.equal(result.success, true);
  if (result.success) assert.equal(result.data.idempotent, true);
});

test("approval contract rejects malformed or unsafe RPC results", async () => {
  const invalidInput = await executeApproveApprovedCommercialAmendment({
    value: { source_quotation_id: "bad", successor_quotation_id: SUCCESSOR_ID, mutation_key: "k" },
    actor: ACTOR,
    invoke: async () => {
      throw new Error("must not call RPC");
    },
  });
  assert.equal(invalidInput.success, false);

  const malformed = await executeApproveApprovedCommercialAmendment({
    value: { source_quotation_id: SOURCE_ID, successor_quotation_id: SUCCESSOR_ID, mutation_key: "k" },
    actor: ACTOR,
    invoke: async () => ({ error: null, data: [{ error_code: null }] }),
  });
  assert.deepEqual(malformed, {
    success: false,
    code: "AMENDMENT_FAILED",
    error: "Commercial amendment could not be completed. Please try again.",
  });
});

test("approval contract exposes a bounded successful authority result and replay", async () => {
  const result = await executeApproveApprovedCommercialAmendment({
    value: { source_quotation_id: SOURCE_ID, successor_quotation_id: SUCCESSOR_ID, mutation_key: "k" },
    actor: ACTOR,
    invoke: async () => ({
      error: null,
      data: [{
        error_code: null,
        source_quotation_id: SOURCE_ID,
        successor_quotation_id: SUCCESSOR_ID,
        source_scope_id: SCOPE_ID,
        successor_scope_id: SCOPE_ID,
        service_id: SERVICE_ID,
        source_scope_version: 1,
        successor_scope_version: 2,
        previous_ceiling: 100,
        successor_ceiling: 125,
        lifetime_invoice_total: 40,
        approved_at: "2026-09-19T10:00:00Z",
        quotation_status: "approved",
        abs_status: "approved",
        quotation_approved: true,
        abs_activated: true,
        idempotent_replay: true,
      }],
    }),
  });

  assert.equal(result.success, true);
  if (result.success) assert.equal(result.data.idempotent, true);
});

test("migration preserves the locked authority bridge and security boundaries", () => {
  const migration = readFileSync(
    new URL("../../../supabase/migrations/20260919113218_w7p0a_approved_commercial_amendment_authority_bridge.sql", import.meta.url),
    "utf8",
  );
  const repairMigration = readFileSync(
    new URL("../../../supabase/migrations/20260919131500_w7p0a_approved_commercial_amendment_creation_ambiguity_repair.sql", import.meta.url),
    "utf8",
  );
  const reviewSourceRecoveryMigration = readFileSync(
    new URL("../../../supabase/migrations/20260920052403_w7p0a_approved_commercial_amendment_review_source_recovery.sql", import.meta.url),
    "utf8",
  );
  const absMetadataRecoveryMigration = readFileSync(
    new URL("../../../supabase/migrations/20260919160000_w7p0a_approved_commercial_amendment_abs_metadata_repair.sql", import.meta.url),
    "utf8",
  );

  for (const column of ["superseded_at", "superseded_by_quotation_id", "amendment_approval_key", "amendment_approval_payload"]) {
    assert.match(migration, new RegExp(`ADD COLUMN ${column}`));
  }
  assert.match(migration, /unique_approved_quotation_per_service/);
  assert.match(migration, /superseded_at IS NULL/);
  assert.match(migration, /g7\.w7p0a_revision_source_id/);
  assert.match(repairMigration, /CREATE OR REPLACE FUNCTION public\.create_approved_commercial_amendment/);
  assert.match(repairMigration, /SELECT q2\.quotation_family_id FROM public\.quotations q2/);
  assert.match(migration, /approved_commercial_amendment_created/);
  assert.match(migration, /approve_approved_commercial_amendment/);
  assert.match(migration, /scope_successor_ceiling_below_invoiced/);
  assert.match(migration, /invoice_authority_quotation_mismatch/);
  assert.match(reviewSourceRecoveryMigration, /CREATE OR REPLACE FUNCTION public\.prevent_approved_quotation_mutation/);
  assert.match(reviewSourceRecoveryMigration, /CREATE OR REPLACE FUNCTION public\.check_approved_billing_scopes_before_write/);
  assert.match(reviewSourceRecoveryMigration, /SET search_path = pg_catalog, public/);
  assert.match(absMetadataRecoveryMigration, /CREATE OR REPLACE FUNCTION public\.approve_approved_commercial_amendment/);
  assert.match(absMetadataRecoveryMigration, /source_commercial_role, source_parent_authority_line_id, source_is_selected/);
  assert.match(absMetadataRecoveryMigration, /qi\.commercial_role, qi\.parent_authority_line_id/);
  assert.match(migration, /SET search_path = pg_catalog, public/);
  assert.match(migration, /REVOKE ALL ON FUNCTION public\.create_approved_commercial_amendment/);
  assert.match(migration, /GRANT EXECUTE ON FUNCTION public\.approve_approved_commercial_amendment[\s\S]*TO service_role/);
  assert.doesNotMatch(migration, /CREATE TABLE public\.(change_orders|credit_notes|refunds|general_ledger)/i);
});

test("actions keep P0A distinct from ordinary first-time approval and UI", () => {
  const actions = readFileSync(new URL("./actions.ts", import.meta.url), "utf8");
  assert.match(actions, /createApprovedCommercialAmendment/);
  assert.match(actions, /approveApprovedCommercialAmendment/);
  assert.match(actions, /quotations:write/);
  assert.match(actions, /quotations:approve/);
  assert.match(actions, /create_approved_commercial_amendment/);
  assert.match(actions, /approve_approved_commercial_amendment/);
  assert.doesNotMatch(actions, /change_orders|credit_notes|refunds|fatoora|zatca/i);
});
