import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { executeUpdateApprovedCommercialAmendmentDraft } from "./commercial-amendment-draft-contract.ts";

const QUOTATION_ID = "11111111-1111-4111-8111-111111111111";
const UPDATED_AT = "2026-09-20T04:00:00.000Z";
const BASE_LINE = {
  line_key: "root-1",
  parent_line_key: null,
  commercial_role: "authority_line" as const,
  description: "Stage lighting",
  description_ar: "إضاءة المسرح",
  details: null,
  category: "Production",
  qty: 1,
  unit: "package",
  unit_price: 100,
  is_selected: true,
};
const ACTOR = { clerk_user_id: "staff-1", role: "admin" };

test("structured Draft contract sends one complete snapshot and server concurrency token", async () => {
  let received: Record<string, unknown> | null = null;
  const result = await executeUpdateApprovedCommercialAmendmentDraft({
    value: {
      quotation_id: QUOTATION_ID,
      event: "Customer event",
      date: "2026-09-20",
      valid_until: "2026-09-25",
      discount: 10,
      expected_updated_at: UPDATED_AT,
      lines: [BASE_LINE],
    },
    actor: ACTOR,
    invoke: async (params) => {
      received = params;
      return {
        error: null,
        data: [{
          error_code: null,
          quotation_id: QUOTATION_ID,
          updated_at: UPDATED_AT,
          line_count: 1,
          subtotal: 100,
          discount: 10,
          vat_amount: 0,
          grand_total: 90,
        }],
      };
    },
  });

  assert.equal(result.success, true);
  const sent = received as unknown as Record<string, unknown>;
  assert.equal(sent.p_expected_updated_at as string, UPDATED_AT);
  assert.deepEqual(sent.p_quotation, {
    event: "Customer event",
    date: "2026-09-20",
    valid_until: "2026-09-25",
    discount: 10,
  });
  assert.deepEqual(sent.p_lines, [BASE_LINE]);
});

test("structured Draft contract rejects malformed hierarchy before invoking the RPC", async () => {
  let invoked = false;
  const result = await executeUpdateApprovedCommercialAmendmentDraft({
    value: {
      quotation_id: QUOTATION_ID,
      event: "Customer event",
      date: "2026-09-20",
      valid_until: null,
      discount: 0,
      expected_updated_at: UPDATED_AT,
      lines: [{ ...BASE_LINE, commercial_role: "included_component", parent_line_key: null, unit_price: 25 }],
    },
    actor: ACTOR,
    invoke: async () => {
      invoked = true;
      return { error: null, data: [] };
    },
  });

  assert.equal(invoked, false);
  assert.equal(result.success, false);
  if (!result.success) assert.equal(result.code, "INVALID_INPUT");
});

test("W7-P0B migration is bounded to eligible Draft successors and service-role execution", () => {
  const migration = readFileSync(
    new URL("../../../supabase/migrations/20260920060431_w7p0b_structured_amendment_draft_mutation.sql", import.meta.url),
    "utf8",
  );
  assert.match(migration, /CREATE FUNCTION public\.update_approved_commercial_amendment_draft/);
  assert.match(migration, /v_draft\.status <> 'draft'/);
  assert.match(migration, /revision_of_quotation_id IS NULL/);
  assert.match(migration, /approved_commercial_amendment_creation/);
  assert.match(migration, /quotation_amendment_draft_concurrency_conflict/);
  assert.match(migration, /reconcile_quotation_discount_allocations/);
  assert.match(migration, /GRANT EXECUTE ON FUNCTION public\.update_approved_commercial_amendment_draft[\s\S]*TO service_role/);
  assert.match(migration, /SET search_path = pg_catalog, public/);
  assert.match(migration, /approved_commercial_amendment_draft_updated/);
  assert.doesNotMatch(migration, /UPDATE\s+public\.(approved_billing_scopes|invoices|payments)\b/i);
});

test("legacy quotation edit paths fail closed for structured amendment Drafts", () => {
  const actions = readFileSync(
    new URL("../../lib/quotations/actions.ts", import.meta.url),
    "utf8",
  );
  const editPage = readFileSync(
    new URL("../../app/(dashboard)/quotations/[id]/edit/page.tsx", import.meta.url),
    "utf8",
  );
  assert.match(actions, /revision_of_quotation_id[\s\S]*approved_commercial_amendment_creation[\s\S]*Commercial amendment Drafts must be edited/);
  assert.match(editPage, /isApprovedCommercialAmendment[\s\S]*\/amendment/);
});
