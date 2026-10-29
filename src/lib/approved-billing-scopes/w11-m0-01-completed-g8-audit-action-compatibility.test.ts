import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const correctiveMigration = readFileSync(
  new URL("../../../supabase/migrations/20261029045141_w11_m0_01_completed_g8_audit_action_compatibility.sql", import.meta.url),
  "utf8",
);
const failedMigration = readFileSync(
  new URL("../../../supabase/migrations/20261028113055_w11_m0_01_completed_g8_abs_retirement.sql", import.meta.url),
  "utf8",
);
const prior14Migration = readFileSync(
  new URL("../../../supabase/migrations/20261027102347_w11_m0_01_14_approved_abs_retirement.sql", import.meta.url),
  "utf8",
);
const correctedPostflight = readFileSync(
  new URL("../../../supabase/verification/w11m0_01_completed_g8_postflight.sql", import.meta.url),
  "utf8",
);

function extractBody(source, signature) {
  const start = source.indexOf(signature);
  assert.notEqual(start, -1, "missing " + signature);
  const bodyStart = source.indexOf("AS $function$", start);
  assert.notEqual(bodyStart, -1, "missing body delimiter for " + signature);
  const contentStart = bodyStart + "AS $function$".length;
  const end = source.indexOf("$function$;", contentStart);
  assert.notEqual(end, -1, "missing function terminator for " + signature);
  return source.slice(contentStart, end);
}

const failedRpc = extractBody(
  failedMigration,
  "CREATE FUNCTION public.retire_w11_m0_01_completed_g8_abs(p_owner_actor_id text)",
);
const correctedRpc = extractBody(
  correctiveMigration,
  "CREATE OR REPLACE FUNCTION public.retire_w11_m0_01_completed_g8_abs(p_owner_actor_id text)",
);

function expectedCorrectiveBody() {
  let expected = failedRpc;
  const replaceOnce = (before, after) => {
    assert.equal(expected.split(before).length - 1, 1, "expected one prior fragment: " + before);
    expected = expected.replace(before, after);
  };

  replaceOnce(
    "v_authorization_ref constant text := 'OWNER AUTHORIZATION — FINAL M0-01 COMPLETED G8 DEV REPAIR';",
    "v_authorization_ref constant text := 'OWNER AUTHORIZATION — CORRECTIVE MIGRATION AND SINGLE RETRY FOR FINAL M0-01 CASE';",
  );

  assert.equal(
    (expected.match(/\n[ \t]*OR al\.action = 'owner_authorized_remediation'/g) || []).length,
    1,
    "expected one incompatible action guard",
  );
  expected = expected.replace(/\n[ \t]*OR al\.action = 'owner_authorized_remediation'/g, "");
  assert.equal(
    (expected.match(/al\.action = 'owner_authorized_remediation'/g) || []).length,
    3,
    "expected three replay/postcondition action comparisons",
  );
  expected = expected.replace(/al\.action = 'owner_authorized_remediation'/g, "al.action = 'status_change'");
  replaceOnce("        'owner_authorized_remediation',", "        'status_change',");

  const detailsLine = /^([ \t]*)'actor_context', 'Owner-authorized DEV remediation',$/gm;
  assert.equal([...expected.matchAll(detailsLine)].length, 3, "expected three audit details builders");
  expected = expected.replace(detailsLine, (_line, indent) => [
    `${indent}'actor_id', v_owner_actor_id,`,
    `${indent}'actor_context', 'Owner-authorized DEV remediation',`,
    `${indent}'transaction_timestamp', v_now,`,
    `${indent}'provenance_classification', 'synthetic G8 DEV verification provenance VERIFIED',`,
    `${indent}'historical_completed_mechanism', 'UNKNOWN',`,
    `${indent}'historical_financial_impact', 'UNKNOWN',`,
    `${indent}'commercial_authority', 'SAR 800.00 was commercial authority only',`,
  ].join("\n"));

  return expected;
}

test("the corrective RPC changes only the failed audit contract and current authorization reference", () => {
  assert.equal(correctedRpc, expectedCorrectiveBody());
});

test("the remediation audit uses a supported action and preserves explicit synthetic provenance", () => {
  assert.doesNotMatch(correctedRpc, /owner_authorized_remediation/);
  assert.match(correctedRpc, /INSERT INTO public\.audit_logs\(action, entity_type, entity_id, user_id, details, timestamp\)[\s\S]*?'status_change',\s*'approved_billing_scope'/);
  assert.match(correctedRpc, /approved_billing_scope_m0_01_completed_g8_owner_authorized_retirement/);
  assert.equal((correctedRpc.match(/'transaction_timestamp', v_now/g) || []).length, 3);
  assert.equal((correctedRpc.match(/'provenance_classification', 'synthetic G8 DEV verification provenance VERIFIED'/g) || []).length, 3);
  assert.equal((correctedRpc.match(/'historical_completed_mechanism', 'UNKNOWN'/g) || []).length, 3);
  assert.equal((correctedRpc.match(/'historical_financial_impact', 'UNKNOWN'/g) || []).length, 3);
  assert.equal((correctedRpc.match(/'commercial_authority', 'SAR 800\.00 was commercial authority only'/g) || []).length, 3);
  assert.match(correctedRpc, /'actor_id', v_owner_actor_id/);
  assert.match(correctedRpc, /OWNER AUTHORIZATION — CORRECTIVE MIGRATION AND SINGLE RETRY FOR FINAL M0-01 CASE/);
});

