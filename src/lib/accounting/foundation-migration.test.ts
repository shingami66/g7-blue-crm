import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(
  new URL(
    "../../../supabase/migrations/20260927084815_w10a1_accounting_authority_profile_foundation.sql",
    import.meta.url,
  ),
  "utf8",
);
const rollbackFixture = readFileSync(
  new URL(
    "../../../supabase/verification/w10a1_accounting_authority_profile_rollback_regression.sql",
    import.meta.url,
  ),
  "utf8",
);

const expectedTables = [
  "accounting_profiles",
  "accounting_profile_versions",
  "accounting_capability_catalog",
  "accounting_capability_events",
  "accounting_foundation_events",
];

const expectedPublicFunctions = [
  "get_accounting_capability",
  "get_accounting_profile",
  "list_accounting_capability_assignments",
  "set_accounting_capability",
  "update_accounting_profile",
];

test("W10A1 creates only its five authorized accounting tables and five public RPCs", () => {
  const tables = [...migration.matchAll(/CREATE TABLE public\.(\w+)/g)].map((match) => match[1]);
  assert.deepEqual(tables.sort(), [...expectedTables].sort());

  const publicFunctions = [...migration.matchAll(/CREATE FUNCTION public\.(\w+)/g)].map((match) => match[1]);
  assert.deepEqual(
    publicFunctions.filter((name) => expectedPublicFunctions.includes(name)).sort(),
    [...expectedPublicFunctions].sort(),
  );
  assert.deepEqual(
    publicFunctions.filter((name) => !expectedPublicFunctions.includes(name)).sort(),
    [
      "guard_accounting_profile_identity",
      "prevent_accounting_foundation_history_mutation",
      "validate_accounting_profile_version",
    ],
  );
  assert.doesNotMatch(migration, /CREATE\s+(?:OR REPLACE\s+)?VIEW\b/i);
  assert.doesNotMatch(migration, /CREATE TABLE public\.accounting_(?:accounts|periods|journals)\b/i);
});

