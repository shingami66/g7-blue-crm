import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const REPO_ROOT = join(import.meta.dirname, "../../..");
const migration = readFileSync(
  join(REPO_ROOT, "supabase/migrations/20260902120000_l1_d07_audit_action_compatibility.sql"),
  "utf8",
);

test("D07 audit action compatibility replaces only the existing check", () => {
  const sql = migration.replace(/\/\*[\s\S]*?\*\//g, "").replace(/--.*$/gm, "");

  assert.match(sql, /^BEGIN;\s*ALTER TABLE public\.audit_logs/m);
  assert.match(sql, /DROP CONSTRAINT audit_logs_action_check/);
  assert.match(sql, /ADD CONSTRAINT audit_logs_action_check/);
  assert.match(sql, /COMMIT;\s*$/);
  assert.equal((sql.match(/ALTER TABLE/g) ?? []).length, 2);
  assert.equal((sql.match(/DROP CONSTRAINT audit_logs_action_check/g) ?? []).length, 1);
  assert.equal((sql.match(/ADD CONSTRAINT audit_logs_action_check/g) ?? []).length, 1);

  const statements = sql.split(";").map((statement) => statement.trim()).filter(Boolean);
  assert.equal(statements.length, 4);
  assert.equal(statements[0], "BEGIN");
  const normalizedStatements = statements.map((statement) => statement.replace(/\s+/g, " "));
  assert.equal(normalizedStatements[1], "ALTER TABLE public.audit_logs DROP CONSTRAINT audit_logs_action_check");
  assert.equal(
    normalizedStatements[2],
    "ALTER TABLE public.audit_logs ADD CONSTRAINT audit_logs_action_check CHECK ( action = ANY ( ARRAY[ 'create'::text, 'update'::text, 'delete'::text, 'restore'::text, 'status_change'::text, 'payment_recorded'::text, 'correction'::text ] ) )",
  );
  assert.equal(statements[3], "COMMIT");

  const actions = [...sql.matchAll(/'([a-z_]+)'::text/g)].map((match) => match[1]);
  assert.deepEqual(actions, [
    "create",
    "update",
    "delete",
    "restore",
    "status_change",
    "payment_recorded",
    "correction",
  ]);
  assert.doesNotMatch(sql, /^\s*(CREATE TABLE|CREATE FUNCTION|GRANT|REVOKE|INSERT|UPDATE|DELETE)\b/im);
});
