import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  QUOTATION_APPROVAL_ACTIVATION_ERROR_MESSAGES,
  executeQuotationApprovalActivation,
  mapQuotationApprovalActivationError,
  parseQuotationApprovalActivationRpcResult,
} from "./approval-contract.ts";

const QUOTATION_ID = "11111111-1111-4111-8111-111111111111";
const SERVICE_ID = "22222222-2222-4222-8222-222222222222";
const SCOPE_ID = "33333333-3333-4333-8333-333333333333";
const ACTOR = {
  clerk_user_id: "user_approval_actor",
  role: "admin",
};

function rpcRow(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    error_code: null,
    quotation_id: QUOTATION_ID,
    quotation_number: "QT-2026-0001",
    service_id: SERVICE_ID,
    quotation_status: "approved",
    approved_at: "2026-08-03T08:00:00.000Z",
    approved_billing_scope_id: SCOPE_ID,
    scope_version: 1,
    accepted_subtotal: 100,
    accepted_vat_amount: 15,
    accepted_grand_total: 115,
    abs_status: "approved",
    abs_activated_at: "2026-08-03T08:00:00.000Z",
    quotation_approved: true,
    abs_activated: true,
    idempotent_replay: false,
    ...overrides,
  };
}

test("invalid quotation UUID is rejected before any RPC call", async () => {
  let calls = 0;
  const result = await executeQuotationApprovalActivation({
    quotationId: "not-a-uuid",
    actor: ACTOR,
    invoke: async () => {
      calls += 1;
      return { data: [], error: null };
    },
  });

  assert.equal(result.success, false);
  assert.equal(calls, 0);
});

test("actor identity and role are derived into the exact RPC contract", async () => {
  let params: Record<string, unknown> | null = null;
  const result = await executeQuotationApprovalActivation({
    quotationId: QUOTATION_ID,
    actor: ACTOR,
    invoke: async (received) => {
      params = received;
      return { data: [rpcRow()], error: null };
    },
  });

  assert.equal(result.success, true);
  assert.deepEqual(params, {
    p_quotation_id: QUOTATION_ID,
    p_actor_id: ACTOR.clerk_user_id,
    p_actor_role: ACTOR.role,
  });
});

test("exactly one valid RPC result row succeeds and exposes replay state", async () => {
  const result = await executeQuotationApprovalActivation({
    quotationId: QUOTATION_ID,
    actor: ACTOR,
    invoke: async () => ({
      data: [rpcRow({ idempotent_replay: true })],
      error: null,
    }),
  });

  assert.equal(result.success, true);
  if (result.success) {
    assert.equal(result.data.idempotent, true);
    assert.equal(result.data.approved_billing_scope_id, SCOPE_ID);
  }
});

test("zero, multiple, malformed, and null RPC result data fail closed", async () => {
  const cases: Array<[string, unknown]> = [
    ["zero rows", []],
    ["two valid rows", [rpcRow(), rpcRow({ idempotent_replay: true })]],
    ["malformed row", [null]],
    ["null data", null],
  ];

  for (const [scenario, responseData] of cases) {
    const result = await executeQuotationApprovalActivation({
      quotationId: QUOTATION_ID,
      actor: ACTOR,
      invoke: async () => ({ data: responseData, error: null }),
    });

    assert.deepEqual(
      result,
      {
        success: false,
        error:
          "Failed to approve quotation and activate internal billing authority. Please try again.",
      },
      scenario,
    );
  }
});

test("malformed or extra RPC fields fail safely", async () => {
  const malformed = await executeQuotationApprovalActivation({
    quotationId: QUOTATION_ID,
    actor: ACTOR,
    invoke: async () => ({
      data: [rpcRow({ unexpected_database_field: "secret" })],
      error: null,
    }),
  });

  assert.deepEqual(malformed, {
    success: false,
    error:
      "Failed to approve quotation and activate internal billing authority. Please try again.",
  });
  assert.equal(parseQuotationApprovalActivationRpcResult({}), null);
});

