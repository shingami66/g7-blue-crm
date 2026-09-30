import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(
  new URL("../../../supabase/migrations/20260930065506_w10g_bank_reconciliation_foundation.sql", import.meta.url),
  "utf8",
);
const fixture = readFileSync(
  new URL("../../../supabase/verification/w10g_bank_reconciliation_rollback_regression.sql", import.meta.url),
  "utf8",
);
const repairMigration = readFileSync(
  new URL("../../../supabase/migrations/20260930071124_w10g_reconciliation_event_identity_repair.sql", import.meta.url),
  "utf8",
);
const aclRepairMigration = readFileSync(
  new URL("../../../supabase/migrations/20260930072210_w10g_reversal_helper_acl_repair.sql", import.meta.url),
  "utf8",
);

const predecessorGuardMigration = readFileSync(
  new URL("../../../supabase/migrations/20260930073518_w10g_reversal_helper_predecessor_guard.sql", import.meta.url),
  "utf8",
);
const reconciliationSchema = readFileSync(
  new URL("./schemas.ts", import.meta.url),
  "utf8",
);
const reconciliationTypes = readFileSync(
  new URL("./types.ts", import.meta.url),
  "utf8",
);

const tables = [
  "accounting_bank_bindings",
  "accounting_bank_binding_versions",
  "accounting_bank_binding_reviews",
  "accounting_bank_statement_batches",
  "accounting_bank_statement_batch_versions",
  "accounting_bank_statement_lines",
  "accounting_bank_statement_line_versions",
  "accounting_bank_reconciliation_groups",
  "accounting_bank_reconciliation_group_versions",
  "accounting_bank_reconciliation_allocations",
  "accounting_bank_reconciliation_reviews",
];

test("W10G creates only the bounded append-only bank reconciliation tables and RPCs", () => {
  const created = [...migration.matchAll(/CREATE TABLE public\.(\w+)/g)].map(([, name]) => name).sort();
  assert.deepEqual(created, [...tables].sort());
  for (const name of [
    "save_accounting_bank_binding",
    "review_accounting_bank_binding",
    "save_accounting_bank_statement_batch",
    "save_accounting_bank_statement_line",
    "prepare_accounting_bank_reconciliation",
    "review_accounting_bank_reconciliation",
    "unmatch_accounting_bank_reconciliation",
    "get_accounting_bank_reconciliation",
  ]) assert.match(migration, new RegExp(`CREATE OR REPLACE FUNCTION public\\.${name}\\b`));
  assert.match(migration, /accounting:reconcile_bank/);
  assert.match(migration, /SET enabled=true,runtime_allow_grantable=true/);
  assert.match(migration, /source_domain|CREATE TABLE public\.accounting_bank_reconciliation/);
  assert.doesNotMatch(migration, /CREATE TABLE public\.accounting_(?:invoices|payments|bank_accounts)\b/i);
  assert.doesNotMatch(migration, /INSERT INTO public\.accounting_journal(?:_versions|_line_versions)?\b/i);
});

test("W10G enforces evidence, cutoff, immutable history, RLS and service-role-only RPC access", () => {
  assert.match(migration, /ALTER TABLE public\.accounting_bank_binding_versions FORCE ROW LEVEL SECURITY/);
  assert.match(migration, /ALTER TABLE public\.accounting_bank_reconciliation_reviews FORCE ROW LEVEL SECURITY/);
  assert.match(migration, /REVOKE ALL ON public\.accounting_bank_bindings[\s\S]*FROM anon,authenticated,service_role/);
  assert.match(migration, /GRANT EXECUTE ON FUNCTION public\.get_accounting_bank_reconciliation/);
  assert.match(migration, /BEFORE UPDATE OR DELETE ON public\.accounting_bank_reconciliation_allocations/);
  assert.match(migration, /evidence_sha256/);
  assert.match(migration, /p_recorded_at_cutoff/);
  assert.match(migration, /jv\.posted_at/);
  assert.match(migration, /p_recorded_at_cutoff/);
  assert.match(migration, /recorded_at>p_recorded_at_cutoff/);
  assert.match(migration, /accounting_bank_reconciliation_reversal_impact/);
  assert.match(migration, /IMPACT_REVIEW_REQUIRED/);
  assert.match(migration, /FI-012|timing_difference_halalah/);
});

