import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(
  new URL("../../../supabase/migrations/20261014071434_aar_d5_capability_assignment_read_repair.sql", import.meta.url),
  "utf8",
);
const originalMigration = readFileSync(
  new URL("../../../supabase/migrations/20260927084815_w10a1_accounting_authority_profile_foundation.sql", import.meta.url),
  "utf8",
);

function extractListFunction(source: string, createPattern: string): string {
  const start = source.indexOf(createPattern);
  assert.notEqual(start, -1, `Expected ${createPattern}`);
  const end = source.indexOf("$list$;", start);
  assert.notEqual(end, -1, "Expected end of assignment-list function");
  return source.slice(start, end + "$list$;".length);
}

function normalizeSql(source: string): string {
  return source.replace(/\s+/g, " ").trim();
}

const repairedFunction = extractListFunction(
  migration,
  "CREATE OR REPLACE FUNCTION public.list_accounting_capability_assignments",
);
const originalFunction = extractListFunction(
  originalMigration,
  "CREATE FUNCTION public.list_accounting_capability_assignments",
);

test("AAR-D5 migration replaces only the existing capability assignment reader", () => {
  assert.deepEqual(
    [...migration.matchAll(/CREATE(?: OR REPLACE)? FUNCTION public\.(\w+)/g)].map((match) => match[1]),
    ["list_accounting_capability_assignments"],
  );
  assert.doesNotMatch(migration, /\b(?:CREATE|ALTER|DROP)\s+(?:TABLE|POLICY|TRIGGER|INDEX)\b/i);
  assert.doesNotMatch(migration, /\b(?:INSERT|UPDATE|DELETE|TRUNCATE|GRANT|REVOKE)\b/i);
  assert.match(migration, /^--[\s\S]*?\nBEGIN;/);
  assert.match(migration, /COMMIT;\s*$/);

  const expectedFunction = originalFunction
    .replace("CREATE FUNCTION public.list_accounting_capability_assignments", "CREATE OR REPLACE FUNCTION public.list_accounting_capability_assignments")
    .replace(" AND c.owner_slice='W10A1'", "");
  assert.equal(normalizeSql(repairedFunction), normalizeSql(expectedFunction));
});

test("assignment read keeps its signature, result shape, authority checks, latest revision, and ordering", () => {
  assert.match(repairedFunction, /list_accounting_capability_assignments\(p_actor_user_id uuid,p_target_user_id uuid\)/);
  assert.match(repairedFunction, /RETURNS TABLE\(capability text,effect text,revision integer,expires_at timestamptz,actor_user_id uuid,created_at timestamptz\)/);
  assert.match(repairedFunction, /LANGUAGE plpgsql SECURITY DEFINER/);
  assert.match(repairedFunction, /SET search_path=pg_catalog,public/);
  assert.match(repairedFunction, /u\.id=p_actor_user_id AND u\.is_active IS TRUE FOR SHARE/);
  assert.match(repairedFunction, /get_accounting_capability\(p_actor_user_id,'accounting:manage_authority'\)/);
  assert.match(repairedFunction, /u\.id=p_target_user_id/);
  assert.match(repairedFunction, /e\.revision=\(SELECT max\(latest\.revision\)/);
  assert.match(repairedFunction, /ORDER BY e\.capability/);
  assert.match(repairedFunction, /ON c\.capability=e\.capability AND c\.enabled\s+WHERE/);
  assert.doesNotMatch(repairedFunction, /owner_slice|runtime_allow_grantable/);
});

test("latest assignments from enabled W10A2, W10B, W10C, and W10I capabilities remain eligible", () => {
  const cases = [
    { slice: "W10A2", capability: "accounting:manage_chart" },
    { slice: "W10B", capability: "accounting:post_journal" },
    { slice: "W10C", capability: "accounting:manage_inception" },
    { slice: "W10I", capability: "accounting:close_period" },
  ] as const;
  const catalog = new Map(cases.map((entry) => [entry.capability, { enabled: true, owner_slice: entry.slice }]));
  const events = cases.flatMap((entry) => [
    { capability: entry.capability, effect: "DENY", revision: 1 },
    { capability: entry.capability, effect: "ALLOW", revision: 2 },
  ]);

  const eligibility = repairedFunction.match(/JOIN public\.accounting_capability_catalog c\s+ON ([\s\S]*?)\s+WHERE/)?.[1];
  assert.equal(normalizeSql(eligibility ?? ""), "c.capability=e.capability AND c.enabled");
  const returnedLatest = events
    .filter((event) => catalog.get(event.capability)?.enabled)
    .filter((event) => event.revision === Math.max(...events.filter((candidate) => candidate.capability === event.capability).map((candidate) => candidate.revision)))
    .sort((left, right) => left.capability.localeCompare(right.capability));

  assert.deepEqual(returnedLatest.map(({ capability, effect, revision }) => ({ capability, effect, revision })),
    [...cases]
      .map(({ capability }) => ({ capability, effect: "ALLOW", revision: 2 }))
      .sort((left, right) => left.capability.localeCompare(right.capability)),
  );
});
