import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { executeUpdateFlexibleQuotationDraft } from "./commercial-amendment-draft-contract.ts";

const quotationId = "11111111-1111-4111-8111-111111111111";

const validDraft = {
  quotation_id: quotationId,
  event: "Flexible event",
  date: "2026-09-20",
  valid_until: "2026-09-25",
  discount: 10,
  expected_updated_at: "2026-09-20T10:00:00.000Z",
  lines: [
    {
      line_key: "authority-1",
      parent_line_key: null,
      commercial_role: "authority_line" as const,
      description: "Main service",
      description_ar: "الخدمة الرئيسية",
      details: "Details",
      category: "Events",
      qty: 1,
      unit: "service",
      unit_price: 100,
      is_selected: true,
    },
    {
      line_key: "optional-1",
      parent_line_key: "authority-1",
      commercial_role: "optional_add_on" as const,
      description: "Optional add-on",
      description_ar: null,
      details: null,
      category: "Add-ons",
      qty: 2,
      unit: "unit",
      unit_price: 25,
      is_selected: false,
    },
  ],
};

test("flexible Draft contract sends the complete structured snapshot", async () => {
  let invoked: Record<string, unknown> = {};
  const result = await executeUpdateFlexibleQuotationDraft({
    value: validDraft,
    actor: { clerk_user_id: "clerk_test_user", role: "admin" },
    invoke: async (params) => {
      invoked = params;
      return {
        data: [{
          error_code: null,
          quotation_id: quotationId,
          updated_at: "2026-09-20T10:01:00.000Z",
          line_count: 2,
          subtotal: 100,
          discount: 10,
          vat_amount: 0,
          grand_total: 90,
        }],
        error: null,
      };
    },
  });

  assert.equal(result.success, true);
  assert.equal(invoked.p_quotation_id, quotationId);
  assert.deepEqual(invoked.p_lines, validDraft.lines);
  assert.equal(invoked.p_expected_updated_at, validDraft.expected_updated_at);
});

test("flexible Draft contract rejects malformed hierarchy before any RPC", async () => {
  let invoked = false;
  const result = await executeUpdateFlexibleQuotationDraft({
    value: {
      ...validDraft,
      lines: [{ ...validDraft.lines[1], parent_line_key: "missing-root" }],
    },
    actor: { clerk_user_id: "clerk_test_user", role: "admin" },
    invoke: async () => {
      invoked = true;
      return { data: [], error: null };
    },
  });

  assert.equal(result.success, false);
  assert.equal(result.code, "INVALID_INPUT");
  assert.equal(invoked, false);
});

test("W7-P0 flexible migration keeps the two new RPCs service-role-only and separate from W7-P0B", () => {
  const sql = readFileSync(
    join(process.cwd(), "supabase/migrations/20260920090000_w7p0_flexible_quotation_builder.sql"),
    "utf8",
  );
  assert.match(sql, /CREATE FUNCTION public\.create_flexible_quotation_with_items/i);
  assert.match(sql, /CREATE FUNCTION public\.update_flexible_quotation_draft/i);
  assert.match(sql, /SET search_path = pg_catalog, public/i);
  assert.match(sql, /REVOKE ALL ON FUNCTION public\.create_flexible_quotation_with_items/i);
  assert.match(sql, /REVOKE ALL ON FUNCTION public\.update_flexible_quotation_draft/i);
  assert.match(sql, /create_quotation_with_items\(jsonb,\s*jsonb,\s*text\)/i);
  assert.match(sql, /set_quotation_commercial_structure\(v_created\.quotation_id/i);
  assert.match(sql, /reconcile_quotation_discount_allocations\(v_draft\.id\)/i);
  assert.doesNotMatch(sql, /DROP FUNCTION public\.update_approved_commercial_amendment_draft/i);
});