test("canonical consistency and financial errors map without database details", async () => {
  const cases = [
    [
      "quotation_internal_authority_inconsistent",
      QUOTATION_APPROVAL_ACTIVATION_ERROR_MESSAGES.quotation_internal_authority_inconsistent,
    ],
    [
      "quotation_financial_total_mismatch",
      QUOTATION_APPROVAL_ACTIVATION_ERROR_MESSAGES.quotation_financial_total_mismatch,
    ],
    [
      "scope_discount_not_supported",
      QUOTATION_APPROVAL_ACTIVATION_ERROR_MESSAGES.scope_discount_not_supported,
    ],
    [
      "quotation_approval_conflict",
      QUOTATION_APPROVAL_ACTIVATION_ERROR_MESSAGES.quotation_approval_conflict,
    ],
  ] as const;

  for (const [code, message] of cases) {
    const result = await executeQuotationApprovalActivation({
      quotationId: QUOTATION_ID,
      actor: ACTOR,
      invoke: async () => ({
        data: [rpcRow({
          error_code: code,
          quotation_approved: false,
          abs_activated: false,
        })],
        error: null,
      }),
    });

    assert.deepEqual(result, { success: false, error: message });
    assert.equal(mapQuotationApprovalActivationError(code), message);
  }
});

test("permission contract and application mutation boundary remain explicit", () => {
  const actionSource = readFileSync(
    new URL("./actions.ts", import.meta.url),
    "utf8",
  );

  assert.match(actionSource, /requirePermission\("quotations:approve"\)/);
  assert.match(
    actionSource,
    /approve_quotation_and_activate_internal_abs/,
  );
  assert.match(actionSource, /user\.clerk_user_id/);
  assert.match(actionSource, /user\.role/);
  assert.doesNotMatch(actionSource, /from\("audit_logs"\)/);
  assert.doesNotMatch(actionSource, /from\("invoices"\)/);
  assert.doesNotMatch(actionSource, /from\("payments"\)/);
});

test("auto ABS migration preserves canonical zero-discount VAT-aware totals", () => {
  const migrationSource = readFileSync(
    new URL(
      "../../../supabase/migrations/20260803090000_quotation_approval_internal_abs_activation.sql",
      import.meta.url,
    ),
    "utf8",
  );

  const scenarios = [
    {
      name: "zero VAT",
      lineSubtotals: [100, 50],
      lineVat: [0, 0],
      quotation: { subtotal: 150, discount: 0, vatAmount: 0, grandTotal: 150 },
    },
    {
      name: "15 percent VAT",
      lineSubtotals: [100, 50],
      lineVat: [15, 7.5],
      quotation: { subtotal: 150, discount: 0, vatAmount: 22.5, grandTotal: 172.5 },
    },
  ] as const;

  for (const scenario of scenarios) {
    const subtotal = scenario.lineSubtotals.reduce<number>(
      (sum, value) => sum + value,
      0,
    );
    const vatAmount = scenario.lineVat.reduce<number>(
      (sum, value) => sum + value,
      0,
    );
    const acceptedGrandTotal = scenario.lineSubtotals.reduce<number>(
      (sum, value, index) => sum + value + scenario.lineVat[index],
      0,
    );

    assert.equal(subtotal, scenario.quotation.subtotal, scenario.name);
    assert.equal(vatAmount, scenario.quotation.vatAmount, scenario.name);
    assert.equal(
      acceptedGrandTotal,
      scenario.quotation.subtotal + scenario.quotation.vatAmount,
      scenario.name,
    );
    assert.equal(acceptedGrandTotal, scenario.quotation.grandTotal, scenario.name);
  }

  assert.match(
    migrationSource,
    /COALESCE\(sum\(qi\.total\), 0\)::numeric,\s*\n\s*COALESCE\(sum\(qi\.vat\), 0\)::numeric,\s*\n\s*COALESCE\(sum\(qi\.total \+ qi\.vat\), 0\)::numeric/,
  );
  assert.match(
    migrationSource,
    /qi\.total AS subtotal,\s*\n\s*qi\.vat,\s*\n\s*qi\.total \+ qi\.vat AS grand_total/,
  );
  assert.match(
    migrationSource,
    /actual\.accepted_grand_total IS DISTINCT FROM expected\.grand_total/,
  );
});

