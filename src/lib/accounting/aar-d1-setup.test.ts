import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
const migration = readFileSync(
  new URL("../../../supabase/migrations/20261013100000_aar_d1_accounting_setup_foundation.sql", import.meta.url),
  "utf8",
);
const schemas = readFileSync(new URL("./schemas.ts", import.meta.url), "utf8");

test("AAR-D1 adds only the accounting setup RPCs and leaves existing tables and policies intact", () => {
  const functions = [...migration.matchAll(/CREATE FUNCTION public\.(\w+)/g)].map((match) => match[1]);
  assert.deepEqual(functions.sort(), [
    "aar_d1_effective_roots",
    "aar_d1_record_capability_event",
    "bootstrap_accounting_foundation",
    "get_accounting_setup_status",
    "recover_accounting_root_authority",
    "transfer_accounting_root_authority",
  ]);
  assert.doesNotMatch(migration, /CREATE\s+TABLE\b|ALTER\s+TABLE\b|CREATE\s+POLICY\b|DROP\s+POLICY\b/i);
  assert.doesNotMatch(migration, /(?:CREATE|ALTER)\s+FUNCTION\s+public\.set_accounting_capability\b/i);
  assert.match(migration, /^--[\s\S]*?\nBEGIN;/);
  assert.match(migration, /COMMIT;\s*$/);
});

