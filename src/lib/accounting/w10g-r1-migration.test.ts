import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(
  new URL("../../../supabase/migrations/20261015100000_w10g_r1_bank_reconciliation_reads.sql", import.meta.url),
  "utf8",
);

test("W10G-R1 is additive, bounded, read-only, and requires an active user and current provisional profile", () => {
  assert.equal([...migration.matchAll(/CREATE FUNCTION public\./g)].length, 2);
  assert.equal([...migration.matchAll(/pv\.activation_state='DEV_PROVISIONAL'/g)].length, 2);
  assert.equal([...migration.matchAll(/u\.is_active IS TRUE/g)].length, 2);
  assert.equal([...migration.matchAll(/accounting:view/g)].length, 2);
  assert.equal([...migration.matchAll(/accounting:reconcile_bank/g)].length, 2);
  assert.match(migration, /p_limit<1 OR p_limit>500/);
  assert.doesNotMatch(migration, /\b(?:INSERT\s+INTO|UPDATE\s+public\.|DELETE\s+FROM)\b/i);
  assert.doesNotMatch(migration, /account_number|iban|swift_bic|unmasked_display_identity/i);
});

test("W10G-R1 returns masked identity and exact halalah strings through service-role-only RPCs", () => {
  assert.match(migration, /'masked_display_identity',l\.masked_display_identity/);
  assert.match(migration, /opening_balance_halalah'\s*,l\.opening_balance_halalah::text/);
  assert.match(migration, /closing_balance_halalah'\s*,l\.closing_balance_halalah::text/);
  assert.match(migration, /statement_allocated_halalah'\s*,a\.statement_allocated_halalah::text/);
  assert.match(migration, /ledger_allocated_halalah'\s*,a\.ledger_allocated_halalah::text/);
  for (const name of ["list_accounting_bank_bindings", "get_accounting_bank_reconciliation_history"]) {
    assert.match(migration, new RegExp(`REVOKE ALL ON FUNCTION public\\.${name}\\([^;]+FROM PUBLIC,anon,authenticated`));
    assert.match(migration, new RegExp(`GRANT EXECUTE ON FUNCTION public\\.${name}\\([^;]+TO service_role`));
    assert.match(migration, new RegExp(`SET search_path=pg_catalog,public,extensions`));
  }
  assert.match(migration, /statement_batches_truncated/);
  assert.match(migration, /groups_truncated/);
  assert.equal([...migration.matchAll(/LIMIT v_nested_limit/g)].length, 2);
  assert.equal([...migration.matchAll(/OFFSET v_nested_limit LIMIT 1/g)].length, 2);
  assert.match(migration, /'allocations_truncated',EXISTS/);
  assert.match(migration, /'review_history_truncated',EXISTS/);
  assert.match(migration, /latest_review_decision/);
  assert.match(migration, /current_version/);
});
