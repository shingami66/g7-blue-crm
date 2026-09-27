import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(
  new URL("../../../supabase/migrations/20260927220412_w10b_balanced_journal_gl_trial_balance.sql", import.meta.url),
  "utf8",
);
const rollbackFixture = readFileSync(
  new URL("../../../supabase/verification/w10b_journal_core_rollback_regression.sql", import.meta.url),
  "utf8",
);

const w10bTables = [
  "accounting_posting_rules",
  "accounting_posting_rule_versions",
  "accounting_posting_rule_mappings",
  "accounting_journals",
  "accounting_journal_versions",
  "accounting_journal_line_versions",
  "accounting_source_effects",
  "accounting_journal_events",
];

const w10bRpcs = [
  "save_accounting_posting_rule",
  "list_accounting_posting_rules",
  "prepare_accounting_journal",
  "post_accounting_journal",
  "reverse_accounting_journal",
  "get_accounting_journal",
  "get_accounting_general_ledger",
  "get_accounting_trial_balance",
];

test("W10B adds only the bounded journal, posting-rule, source-effect, and event tables", () => {
  const createdTables = [...migration.matchAll(/CREATE TABLE public\.(\w+)/g)].map((match) => match[1]);
  assert.deepEqual(createdTables.sort(), [...w10bTables].sort());
  const grantedRpcs = [...migration.matchAll(/GRANT EXECUTE ON FUNCTION public\.(\w+)\(/g)]
    .map((match) => match[1]);
  assert.deepEqual(grantedRpcs.sort(), [...w10bRpcs].sort());
  assert.doesNotMatch(migration, /CREATE TABLE public\.(?:accounting_(?:invoices|payments|receivables|payables|bank_reconciliation))\b/i);
  const schemaBootstrap = migration.slice(0, migration.indexOf("CREATE FUNCTION public.save_accounting_posting_rule"));
  assert.doesNotMatch(schemaBootstrap, /INSERT INTO public\.(?:accounting_posting_rules|accounting_posting_rule_versions|accounting_posting_rule_mappings|accounting_journals|accounting_journal_versions|accounting_journal_line_versions|accounting_source_effects|accounting_journal_events)\b/i);
  assert.doesNotMatch(migration, /INSERT INTO public\.accounting_capability_events\b/i);
});

test("W10B enables exactly its three journal capabilities and keeps close/reopen disabled", () => {
  assert.match(
    migration,
    /SET enabled=true,runtime_allow_grantable=true\s+WHERE capability IN \('accounting:prepare_journal','accounting:post_journal','accounting:reverse_journal'\)\s+AND owner_slice='W10B'/,
  );
  assert.match(migration, /'accounting:close_period','accounting:reopen_period'\)\s+AND NOT enabled AND NOT runtime_allow_grantable AND owner_slice='W10I'/);
  assert.doesNotMatch(migration, /CREATE FUNCTION public\.(?:close|reopen|lock)_accounting_period\b/i);
  assert.doesNotMatch(migration, /CREATE FUNCTION public\.(?:post|create)_.*(?:invoice|payment|expense|revenue)_journal\b/i);
});

test("W10B preserves RPC-only immutable evidence, exact SAR amounts, and unique source/reversal identities", () => {
  for (const table of w10bTables) {
    assert.match(migration, new RegExp(`ALTER TABLE public\\.${table} ENABLE ROW LEVEL SECURITY;`));
  }
  assert.match(
    migration,
    /REVOKE ALL ON TABLE public\.accounting_posting_rules,public\.accounting_posting_rule_versions,[\s\S]*?FROM PUBLIC,anon,authenticated,service_role;/,
  );
  assert.match(migration, /amount_halalah bigint NOT NULL CHECK\(amount_halalah>0\)/);
  assert.match(migration, /currency text NOT NULL DEFAULT 'SAR' CHECK\(currency='SAR'\)/);
  assert.match(migration, /ACCOUNTING_JOURNAL_VERSION_APPEND_ONLY/);
  assert.match(migration, /UNIQUE\(profile_id,source_domain,source_record_key,economic_event_key,posting_purpose\)/);
  assert.match(migration, /UNIQUE\(profile_id,reversal_of_journal_id\)/);
  assert.match(migration, /ACCOUNTING_JOURNAL_UNBALANCED/);
  assert.match(migration, /ACCOUNTING_JOURNAL_ACCOUNT_INVALID/);
  assert.match(migration, /get_accounting_capability\(p_actor_user_id,'accounting:prepare_journal'\)/);
  assert.match(migration, /get_accounting_capability\(p_actor_user_id,'accounting:post_journal'\)/);
  assert.match(migration, /get_accounting_capability\(p_actor_user_id,'accounting:reverse_journal'\)/);
});

test("posting and inspection use the current OPEN period and recorded-time cutoff", () => {
  assert.match(migration, /ADD CONSTRAINT accounting_period_versions_status_check\s+CHECK \(status IN \('OPEN','CLOSED','LOCKED'\)\)/);
  assert.match(migration, /period_not_open/);
  assert.match(migration, /pg_advisory_xact_lock\([\s\S]*?'w10a2a-period:'/);
  assert.ok((migration.match(/v\.posted_at<=v_cutoff/g) ?? []).length >= 4);
  assert.match(migration, /v\.accounting_date BETWEEN p_from_date AND p_through_date/);
  assert.match(migration, /v\.accounting_date<=p_as_of_date/);
  assert.match(migration, /p_offset>50000/);
  assert.match(migration, /p_limit>500/);
  assert.match(migration, /v\.status='POSTED'/);
});

test("rollback fixture exercises W10B invariants and checks all synthetic evidence after rollback", () => {
  assert.match(rollbackFixture, /^-- W10B synthetic DEV regression only\.[\s\S]*?\nBEGIN;/);
  for (const invariant of [
    "journal_unbalanced",
    "economic_effect_conflict",
    "account_not_posting",
    "period_not_open",
    "already_reversed",
    "pre-reversal Trial Balance does not reconcile",
    "post-reversal Trial Balance did not net to zero",
  ]) {
    assert.ok(rollbackFixture.includes(invariant), `rollback fixture is missing ${invariant}`);
  }
  assert.match(rollbackFixture, /ROLLBACK;\s*\n\s*DO \$residue_assertion\$/);
  assert.match(rollbackFixture, /fresh post request did not preserve posted revision conflict/);
  assert.match(rollbackFixture, /fresh post conflict recorded a false replay event/);
  assert.match(rollbackFixture, /accounting_posting_rule_versions/);
  assert.match(rollbackFixture, /accounting_journal_line_versions/);
  assert.match(rollbackFixture, /accounting_foundation_events/);
  assert.match(rollbackFixture, /accounting_journal_events/);
  assert.match(rollbackFixture, /W10B rollback fixture residue detected/);
  assert.doesNotMatch(rollbackFixture, /^\s*(?:COMMIT|DROP|TRUNCATE)\b/im);
});