test("AAR-D1 RPC ACLs expose only four service-role endpoints", () => {
  const grants = [...migration.matchAll(/GRANT EXECUTE ON FUNCTION public\.(\w+)\([^\n]+ TO service_role;/g)]
    .map((match) => match[1])
    .sort();
  assert.deepEqual(grants, [
    "bootstrap_accounting_foundation",
    "get_accounting_setup_status",
    "recover_accounting_root_authority",
    "transfer_accounting_root_authority",
  ]);
  for (const functionName of [
    "aar_d1_effective_roots",
    "aar_d1_record_capability_event",
    "get_accounting_setup_status",
    "bootstrap_accounting_foundation",
    "transfer_accounting_root_authority",
    "recover_accounting_root_authority",
  ]) {
    assert.match(migration, new RegExp(`REVOKE ALL ON FUNCTION public\\.${functionName}\\(`));
  }
  assert.doesNotMatch(migration, /GRANT\s+(?:SELECT|INSERT|UPDATE|DELETE|ALL)\s+ON\s+(?:TABLE\s+)?public\.accounting_/i);
});

test("bootstrap is Admin-only, one-time, company-bound, fixed inactive, and grants exactly the three setup keys", () => {
  const bootstrap = migration.slice(
    migration.indexOf("CREATE FUNCTION public.bootstrap_accounting_foundation"),
    migration.indexOf("$bootstrap$;"),
  );
  assert.match(bootstrap, /v_actor\.role IS DISTINCT FROM 'admin'/);
  assert.match(bootstrap, /v_actor\.is_active IS DISTINCT FROM true/);
  assert.match(bootstrap, /v_target\.is_active IS DISTINCT FROM true/);
  assert.match(bootstrap, /pg_advisory_xact_lock/);
  assert.match(bootstrap, /request_payload_conflict/);
  assert.match(bootstrap, /already_initialized/);
  assert.match(bootstrap, /preexisting_accounting_state/);
  assert.match(bootstrap, /cs\.setting_key='default'/);
  assert.match(bootstrap, /v_company_currency IS DISTINCT FROM 'SAR'/);
  assert.match(bootstrap, /v_company_vat_mode IS DISTINCT FROM 'not_registered'/);
  assert.match(bootstrap, /'SA_IFRS_FOR_SMES',2025,'W10 provisional policy'/);
  assert.match(bootstrap, /'Controller approved provisional baseline','DEFERRED'/);
  assert.match(bootstrap, /'Asia\/Riyadh',NULL,NULL,true,NULL,'not_registered','INACTIVE','INACTIVE','INACTIVE'/);
  for (const key of ["accounting:view", "accounting:manage_profile", "accounting:manage_authority"]) {
    assert.match(bootstrap, new RegExp(`'${key.replaceAll(":", "\\:")}'`));
  }
  assert.equal((bootstrap.match(/aar_d1_record_capability_event\(/g) ?? []).length, 3);
  assert.doesNotMatch(bootstrap, /DEV_PROVISIONAL/);
});

test("root succession serializes and changes the sole active root in one transaction", () => {
  const transfer = migration.slice(
    migration.indexOf("CREATE FUNCTION public.transfer_accounting_root_authority"),
    migration.indexOf("$transfer_root$;"),
  );
  assert.match(transfer, /p_actor_user_id=p_target_user_id/);
  assert.match(transfer, /v_actor\.is_active IS DISTINCT FROM true/);
  assert.match(transfer, /v_target\.is_active IS DISTINCT FROM true/);
  assert.match(transfer, /aar-d1-root-authority:g7/);
  assert.match(transfer, /v_root_count<>1 OR v_root_user_id IS DISTINCT FROM p_actor_user_id/);
  assert.match(transfer, /p_target_user_id,'accounting:manage_authority','ALLOW'/);
  assert.match(transfer, /p_actor_user_id,'accounting:manage_authority','REVOKE'/);
  assert.match(transfer, /v_root_count<>1 OR v_root_user_id IS DISTINCT FROM p_target_user_id/);
  assert.match(transfer, /request_payload_conflict/);
  assert.match(transfer, /idempotent_replay/);
});

test("recovery requires CRM Admin and an exactly empty effective-root set", () => {
  const recovery = migration.slice(
    migration.indexOf("CREATE FUNCTION public.recover_accounting_root_authority"),
    migration.indexOf("$recover_root$;"),
  );
  assert.match(recovery, /v_actor\.role IS DISTINCT FROM 'admin'/);
  assert.match(recovery, /v_root_count<>0/);
  assert.match(recovery, /aar-d1-root-authority:g7/);
  assert.match(recovery, /request_payload_conflict/);
  assert.match(recovery, /'accounting:manage_authority','ALLOW'/);
  assert.match(recovery, /AAR_D1_ROOT_RECOVERY_POSTCONDITION_FAILED/);
  assert.doesNotMatch(recovery, /users:manage/);
});

test("setup status returns bounded pre-bootstrap/recovery states and derives progress from existing rows", () => {
  const status = migration.slice(
    migration.indexOf("CREATE FUNCTION public.get_accounting_setup_status"),
    migration.indexOf("$setup_status$;"),
  );
  assert.match(status, /'NOT_INITIALIZED'/);
  assert.match(status, /'RECOVERY_REQUIRED'/);
  assert.match(status, /'INITIALIZED'/);
  for (const table of ["accounting_accounts", "accounting_periods", "accounting_posting_rules", "accounting_inception_packages"]) {
    assert.match(status, new RegExp(`FROM public\\.${table}\\s+\\w+`));
  }
  assert.match(status, /public\.get_accounting_profile\(p_actor_user_id\)/);
});

test("setup schemas keep activation immutable and validate date boundaries", () => {
  const edits = schemas.slice(
    schemas.indexOf("export const accountingSetupProfileEditsSchema"),
    schemas.indexOf("export const updateAccountingProfileInputSchema"),
  );
  assert.ok(edits.length > 0);
  assert.match(edits, /\.strict\(\)/);
  assert.match(edits, /cutover_boundary_date < value\.accounting_start_date/);
  assert.doesNotMatch(edits, /activation_state/);
  assert.match(schemas, /export const accountingSetupMutationInputSchema[\s\S]*?\.strict\(\)/);
  assert.match(schemas, /state: z\.literal\("RECOVERY_REQUIRED"\), can_recover: z\.literal\(true\)/);
});