test("W10A1 catalog is fixed, with only view and profile management grantable", () => {
  const seed = migration.slice(0, migration.indexOf("CREATE FUNCTION public.get_accounting_capability"));
  const seedRows = [...seed.matchAll(/^\s*\('accounting:[^\n]+/gm)].map((match) => match[0].trim());
  assert.equal(seedRows.length, 12);
  assert.match(seed, /\('accounting:view',true,true,'W10A1'\)/);
  assert.match(seed, /\('accounting:manage_profile',true,true,'W10A1'\)/);
  assert.match(seed, /\('accounting:manage_authority',true,false,'W10A1'\)/);
  assert.match(seed, /\('accounting:manage_chart',false,false,'W10A2'\)/);
  assert.match(seed, /\('accounting:manage_periods',false,false,'W10A2'\)/);
  assert.doesNotMatch(seed, /INSERT INTO public\.accounting_(?:profiles|profile_versions|capability_events|foundation_events)\b/i);
});

test("manage_authority bootstrap is storable by owner while runtime ALLOW remains prohibited", () => {
  const capabilityEvents = migration.slice(
    migration.indexOf("CREATE TABLE public.accounting_capability_events"),
    migration.indexOf("INSERT INTO public.accounting_capability_catalog"),
  );
  assert.match(capabilityEvents, /effect text NOT NULL CHECK \(effect IN \('ALLOW','DENY','REVOKE'\)\)/);
  assert.doesNotMatch(capabilityEvents, /accounting_capability_events_allow_catalog_check/);
  assert.doesNotMatch(capabilityEvents, /effect\s*<>\s*'ALLOW'[\s\S]*?capability\s*<>\s*'accounting:manage_authority'/);
  assert.match(migration, /\('accounting:manage_authority',true,false,'W10A1'\)/);

  const ownerBootstrap = rollbackFixture.slice(
    rollbackFixture.indexOf("-- Owner-only synthetic bootstrap"),
    rollbackFixture.indexOf("SET LOCAL ROLE service_role;"),
  );
  assert.match(ownerBootstrap, /INSERT INTO public\.accounting_capability_events\([\s\S]*?accounting:manage_authority',1,'ALLOW'/);

  const setFunction = migration.slice(
    migration.indexOf("CREATE FUNCTION public.set_accounting_capability"),
    migration.indexOf("CREATE FUNCTION public.update_accounting_profile"),
  );
  assert.match(
    setFunction,
    /p_effect='ALLOW' AND \(NOT v_catalog\.enabled OR NOT v_catalog\.runtime_allow_grantable\s+OR p_capability='accounting:manage_authority'\)[\s\S]*?capability_not_grantable/,
  );
});

test("all five tables enable RLS and deny direct application-role table access", () => {
  for (const table of expectedTables) {
    assert.match(migration, new RegExp(`ALTER TABLE public\\.${table} ENABLE ROW LEVEL SECURITY;`));
  }
  assert.match(
    migration,
    /REVOKE ALL ON TABLE public\.accounting_profiles,public\.accounting_profile_versions,[\s\S]*?FROM PUBLIC,anon,authenticated,service_role;/,
  );
  assert.doesNotMatch(migration, /CREATE POLICY\b/i);

  const serviceGrants = [...migration.matchAll(/GRANT EXECUTE ON FUNCTION public\.(\w+)\([^\n]+ TO service_role;/g)].map((match) => match[1]);
  assert.deepEqual(serviceGrants.sort(), [...expectedPublicFunctions].sort());
  assert.doesNotMatch(migration, /GRANT\s+(?:SELECT|INSERT|UPDATE|DELETE|ALL)\s+ON\s+(?:TABLE\s+)?public\.accounting_/i);
});

test("capability resolution uses one latest revision and never falls back after deny, revoke, or expiry", () => {
  const resolver = migration.slice(
    migration.indexOf("CREATE FUNCTION public.get_accounting_capability"),
    migration.indexOf("CREATE FUNCTION public.guard_accounting_profile_identity"),
  );
  assert.match(resolver, /ORDER BY e\.revision DESC LIMIT 1/);
  assert.match(resolver, /v_effect='ALLOW' AND \(v_expires IS NULL OR v_expires>statement_timestamp\(\)\)/);
  assert.match(resolver, /COALESCE\(v_enabled,false\)/);
  assert.match(resolver, /u\.is_active IS TRUE/);
  assert.doesNotMatch(resolver, /e\.effect\s*=\s*'DENY'[\s\S]{0,300}ORDER BY/i);
});

test("authority mutation enforces delegation boundaries, idempotency, and per-assignment serialization", () => {
  const setFunction = migration.slice(
    migration.indexOf("CREATE FUNCTION public.set_accounting_capability"),
    migration.indexOf("CREATE FUNCTION public.update_accounting_profile"),
  );
  assert.match(setFunction, /p_actor_user_id=p_target_user_id/);
  assert.match(setFunction, /p_effect='ALLOW' AND \(NOT v_catalog\.enabled OR NOT v_catalog\.runtime_allow_grantable/);
  assert.match(setFunction, /get_accounting_capability\(p_actor_user_id,'accounting:manage_authority'\)/);
  assert.match(setFunction, /ORDER BY u\.id FOR SHARE/);
  assert.match(setFunction, /pg_advisory_xact_lock/);
  assert.match(setFunction, /'w10a1-assignment:'/);
  assert.match(setFunction, /'w10a1-request:'/);
  assert.match(setFunction, /request_payload_conflict/);
  assert.match(setFunction, /idempotent_replay/);
  assert.match(setFunction, /revision_conflict/);
  assert.match(setFunction, /IF NOT v_catalog\.enabled THEN[\s\S]*?capability_disabled/);
  const disabledGuardOffset = setFunction.indexOf("IF NOT v_catalog.enabled THEN");
  assert.ok(disabledGuardOffset >= 0);
  for (const insert of [
    "INSERT INTO public.accounting_foundation_events(",
    "INSERT INTO public.accounting_capability_events(",
    "INSERT INTO public.audit_logs(",
  ]) {
    assert.ok(setFunction.indexOf(insert) > disabledGuardOffset, `${insert} must follow the disabled-capability guard`);
  }
  assert.doesNotMatch(setFunction, /p_actor_role|u\.role/);

  const listFunction = migration.slice(
    migration.indexOf("CREATE FUNCTION public.list_accounting_capability_assignments"),
    migration.indexOf("CREATE FUNCTION public.get_accounting_profile"),
  );
  assert.match(listFunction, /c\.enabled AND c\.owner_slice='W10A1'/);
});

test("profile versions are immutable, structurally frozen after provisional activation, and settings-gated", () => {
  assert.match(migration, /BEFORE UPDATE OR DELETE ON public\.accounting_profile_versions/);
  assert.match(migration, /BEFORE TRUNCATE ON public\.accounting_profile_versions/);
  assert.match(migration, /ACCOUNTING_PROFILE_TRANSITION_REQUIRED/);
  assert.match(migration, /v_currency IS DISTINCT FROM 'SAR'/);
  assert.match(migration, /v_vat_mode IS DISTINCT FROM 'not_registered'/);
  assert.match(migration, /professional_validation_state text NOT NULL DEFAULT 'DEFERRED'[\s\S]*?CHECK \(professional_validation_state='DEFERRED'\)/);
  assert.match(migration, /activation_state text NOT NULL DEFAULT 'INACTIVE'[\s\S]*?CHECK \(activation_state IN \('INACTIVE','DEV_PROVISIONAL'\)\)/);
  assert.doesNotMatch(migration, /PRODUCTION_ACTIVE|PRODUCTION_VALIDATED|VAT_ACTIVE|ZATCA_ACTIVE|FATOORA_ACTIVE/);
});

test("foundation events, request fingerprints, audit mirrors, and migration preflight are present", () => {
  assert.match(migration, /UNIQUE \(profile_id,actor_user_id,request_id\)/);
  assert.match(migration, /payload_fingerprint text NOT NULL CHECK \(payload_fingerprint ~ '\^\[0-9a-f\]\{64\}\$'\)/);
  assert.match(migration, /extensions\.digest\(convert_to\(jsonb_build_object/);
  assert.match(migration, /INSERT INTO public\.accounting_foundation_events/);
  assert.match(migration, /INSERT INTO public\.audit_logs\(action,entity_type,entity_id,user_id,details,timestamp\)/);
  assert.match(migration, /VALUES \('create','accounting_capability_event'/);
  assert.match(migration, /VALUES \('update','accounting_profile'/);
  assert.match(migration, /w10a1 preflight: target accounting foundation relation already exists/);
  assert.match(migration, /w10a1 preflight: target accounting foundation function signature already exists/);
  assert.match(migration, /w10a1 preflight: pgcrypto digest function unavailable/);
  assert.doesNotMatch(migration, /ALTER TABLE public\.audit_logs/i);
});

test("DEV regression fixture is rollback-scoped and includes post-rollback residue assertions", () => {
  assert.match(rollbackFixture, /^--[\s\S]*?\nBEGIN;/);
  assert.match(rollbackFixture, /SET LOCAL ROLE service_role;/);
  assert.match(rollbackFixture, /ROLLBACK;\s*\n-- Run after the rollback/);
  assert.match(rollbackFixture, /W10A1 rollback fixture residue detected/);
  assert.match(rollbackFixture, /accounting:manage_authority/);
  assert.match(rollbackFixture, /accounting:manage_profile/);
  assert.match(rollbackFixture, /accounting:manage_chart/);
  assert.match(rollbackFixture, /rejected disabled capability probes wrote foundation history/);
  assert.match(rollbackFixture, /rejected disabled capability probes wrote assignment history/);
  assert.match(rollbackFixture, /rejected disabled capability probes wrote audit history/);
  assert.match(rollbackFixture, /'accounting:manage_chart','DENY'[\s\S]*?disabled capability DENY was accepted/);
  assert.match(rollbackFixture, /'accounting:manage_chart','REVOKE'[\s\S]*?disabled capability REVOKE was accepted/);
  assert.match(rollbackFixture, /request_payload_conflict/);
  assert.match(rollbackFixture, /latest REVOKE did not remain denied/);
  assert.match(rollbackFixture, /expired latest ALLOW fell back to historical ALLOW/);
  assert.match(rollbackFixture, /Structural change after activation/);
  assert.match(rollbackFixture, /insufficient_privilege/);
  assert.doesNotMatch(rollbackFixture, /\b(?:COMMIT|DROP|TRUNCATE)\b/i);
});
