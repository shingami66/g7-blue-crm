import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { test } from "node:test";

const migrationsDirectory = join(process.cwd(), "supabase/migrations");
const migrationPath = process.env.R01_MIGRATION_SOURCE
  ? resolve(process.env.R01_MIGRATION_SOURCE)
  : join(
      migrationsDirectory,
      readdirSync(migrationsDirectory).find((file) => /_r01_percentage_discount\.sql$/.test(file)) ??
        "__missing_r01_percentage_discount_migration__.sql",
    );
const migration = readFileSync(migrationPath, "utf8");

function resolveDiscountHalalas(eligibleBaseHalalas: bigint, basisPoints: number): bigint {
  assert.ok(eligibleBaseHalalas >= BigInt(0));
  assert.ok(Number.isInteger(basisPoints) && basisPoints >= 0 && basisPoints <= 10_000);
  return (eligibleBaseHalalas * BigInt(basisPoints) + BigInt(5_000)) / BigInt(10_000);
}

test("R01 migration is additive and preserves existing fixed-SAR amounts", () => {
  const schema = migration.slice(0, migration.indexOf("CREATE OR REPLACE FUNCTION"));
  assert.match(schema, /ADD COLUMN discount_type text NOT NULL DEFAULT 'fixed_sar'/);
  assert.match(schema, /ADD COLUMN discount_percentage_bps smallint NULL/);
  assert.match(schema, /discount_type = 'fixed_sar' AND discount_percentage_bps IS NULL/);
  assert.match(schema, /discount_type = 'percentage' AND discount_percentage_bps IS NOT NULL/);
  assert.match(schema, /discount_percentage_bps BETWEEN 0 AND 10000/);
  assert.doesNotMatch(schema, /UPDATE\s+public\.quotations\b/i);
  assert.doesNotMatch(schema, /CREATE\s+TABLE\b/i);
});

test("R01 uses one exact header-level percentage resolution and the W2C eligible base", () => {
  assert.match(
    migration,
    /round\(p_eligible_base_h \* p_discount_percentage_bps::numeric \/ 10000, 0\)/,
  );
  assert.match(migration, /commercial_role = 'authority_line'/);
  assert.match(migration, /commercial_role = 'optional_add_on' AND qi\.is_selected = true/);
  assert.match(migration, /parent\.commercial_role = 'authority_line'/);
  assert.match(migration, /Included Components and unselected add-ons/);
  assert.equal((migration.match(/reconcile_quotation_discount_allocations\(/g) ?? []).length > 1, true);
  assert.doesNotMatch(migration, /CREATE OR REPLACE FUNCTION public\.reconcile_quotation_discount_allocations/i);
});

test("R01 arithmetic is deterministic for representative rates and halala boundaries", () => {
  const cases: Array<[bigint, number, bigint]> = [
  [BigInt(10_000), 0, BigInt(0)],
  [BigInt(10_000), 500, BigInt(500)],
  [BigInt(10_000), 750, BigInt(750)],
  [BigInt(1_500_000), 1_225, BigInt(183_750)],
  [BigInt(10_000), 10_000, BigInt(10_000)],
  [BigInt(1), 4_999, BigInt(0)],
  [BigInt(1), 5_000, BigInt(1)],
  [BigInt(1), 5_001, BigInt(1)],
  ];
  for (const [base, rate, expected] of cases) {
    assert.equal(resolveDiscountHalalas(base, rate), expected);
  }
  for (const rate of [0, 500, 750, 1_225, 10_000, 10_001]) {
    assert.match(migration, new RegExp(`${rate}::smallint`));
  }
});

test("R01 request validation rejects non-integer and out-of-range basis points", () => {
  assert.match(migration, /v_discount_percentage_input <> trunc\(v_discount_percentage_input\)/);
  assert.match(migration, /v_discount_percentage_input < 0 OR v_discount_percentage_input > 10000/);
  assert.match(migration, /percentage mode without basis points/);
  assert.match(migration, /fixed mode with basis points/);
  assert.match(migration, /fixed_sar' AND discount_percentage_bps IS NULL/);
});

test("R01 percentage creation identity excludes client amount and fixed retries retain legacy payload", () => {
  const create = migration.slice(
    migration.indexOf("CREATE OR REPLACE FUNCTION public.create_flexible_quotation_with_items"),
    migration.indexOf("CREATE OR REPLACE FUNCTION public.update_flexible_quotation_draft"),
  );
  assert.match(create, /'discount', v_discount,[\s\S]*?'items', v_canonical_payload[\s\S]*?IF v_discount_type = 'percentage'/);
  assert.match(create, /'discount_type', v_discount_type,[\s\S]*?'discount_percentage_bps', v_discount_percentage_bps,[\s\S]*?'discount', NULL/);
  assert.match(create, /v_existing\.mutation_payload = v_canonical_payload/);
  assert.match(create, /mutation_key_conflict/);
});

test("R01 copies terms through successors and validates approval without replacing W2C or ABS allocation", () => {
  assert.match(migration, /v_source\.discount_type, v_source\.discount_percentage_bps/);
  assert.match(migration, /v_source\.discount, v_source\.discount_type, v_source\.discount_percentage_bps/);
  assert.match(migration, /quotation_discount_terms_consistent\(v_quotation\.id\)/);
  assert.match(migration, /quotation_discount_terms_consistent\(v_source\.id\)/);
  assert.match(migration, /quotation_discount_terms_consistent\(v_successor\.id\)/);
  assert.match(migration, /AND v_source\.discount_type IS NOT DISTINCT FROM v_successor\.discount_type/);
  assert.match(migration, /AND v_source\.discount_percentage_bps IS NOT DISTINCT FROM v_successor\.discount_percentage_bps/);
  const replacedFunctions = [...migration.matchAll(/CREATE OR REPLACE FUNCTION public\.([a-z_]+)\(/gi)]
    .map((match) => match[1])
    .sort();
  assert.deepEqual(replacedFunctions, [
    "approve_approved_commercial_amendment",
    "approve_quotation_and_activate_internal_abs",
    "create_approved_commercial_amendment",
    "create_flexible_quotation_with_items",
    "create_quotation_revision",
    "quotation_discount_terms_consistent",
    "quotation_eligible_discount_base_h",
    "resolve_quotation_discount",
    "update_approved_commercial_amendment_draft",
    "update_flexible_quotation_draft",
  ]);
});

test("R01 guards exact source and security metadata before replacing current RPCs", () => {
  assert.match(migration, /r01 source guard: flexible create drift/);
  assert.match(migration, /r01 source guard: flexible update drift/);
  assert.match(migration, /r01 source guard: quotation revision drift/);
  assert.match(migration, /r01 source guard: amendment creation drift/);
  assert.match(migration, /p\.provolatile <> 'v'/);
  assert.match(migration, /p\.proparallel <> 'u'/);
  assert.match(migration, /p\.procost <> 100/);
  assert.match(migration, /p\.prorows <> CASE WHEN p\.proname = 'reconcile_quotation_discount_allocations' THEN 0 ELSE 1000 END/);
  assert.match(migration, /p\.proacl::text IS DISTINCT FROM '\{postgres=X\/postgres,service_role=X\/postgres\}'/);
  assert.match(migration, /r01 postflight: existing function security metadata or ACL changed/);
});