test("the migration does not widen the audit constraint or execute business-data DML", () => {
  assert.doesNotMatch(correctiveMigration, /ALTER\s+TABLE|ADD\s+CONSTRAINT|DROP\s+CONSTRAINT/i);
  assert.doesNotMatch(correctiveMigration, /GRANT\s+(?:SELECT|INSERT|UPDATE|DELETE|ALL)\s+ON\b/i);
  assert.equal((correctiveMigration.match(/CREATE OR REPLACE FUNCTION/g) || []).length, 1);
  assert.doesNotMatch(correctiveMigration, /CREATE\s+(?:TRIGGER|TABLE)\b/i);
  const outsideRpc = correctiveMigration.replace(
    /CREATE OR REPLACE FUNCTION public\.retire_w11_m0_01_completed_g8_abs\(p_owner_actor_id text\)[\s\S]*?\$function\$;/,
    "",
  );
  assert.doesNotMatch(outsideRpc, /^\s*(?:INSERT\s+INTO|UPDATE\s+public\.|DELETE\s+FROM|TRUNCATE)\b/gim);
  assert.doesNotMatch(outsideRpc, /SELECT\s+public\.retire_w11_m0_01_completed_g8_abs\s*\(/i);
  assert.match(correctiveMigration, /audit_logs_action_check/);
  assert.match(correctiveMigration, /position\('status_change' IN v_constraint_definition\)/);
});

test("the fixed target, service-role boundary, atomic postconditions, and 14-case mechanism remain intact", () => {
  assert.match(correctiveMigration, /CREATE OR REPLACE FUNCTION public\.retire_w11_m0_01_completed_g8_abs\(p_owner_actor_id text\)\s+RETURNS jsonb\s+LANGUAGE plpgsql\s+SECURITY DEFINER\s+SET search_path = pg_catalog, public\s+AS \$function\$/);
  assert.doesNotMatch(correctedRpc, /p_(?:service|quotation|abs)_id|p_amount|p_reason|p_target/i);
  assert.match(correctedRpc, /public\._w11_m0_01_completed_g8_targets\(\)/);
  assert.match(correctedRpc, /public\._w11_m0_01_completed_g8_downstream_link_counts\(\)/);
  assert.match(correctedRpc, /idempotent_replay', true/);
  assert.match(correctedRpc, /idempotent_replay', false/);
  assert.match(correctedRpc, /w11_m0_01_completed_g8_prior_state_mismatch/);
  assert.match(correctedRpc, /w11_m0_01_completed_g8_audit_postcondition_mismatch/);
  assert.match(correctedRpc, /retired_count', 1/);
  const lockMarkers = [
    "PERFORM s.id",
    "PERFORM sl.service_id",
    "PERFORM c.id",
    "PERFORM q.id",
    "PERFORM a.id",
    "PERFORM i.id",
  ].map((marker) => correctedRpc.indexOf(marker));
  assert.ok(lockMarkers.every((position) => position >= 0));
  assert.deepEqual([...lockMarkers].sort((a, b) => a - b), lockMarkers);
  assert.match(correctiveMigration, /REVOKE ALL ON FUNCTION public\.retire_w11_m0_01_completed_g8_abs\(text\) FROM PUBLIC, anon, authenticated/);
  assert.match(correctiveMigration, /GRANT EXECUTE ON FUNCTION public\.retire_w11_m0_01_completed_g8_abs\(text\) TO service_role/);
  assert.doesNotMatch(correctiveMigration, /CREATE OR REPLACE FUNCTION public\.retire_w11_m0_01_approved_abs/);
  assert.match(prior14Migration, /'status_change'/);
  assert.doesNotMatch(correctiveMigration, /ALTER\s+TABLE\s+public\.audit_logs/i);
});

test("the read-only postflight verifies the corrected action and exact structured audit details", () => {
  assert.match(correctedPostflight, /WHERE al\.action = 'status_change'\s+AND al\.entity_type = 'approved_billing_scope'/);
  assert.doesNotMatch(correctedPostflight, /owner_authorized_remediation/);
  assert.match(correctedPostflight, /OWNER AUTHORIZATION — CORRECTIVE MIGRATION AND SINGLE RETRY FOR FINAL M0-01 CASE/);
  assert.doesNotMatch(correctedPostflight, /OWNER AUTHORIZATION — FINAL M0-01 COMPLETED G8 DEV REPAIR/);
  for (const detail of [
    "'actor_id', e.actor_id",
    "'transaction_timestamp', e.recorded_at",
    "'provenance_classification', 'synthetic G8 DEV verification provenance VERIFIED'",
    "'historical_completed_mechanism', 'UNKNOWN'",
    "'historical_financial_impact', 'UNKNOWN'",
    "'commercial_authority', 'SAR 800.00 was commercial authority only'",
  ]) {
    assert.ok(correctedPostflight.includes(detail), "missing postflight detail: " + detail);
  }
});