test("auto ABS migration keeps discount, security, and mutation safeguards", () => {
  const migrationSource = readFileSync(
    new URL(
      "../../../supabase/migrations/20260803090000_quotation_approval_internal_abs_activation.sql",
      import.meta.url,
    ),
    "utf8",
  );

  assert.match(
    migrationSource,
    /IF COALESCE\(v_quotation\.discount, 0\) > 0 THEN[\s\S]*scope_discount_not_supported/,
  );
  assert.match(migrationSource, /SECURITY DEFINER/);
  assert.match(migrationSource, /SET search_path = pg_catalog, public/);
  assert.match(
    migrationSource,
    /REVOKE ALL ON FUNCTION public\.approve_quotation_and_activate_internal_abs\(uuid, text, text\)/,
  );
  assert.match(
    migrationSource,
    /GRANT EXECUTE ON FUNCTION public\.approve_quotation_and_activate_internal_abs\(uuid, text, text\)\s+TO service_role/,
  );
  assert.doesNotMatch(
    migrationSource,
    /(?:INSERT\s+INTO|UPDATE|DELETE\s+FROM)\s+public\.(?:invoices|payments)/,
  );
});

test("forward-only correction transitions Inquiry or Quoted Services atomically", () => {
  const correctionSource = readFileSync(
    new URL(
      "../../../supabase/migrations/20260803100000_quotation_approval_service_status_transition_fix.sql",
      import.meta.url,
    ),
    "utf8",
  );

  assert.match(
    correctionSource,
    /ALTER FUNCTION public\.approve_quotation_and_activate_internal_abs\(uuid, text, text\)\s+RENAME TO approve_quotation_and_activate_internal_abs_legacy/,
  );
  assert.match(correctionSource, /SET status = 'Approved'/);
  assert.match(
    correctionSource,
    /v_service_status NOT IN \('Inquiry', 'Quoted', 'Approved'\)/,
  );
  assert.match(
    correctionSource,
    /v_service_status IN \('Inquiry', 'Quoted'\) AND v_quotation_status = 'approved'/,
  );
  assert.match(correctionSource, /INSERT INTO public\.audit_logs/);
  assert.match(correctionSource, /required_columns\(table_name, column_name, type_name\)/);
  assert.match(correctionSource, /\('quotations','subtotal','numeric'\)/);
  assert.match(correctionSource, /\('quotation_items','vat','numeric'\)/);
  assert.match(correctionSource, /\('approved_billing_scope_items','accepted_grand_total','numeric'\)/);
  assert.match(correctionSource, /\('audit_logs','timestamp','timestamp with time zone'\)/);
  assert.match(correctionSource, /unexpected RPC overload/);
  assert.match(correctionSource, /SECURITY DEFINER/);
  assert.match(correctionSource, /SET search_path = pg_catalog, public/);
  assert.match(
    correctionSource,
    /GRANT EXECUTE ON FUNCTION public\.approve_quotation_and_activate_internal_abs\(uuid, text, text\)\s+TO service_role/,
  );
});

test("quotation approval keeps draft-or-sent eligibility and rejects later Service states", () => {
  const legacySource = readFileSync(
    new URL(
      "../../../supabase/migrations/20260803090000_quotation_approval_internal_abs_activation.sql",
      import.meta.url,
    ),
    "utf8",
  );
  const correctionSource = readFileSync(
    new URL(
      "../../../supabase/migrations/20260803100000_quotation_approval_service_status_transition_fix.sql",
      import.meta.url,
    ),
    "utf8",
  );

  assert.match(legacySource, /q\.status IN \('draft', 'sent'\)/);
  assert.match(
    correctionSource,
    /v_service_status NOT IN \('Inquiry', 'Quoted', 'Approved'\)/,
  );
  assert.match(
    correctionSource,
    /v_service_status IN \('Inquiry', 'Quoted'\) AND v_quotation_status = 'approved'/,
  );
  assert.doesNotMatch(
    correctionSource,
    /CREATE OR REPLACE FUNCTION public\.(?:start_service_execution|complete_service|cancel_service)/,
  );
});

test("database errors are not leaked to the caller", async () => {
  const result = await executeQuotationApprovalActivation({
    quotationId: QUOTATION_ID,
    actor: ACTOR,
    invoke: async () => ({
      data: null,
      error: {
        code: "XX000",
        message: "secret internal database detail",
      },
    }),
  });

  assert.equal(result.success, false);
  if (!result.success) {
    assert.doesNotMatch(result.error, /secret internal database detail/);
  }
});
