import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
const require = createRequire(import.meta.url);
const sourceRootUrl = new URL("../../", import.meta.url).href;
const { registerHooks } = require("node:module") as {
  registerHooks: (hooks: {
    resolve: (
      specifier: string,
      context: { parentURL?: string },
      nextResolve: (specifier: string, context: { parentURL?: string }) => { url: string; shortCircuit?: true },
    ) => { url: string; shortCircuit?: true };
  }) => void;
};
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith(".") && !specifier.endsWith(".ts") && context.parentURL?.startsWith(sourceRootUrl)) {
      return nextResolve(`${specifier}.ts`, context);
    }
    return nextResolve(specifier, context);
  },
});

const {
  accountingInceptionPackageDetailSchema,
  accountingInceptionPayloadSchema,
} = await import("./schemas.ts");

const migration = readFileSync(
  new URL("../../../supabase/migrations/20260928051314_w10c_inception_reconstruction_coverage_first_trial_balance.sql", import.meta.url),
  "utf8",
);
const rollbackFixture = readFileSync(
  new URL("../../../supabase/verification/w10c_inception_rollback_regression.sql", import.meta.url),
  "utf8",
);
const auditActionCorrection = readFileSync(
  new URL("../../../supabase/migrations/20260928073049_w10c_inception_audit_actions.sql", import.meta.url),
  "utf8",
);
const auditActionBaseline = readFileSync(
  new URL("../../../supabase/migrations/20260928000819_w10b_journal_audit_actions.sql", import.meta.url),
  "utf8",
);
const inceptionRuleNameCorrection = readFileSync(
  new URL("../../../supabase/migrations/20260928090027_w10c_inception_rule_name_precedence.sql", import.meta.url),
  "utf8",
);

const evidenceId = "00000000-0000-4000-8000-00000000c861";
const itemId = "00000000-0000-4000-8000-00000000c851";
const accountId = "00000000-0000-4000-8000-00000000c821";
const periodId = "00000000-0000-4000-8000-00000000c820";
const userId = "00000000-0000-4000-8000-00000000c811";
const profileId = "00000000-0000-4000-8000-00000000c800";
const packageId = "00000000-0000-4000-8000-00000000c840";

function payload() {
  return {
    accounting_start_date: "2501-01-01",
    cutover_boundary_date: "2501-01-31",
    evidence_inventory: [{
      evidence_id: evidenceId,
      version: 1,
      evidence_type: "BANK_STATEMENT",
      evidence_ref: "synthetic://w10c/bank-statement",
      sha256: "a".repeat(64),
    }],
    reconciliation_references: [{ category: "BANK_CASH", reference: "W10C-SYN-RECON-BANK" }],
    items: [{
      item_id: itemId,
      source_domain: "W10C_SYNTHETIC",
      source_record_key: "W10C-SYN-BANK",
      economic_event_key: "W10C-SYN-BANK-OPENING",
      classification: "OPENING_BALANCE",
      resolution_state: "RESOLVED",
      is_material: true,
      reconciliation_category: "BANK_CASH",
      reconciliation_reference: "W10C-SYN-RECON-BANK",
      party_type: "BANK",
      party_reference: "W10C-SYN-BANK-ACCOUNT",
      evidence_refs: [{ evidence_id: evidenceId, version: 1 }],
      journal: {
        accounting_date: "2501-01-31",
        period_id: periodId,
        period_version: 1,
        description_en: "Synthetic bank opening",
        description_ar: "رصيد افتتاحي اصطناعي",
        lines: [
          { account_id: accountId, account_version: 1, side: "DEBIT", amount_halalah: "100", description_en: "Bank", description_ar: "بنك" },
          { account_id: "00000000-0000-4000-8000-00000000c822", account_version: 1, side: "CREDIT", amount_halalah: "100", description_en: "Equity", description_ar: "حقوق الملكية" },
        ],
      },
    }],
  };
}

