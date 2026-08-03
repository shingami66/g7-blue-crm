import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { getServiceInvoiceLifecycleDecision } from "./service-invoice-lifecycle.ts";
import { resolveInvoiceControlVisibility } from "./control-visibility.ts";

const migration = readFileSync(
  join(
    import.meta.dirname,
    "../../../supabase/migrations/20260803130000_deposit_service_audit_and_completed_billing_fix.sql",
  ),
  "utf8",
);
const sql = migration
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/--.*$/gm, "");

function replaceUniqueLifecycleFragment(
  definition: string,
  oldLifecycle: string,
  newLifecycle: string,
) {
  const normalizedDefinition = definition.replace(/\r\n/g, "\n");
  const normalizedOldLifecycle = oldLifecycle.replace(/\r\n/g, "\n");
  const normalizedNewLifecycle = newLifecycle.replace(/\r\n/g, "\n");
  const occurrences =
    (normalizedDefinition.length -
      normalizedDefinition.replaceAll(normalizedOldLifecycle, "").length) /
    normalizedOldLifecycle.length;

  if (occurrences !== 1) {
    throw new Error("completed billing correction: lifecycle fragment drift");
  }

  return normalizedDefinition.replace(normalizedOldLifecycle, normalizedNewLifecycle);
}

test("Completed permits Final only while Cancelled remains blocked", () => {
  const completed = getServiceInvoiceLifecycleDecision({
    status: "Completed",
    deletedAt: null,
  });
  const cancelled = getServiceInvoiceLifecycleDecision({
    status: "Cancelled",
    deletedAt: null,
  });

  assert.equal(completed.canCreateDeposit, false);
  assert.equal(completed.canCreateFinal, true);
  assert.equal(cancelled.canCreateDeposit, false);
  assert.equal(cancelled.canCreateFinal, false);
});

test("Completed with SAR 50 remaining renders the authorized Final action", () => {
  const lifecycleDecision = getServiceInvoiceLifecycleDecision({
    status: "Completed",
    deletedAt: null,
  });

  assert.deepEqual(
    resolveInvoiceControlVisibility({
      canCreateInvoices: true,
      authorityMode: "active_abs",
      lifecycleDecision,
      canCreateDepositInvoice: false,
      canCreateFinalInvoice: true,
      remainingUninvoicedAmount: 50,
    }),
    {
      showInvoiceActions: true,
      canCreateDepositInvoice: false,
      canCreateFinalInvoice: true,
    },
  );
});

test("invoice correction preflights the exact deployed contract and financial guards", () => {
  assert.match(sql, /to_regprocedure\(\s*'public\.create_invoice_atomic\(uuid,uuid,text,numeric,text,text,text,jsonb,jsonb,jsonb,jsonb,jsonb,date,date\)'/i);
  assert.match(sql, /TABLE\(error_code text, invoice_id uuid, invoice_number text\)/i);
  for (const invariant of [
    /v_invoice_amount := v_remaining/,
    /final_invoice_already_exists/,
    /billing_scope_authority_unavailable/,
    /invoice_exposure_unavailable/,
    /prior_invoices_exceed_billing_scope_ceiling/,
    /uq_invoices_one_active_deposit_per_service/,
  ]) {
    assert.match(sql, invariant);
  }
});

test("invoice correction replaces exactly the Completed and Cancelled lifecycle fragment", () => {
  assert.match(sql, /v_old_lifecycle text := \$old\$[\s\S]*?ELSIF v_service_status IN \('Completed', 'Cancelled'\)[\s\S]*?v_final_allowed := false/);
  assert.match(sql, /v_new_lifecycle text := \$new\$[\s\S]*?v_service_status = 'Completed'[\s\S]*?v_final_allowed := true[\s\S]*?v_service_status = 'Cancelled'[\s\S]*?v_final_allowed := false/);
  assert.match(sql, /IF v_occurrences <> 1 THEN[\s\S]*?lifecycle fragment drift/i);
  assert.match(sql, /v_definition := replace\(v_definition, v_old_lifecycle, v_new_lifecycle\);\s+EXECUTE v_definition;/i);
});

test("invoice correction normalizes CRLF before exact fail-closed lifecycle replacement", () => {
  const oldLifecycle = [
    "    ELSIF v_service_status IN ('Completed', 'Cancelled') THEN",
    "        v_deposit_allowed := false;",
    "        v_final_allowed := false;",
  ].join("\r\n");
  const newLifecycle = [
    "    ELSIF v_service_status = 'Completed' THEN",
    "        v_deposit_allowed := false;",
    "        v_final_allowed := true;",
    "    ELSIF v_service_status = 'Cancelled' THEN",
    "        v_deposit_allowed := false;",
    "        v_final_allowed := false;",
  ].join("\n");
  const pgFunctionDefinition = [
    "CREATE FUNCTION public.create_invoice_atomic()",
    ...oldLifecycle.split("\r\n"),
    "END;",
  ].join("\n");

  const replaced = replaceUniqueLifecycleFragment(
    pgFunctionDefinition,
    oldLifecycle,
    newLifecycle,
  );
  assert.match(replaced, /v_service_status = 'Completed'[\s\S]*v_final_allowed := true;/);
  assert.doesNotMatch(replaced, /v_service_status IN \('Completed', 'Cancelled'\)/);

  for (const definition of [
    pgFunctionDefinition.replace(oldLifecycle.replace(/\r\n/g, "\n"), ""),
    `${pgFunctionDefinition}\n${oldLifecycle.replace(/\r\n/g, "\n")}`,
  ]) {
    assert.throws(
      () => replaceUniqueLifecycleFragment(definition, oldLifecycle, newLifecycle),
      /lifecycle fragment drift/,
    );
  }

  assert.match(
    sql,
    /v_definition := replace\(v_definition, E'\\r\\n', E'\\n'\);\s+v_old_lifecycle := replace\(v_old_lifecycle, E'\\r\\n', E'\\n'\);\s+v_new_lifecycle := replace\(v_new_lifecycle, E'\\r\\n', E'\\n'\);/i,
  );
});

test("invoice correction preserves the public signature and service-role grant", () => {
  assert.match(sql, /ALTER FUNCTION public\.create_invoice_atomic\([\s\S]*?\) OWNER TO postgres/i);
  assert.match(sql, /REVOKE ALL ON FUNCTION public\.create_invoice_atomic\([\s\S]*?\) FROM PUBLIC, anon, authenticated/i);
  assert.match(sql, /GRANT EXECUTE ON FUNCTION public\.create_invoice_atomic\([\s\S]*?\) TO service_role/i);
});