test("W10G fixture is rollback-only and names the required regression categories", () => {
  assert.match(fixture, /^-- W10G synthetic DEV regression only\.[\s\S]*?\nBEGIN;/);
  assert.match(fixture, /ROLLBACK;\s+DO \$w10g_residue_assertion\$/);
  assert.match(fixture, /accounting:reconcile_bank/);
  assert.match(fixture, /bank reconciliation must not post journals/);
  assert.match(fixture, /reverse_accounting_journal/);
  assert.match(fixture, /IMPACT_REVIEW_REQUIRED/);
  const categories = [
    "binding eligibility", "binding review separation", "statement evidence", "duplicate candidate",
    "positive and negative lines", "posted ledger only", "one-to-one", "split match", "many-to-one", "many-to-many",
    "partial match", "over-allocation", "double-match", "sign mismatch", "independent review", "rejected review",
    "unmatch", "rematch", "reversal impact", "FI-012 cutoff", "old cutoff", "later statement excluded",
    "fee adjustment", "interest adjustment", "unknown adjustment", "operational payment", "opening and closing math",
    "request replay", "revision conflict", "capability disabled", "wildcard denied", "direct DML denied",
    "RLS forced", "RPC ACL", "no new source domain", "no auto journal", "ledger unchanged", "trial balance unchanged",
    "rollback residue", "coverage lock", "immutable history", "SAR only", "effective dating", "masked identity",
    "evidence hash", "statement duplicate hash", "timestamp cutoff", "allocation rationale", "bounded read model",
    "adjustment required",
  ];
  for (const category of categories) assert.ok(fixture.includes(`W10G CASE: ${category}`), `missing ${category}`);
  assert.equal(categories.length, 50);
});

test("W10G additive repair gives review lifecycle events distinct immutable identities", () => {
  assert.match(repairMigration, /CREATE SEQUENCE public\.accounting_bank_reconciliation_event_version_seq/);
  assert.match(repairMigration, /nextval\('public\.accounting_bank_reconciliation_event_version_seq'\)/);
  assert.match(repairMigration, /accounting_bank_reconciliation_reviewed/);
  assert.match(repairMigration, /accounting_bank_reconciliation_unmatched/);
  assert.doesNotMatch(repairMigration, /DROP TABLE|DROP FUNCTION|migration repair/i);
});

test("W10G reversal-impact helper is owner-only", () => {
  assert.match(aclRepairMigration, /REVOKE ALL ON FUNCTION public\.accounting_bank_reconciliation_reversal_impact\(\)/);
  assert.match(aclRepairMigration, /FROM PUBLIC,anon,authenticated,service_role/);
});


test("W10G read model preserves not-initialized and string halalah contracts", () => {
  assert.match(reconciliationSchema, /state: z\.literal\("NOT_INITIALIZED"\)[\s\S]*bank_reconciled: z\.literal\(false\)/);
  assert.match(reconciliationSchema, /const accountingBankAmountSchema[\s\S]*\.transform\(String\)/);
  assert.match(reconciliationSchema, /accountingBankReadRowMoneyKeys[\s\S]*Number\.isSafeInteger[\s\S]*Object\.fromEntries/);
  assert.match(reconciliationTypes, /state: "NOT_INITIALIZED"; binding_id: string; bank_reconciled: false/);
  assert.match(reconciliationTypes, /statement_opening_balance_halalah\?: string/);
});

test("W10G final helper repair guards the exact predecessor and postflight contract", () => {
  assert.match(predecessorGuardMigration, /helper predecessor contract is not the expected deployed implementation/);
  assert.match(predecessorGuardMigration, /NEW\.reversal_of_journal_id IS NULL OR NEW\.status<>''POSTED''/);
  assert.match(predecessorGuardMigration, /helper postflight metadata or source contract changed/);
  assert.match(predecessorGuardMigration, /has_function_privilege\('service_role'/);
});