test("W10C adds only the inception package, coverage, review, authorization, journal-link, and acceptance records", () => {
  const tables = [...migration.matchAll(/CREATE TABLE public\.(\w+)/g)].map((match) => match[1]);
  assert.deepEqual(tables.sort(), [
    "accounting_inception_acceptances",
    "accounting_inception_coverage",
    "accounting_inception_coverage_versions",
    "accounting_inception_journal_links",
    "accounting_inception_mapping_authorizations",
    "accounting_inception_package_versions",
    "accounting_inception_packages",
    "accounting_inception_reviews",
  ]);

  const rpcNames = [
    "save_accounting_inception_package",
    "review_accounting_inception_package",
    "prepare_accounting_inception_journal",
    "post_accounting_inception_journal",
    "accept_accounting_inception_package",
    "get_accounting_inception_package",
    "list_accounting_inception_packages",
  ];
  const grants = [...migration.matchAll(/GRANT EXECUTE ON FUNCTION public\.(\w+)\(/g)].map((match) => match[1]);
  assert.deepEqual(grants.sort(), [...rpcNames].sort());
  for (const table of tables) {
    assert.match(migration, new RegExp(`ALTER TABLE public\\.${table} ENABLE ROW LEVEL SECURITY;`));
  }
  assert.match(migration, /REVOKE ALL ON TABLE public\.accounting_inception_packages,[\s\S]*?FROM PUBLIC,anon,authenticated,service_role;/);
  assert.match(migration, /accounting:manage_inception','accounting:reconcile_bank'/);
  assert.match(migration, /enabled AND runtime_allow_grantable AND owner_slice='W10C'/);
  assert.doesNotMatch(migration, /INSERT INTO public\.accounting_capability_events\b/i);
  const schemaBootstrap = migration.slice(0, migration.indexOf("CREATE FUNCTION public.guard_accounting_inception_identity"));
  assert.doesNotMatch(schemaBootstrap, /INSERT INTO public\.(?:accounting_profiles|accounting_accounts|accounting_periods|accounting_journals|accounting_inception_packages)\b/i);
  assert.doesNotMatch(migration, /(?:INSERT\s+INTO|UPDATE|DELETE\s+FROM)\s+public\.(?:customers|services|quotations|invoices|payments|supplier_bills|customer_receipts)\b/i);
});

test("W10C audit actions are narrowly scoped and preserve the existing journal action contract", () => {
  const actionValues = (source: string, clauseMarker: string) => {
    const clauseStart = source.indexOf(clauseMarker);
    assert.notEqual(clauseStart, -1, `Missing audit action clause: ${clauseMarker}`);
    const actionStart = source.indexOf("action = ANY (ARRAY[", clauseStart);
    const clauseEnd = source.indexOf("])", actionStart);
    assert.notEqual(actionStart, -1);
    assert.notEqual(clauseEnd, -1);
    return [...source.slice(actionStart, clauseEnd).matchAll(/'([^']+)'::text/g)].map((match) => match[1]);
  };

  assert.deepEqual(
    actionValues(auditActionCorrection, "action = ANY (ARRAY["),
    actionValues(auditActionBaseline, "action = ANY (ARRAY["),
  );
  assert.deepEqual(
    actionValues(auditActionCorrection, "entity_type='accounting_journal'"),
    actionValues(auditActionBaseline, "entity_type='accounting_journal'"),
  );
  assert.match(
    auditActionCorrection,
    /md5\(regexp_replace\(v_definition,'\[\[:space:\]\]','','g'\)\)\s+IS DISTINCT FROM '3d79f812e33f92cd4750630a4e060e06'/,
  );
  assert.match(
    auditActionCorrection,
    /entity_type='accounting_inception_package'\s+AND action = ANY \(ARRAY\['save'::text, 'approve'::text, 'reject'::text, 'prepare'::text, 'accept'::text\]\)/,
  );
});

test("W10C rule-name correction pins the applied source and preserves its function contract", () => {
  const occurrences = (source: string, value: string) => source.split(value).length - 1;
  const englishOld = "left('Inception: '||v_item->'journal'->>'description_en',160)";
  const englishNew = "left('Inception: '||(v_item->'journal'->>'description_en'),160)";
  const arabicOld = "left('افتتاح: '||v_item->'journal'->>'description_ar',160)";
  const arabicNew = "left('افتتاح: '||(v_item->'journal'->>'description_ar'),160)";

  assert.equal(occurrences(migration, englishOld), 1);
  assert.equal(occurrences(migration, arabicOld), 1);
  assert.equal(occurrences(inceptionRuleNameCorrection, englishOld), 1);
  assert.equal(occurrences(inceptionRuleNameCorrection, arabicOld), 1);
  assert.equal(occurrences(inceptionRuleNameCorrection, englishNew), 1);
  assert.equal(occurrences(inceptionRuleNameCorrection, arabicNew), 1);
  assert.match(inceptionRuleNameCorrection, /md5\(v_old_source\) IS DISTINCT FROM '3c01ce111aec7efe68d1bbe8eba0421e'/);
  assert.match(inceptionRuleNameCorrection, /prosecdef IS TRUE AND p\.proleakproof IS FALSE AND p\.proisstrict IS FALSE/);
  assert.match(inceptionRuleNameCorrection, /p\.provolatile='v' AND p\.proparallel='u' AND p\.procost=100 AND p\.prorows=1000/);
  assert.match(inceptionRuleNameCorrection, /CALLED ON NULL INPUT VOLATILE NOT LEAKPROOF SECURITY DEFINER[\s\S]*PARALLEL UNSAFE COST 100 ROWS 1000 SET search_path=pg_catalog, public/);
  assert.match(inceptionRuleNameCorrection, /v_new_contract IS DISTINCT FROM v_old_contract OR v_new_source IS DISTINCT FROM v_expected_source/);
  assert.doesNotMatch(inceptionRuleNameCorrection, /CREATE TABLE|\bGRANT\b|\bREVOKE\b/i);
});

test("W10C preserves immutable package and coverage lineage and gates protected inception posting", () => {
  for (const name of [
    "accounting_inception_package_versions",
    "accounting_inception_coverage_versions",
    "accounting_inception_reviews",
    "accounting_inception_mapping_authorizations",
    "accounting_inception_journal_links",
    "accounting_inception_acceptances",
  ]) {
    assert.match(migration, new RegExp(`BEFORE UPDATE OR DELETE ON public\\.${name}`));
    assert.match(migration, new RegExp(`BEFORE TRUNCATE ON public\\.${name}`));
  }
  assert.match(migration, /'versions',coalesce\(\(SELECT jsonb_agg/);
  assert.match(migration, /'coverage_history',coalesce\(\(SELECT jsonb_agg/);
  assert.match(migration, /'review_history',coalesce\(\(SELECT jsonb_agg/);
  assert.match(migration, /accounting_inception_journal_line_authorized/);
  assert.match(migration, /accounting_inception_journal_link_authorized/);
  assert.match(migration, /v_original\.source_domain=''INCEPTION''/);
  assert.match(migration, /v_source_domain<>'INCEPTION' AND EXISTS/);
  assert.match(migration, /p_journal->>'source_domain' IS DISTINCT FROM 'INCEPTION'/);
  assert.match(rollbackFixture, /unsupported W10C source-domain key/);
  assert.match(migration, /'RECONSTRUCTED_HISTORY','OPENING_BALANCE','POST_CUTOVER_SOURCE','UNRESOLVED'/);
});

test("W10C payload schema requires typed evidence links and disallows duplicate source coverage", () => {
  const valid = payload();
  assert.equal(accountingInceptionPayloadSchema.safeParse(valid).success, true);
  const duplicate = structuredClone(valid);
  duplicate.items.push({ ...duplicate.items[0], item_id: "00000000-0000-4000-8000-00000000c852" });
  assert.equal(accountingInceptionPayloadSchema.safeParse(duplicate).success, false);
  const missingHash = structuredClone(valid);
  delete (missingHash.evidence_inventory[0] as { sha256?: string }).sha256;
  assert.equal(accountingInceptionPayloadSchema.safeParse(missingHash).success, false);
});

test("W10C package detail schema exposes every immutable package, coverage, and review version", () => {
  const currentPayload = payload();
  const version = (n: number, previous: number | null) => ({
    version: n,
    previous_version: previous,
    accounting_start_date: "2501-01-01",
    cutover_boundary_date: "2501-01-31",
    payload: currentPayload,
    payload_fingerprint: "b".repeat(64),
    created_by: userId,
    created_at: "2501-01-01T00:00:00Z",
  });
  const detail = {
    package_id: packageId,
    profile_id: profileId,
    current_version: 2,
    created_at: "2501-01-01T00:00:00Z",
    version: version(2, 1),
    versions: [version(1, null), version(2, 1)],
    coverage_history: [1, 2].map((n) => ({
      coverage_id: "00000000-0000-4000-8000-00000000c841",
      source_domain: "W10C_SYNTHETIC",
      source_record_key: "W10C-SYN-BANK",
      economic_event_key: "W10C-SYN-BANK-OPENING",
      version: n,
      previous_version: n === 1 ? null : 1,
      package_version: n,
      item_id: itemId,
      classification: "OPENING_BALANCE",
      resolution_state: "RESOLVED",
      is_material: true,
      reconciliation_category: "BANK_CASH",
      party_type: "BANK",
      party_reference: "W10C-SYN-BANK-ACCOUNT",
      reconciliation_reference: "W10C-SYN-RECON-BANK",
      evidence_count: 1,
      payload_fingerprint: "c".repeat(64),
      created_by: userId,
      created_at: "2501-01-01T00:00:00Z",
    })),
    review_history: [{
      review_id: "00000000-0000-4000-8000-00000000c842",
      package_version: 2,
      decision: "APPROVE",
      reviewer_user_id: "00000000-0000-4000-8000-00000000c812",
      reason: "Synthetic test",
      reviewed_at: "2501-01-01T00:00:00Z",
    }],
    coverage: [{
      coverage_id: "00000000-0000-4000-8000-00000000c841",
      source_domain: "W10C_SYNTHETIC",
      source_record_key: "W10C-SYN-BANK",
      economic_event_key: "W10C-SYN-BANK-OPENING",
      version: 2,
      item_id: itemId,
      classification: "OPENING_BALANCE",
      resolution_state: "RESOLVED",
      is_material: true,
      reconciliation_category: "BANK_CASH",
      party_type: "BANK",
      party_reference: "W10C-SYN-BANK-ACCOUNT",
      reconciliation_reference: "W10C-SYN-RECON-BANK",
      evidence_count: 1,
    }],
    review: {
      review_id: "00000000-0000-4000-8000-00000000c842",
      decision: "APPROVE",
      reviewer_user_id: "00000000-0000-4000-8000-00000000c812",
      reason: "Synthetic test",
      reviewed_at: "2501-01-01T00:00:00Z",
    },
    acceptance: null,
  };
  const parsed = accountingInceptionPackageDetailSchema.safeParse(detail);
  assert.equal(parsed.success, true, parsed.success ? undefined : parsed.error.message);
  assert.equal(parsed.data?.versions.length, 2);
  assert.equal(parsed.data?.coverage_history.length, 2);
  assert.equal(parsed.data?.review_history[0]?.package_version, 2);
});

test("W10C rollback fixture covers SoD, unresolved blocking, source replay, first TB, and residue", () => {
  assert.match(rollbackFixture, /^-- W10C synthetic DEV regression only\.[\s\S]*?\nBEGIN;/);
  assert.match(rollbackFixture, /v_journal_row record/);
  assert.match(rollbackFixture, /FOR v_journal_row IN SELECT \* FROM pg_temp\.w10c_fixture_journals ORDER BY item_id LOOP/);
  assert.doesNotMatch(rollbackFixture, /FOR v_spec IN SELECT \* FROM pg_temp\.w10c_fixture_journals/);
  assert.match(
    rollbackFixture,
    /'00000000-0000-4000-8000-00000000c812'::uuid,'accounting:prepare_journal','00000000-0000-4000-8000-00000000c841'::uuid/,
  );
  for (const invariant of [
    "unresolved_material_evidence",
    "separation_required",
    "incomplete_coverage",
    "economic_effect_conflict",
    "mapping_invalid",
    "journal_unbalanced",
    "first Trial Balance does not equal the posted inception journals",
    "historical package or coverage version changed",
    "source operational snapshot changed",
  ]) {
    assert.ok(rollbackFixture.includes(invariant), `W10C fixture is missing ${invariant}`);
  }
  assert.match(rollbackFixture, /ROLLBACK;\s*\n\s*DO \$residue_assertion\$/);
  assert.match(rollbackFixture, /W10C rollback fixture residue detected/);
  assert.doesNotMatch(rollbackFixture, /^\s*(?:COMMIT|DROP|TRUNCATE)\b/im);
});
