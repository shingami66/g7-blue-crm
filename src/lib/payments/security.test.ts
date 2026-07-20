/**
 * security.test.ts
 *
 * Static security tests for the payment recording hardening migration.
 * Inspects the exact migration file text and fails clearly when a required
 * security or privilege invariant is absent.
 *
 * Test runner: Node.js built-in test runner
 *   node --no-warnings --experimental-strip-types --test src/lib/payments/security.test.ts
 */

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const MIGRATION_PATH = join(
  process.cwd(),
  "supabase/migrations/20260718190000_payment_recording_hardening.sql",
);

const rawSql = readFileSync(MIGRATION_PATH, "utf-8");

// Strip single-line and multi-line comments so assertions only see executable SQL.
const stripComments = (str: string) => {
  return str.replace(/--.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");
};

const sql = stripComments(rawSql);


// ---------------------------------------------------------------------------
// Security attributes of the hardened RPC
// ---------------------------------------------------------------------------

test("hardened RPC uses SECURITY DEFINER", () => {
  // SECURITY DEFINER must appear in the CREATE OR REPLACE FUNCTION body.
  assert.match(
    sql,
    /LANGUAGE\s+plpgsql\s+SECURITY\s+DEFINER/i,
    "hardened RPC must declare SECURITY DEFINER",
  );
});

test("hardened RPC sets a fixed safe search_path", () => {
  assert.match(
    sql,
    /SET\s+search_path\s*=\s*pg_catalog\s*,\s*public/i,
    "hardened RPC must set search_path = pg_catalog, public to prevent search-path hijacking",
  );
});

test("hardened RPC has deliberate ownership set to postgres", () => {
  assert.match(
    sql,
    new RegExp(
      `ALTER FUNCTION\\s+public\\.record_invoice_payment\\(uuid,\\s*numeric,\\s*date,\\s*text,\\s*text,\\s*text,\\s*uuid\\)[\\s\\S]*?OWNER TO\\s+postgres`,
      "i",
    ),
    "migration must explicitly set OWNER TO postgres for the hardened RPC",
  );
});

// ---------------------------------------------------------------------------
// Privilege model: PUBLIC, anon, authenticated revoked; service_role granted
// ---------------------------------------------------------------------------

test("PUBLIC execute privilege revoked from hardened RPC", () => {
  assert.match(
    sql,
    /REVOKE ALL ON FUNCTION public\.record_invoice_payment\(uuid,\s*numeric,\s*date,\s*text,\s*text,\s*text,\s*uuid\)\s+FROM PUBLIC/i,
    "migration must REVOKE ALL on hardened RPC FROM PUBLIC",
  );
});

test("anon execute privilege revoked from hardened RPC", () => {
  assert.match(
    sql,
    /REVOKE ALL ON FUNCTION public\.record_invoice_payment\(uuid,\s*numeric,\s*date,\s*text,\s*text,\s*text,\s*uuid\)\s+FROM anon/i,
    "migration must REVOKE ALL on hardened RPC FROM anon",
  );
});

test("authenticated execute privilege revoked from hardened RPC", () => {
  assert.match(
    sql,
    /REVOKE ALL ON FUNCTION public\.record_invoice_payment\(uuid,\s*numeric,\s*date,\s*text,\s*text,\s*text,\s*uuid\)\s+FROM authenticated/i,
    "migration must REVOKE ALL on hardened RPC FROM authenticated",
  );
});

test("service_role is granted execute on hardened RPC", () => {
  assert.match(
    sql,
    /GRANT EXECUTE ON FUNCTION public\.record_invoice_payment\(uuid,\s*numeric,\s*date,\s*text,\s*text,\s*text,\s*uuid\)\s+TO service_role/i,
    "migration must GRANT EXECUTE on hardened RPC TO service_role",
  );
});

// ---------------------------------------------------------------------------
// Obsolete signature: all privileges revoked (cannot bypass hardened contract)
// ---------------------------------------------------------------------------

test("obsolete 6-arg RPC has all privileges revoked from service_role", () => {
  // The 6-arg signature must have service_role explicitly revoked.
  assert.match(
    sql,
    /REVOKE ALL ON FUNCTION public\.record_invoice_payment\(uuid,\s*numeric,\s*date,\s*text,\s*text,\s*text\)\s+FROM service_role/i,
    "migration must REVOKE ALL on obsolete 6-arg RPC FROM service_role",
  );
});

test("obsolete 6-arg RPC has PUBLIC revoked", () => {
  assert.match(
    sql,
    /REVOKE ALL ON FUNCTION public\.record_invoice_payment\(uuid,\s*numeric,\s*date,\s*text,\s*text,\s*text\)\s+FROM PUBLIC/i,
    "migration must REVOKE ALL on obsolete 6-arg RPC FROM PUBLIC",
  );
});

test("obsolete 6-arg RPC has anon revoked", () => {
  assert.match(
    sql,
    /REVOKE ALL ON FUNCTION public\.record_invoice_payment\(uuid,\s*numeric,\s*date,\s*text,\s*text,\s*text\)\s+FROM anon/i,
    "migration must REVOKE ALL on obsolete 6-arg RPC FROM anon",
  );
});

test("obsolete 6-arg RPC has authenticated revoked", () => {
  assert.match(
    sql,
    /REVOKE ALL ON FUNCTION public\.record_invoice_payment\(uuid,\s*numeric,\s*date,\s*text,\s*text,\s*text\)\s+FROM authenticated/i,
    "migration must REVOKE ALL on obsolete 6-arg RPC FROM authenticated",
  );
});

// ---------------------------------------------------------------------------
// Safe SQL practices: no dynamic SQL, no raw error-message matching
// ---------------------------------------------------------------------------

test("migration contains no unsafe dynamic SQL (EXECUTE with variable input)", () => {
  // EXECUTE used for dynamic SQL is the pattern to block.
  // EXECUTE inside a BEGIN/EXCEPTION block without a quoted literal is suspicious.
  // We check there is no 'EXECUTE' keyword in the RPC body beyond the migration-level
  // BEGIN/COMMIT block (which uses no EXECUTE at all).
  // Simple check: no bare EXECUTE statement appears in the function body.
  assert.doesNotMatch(
    sql,
    /^\s*EXECUTE\s+[^;]+;/m,
    "migration must not use bare EXECUTE for dynamic SQL",
  );
});

test("no raw error-message substring matching in the new migration contract", () => {
  // The migration must not use SQLERRM ILIKE or SQLERRM = pattern matching
  // for domain error branching in the hardened RPC.
  // Exception: catch blocks in create_invoice_atomic (different function) are
  // out of scope; we only care about the hardened function in this migration.
  //
  // Heuristic: count SQLERRM occurrences. The hardened RPC must not contain
  // SQLERRM-based branching.
  const rpcBodyStart = sql.indexOf("CREATE OR REPLACE FUNCTION public.record_invoice_payment(");
  const rpcBodyEnd   = sql.indexOf("\n$$;", rpcBodyStart);

  if (rpcBodyStart === -1 || rpcBodyEnd === -1) {
    assert.fail("Could not locate hardened RPC function body in migration");
  }

  const rpcBody = sql.slice(rpcBodyStart, rpcBodyEnd);

  assert.doesNotMatch(
    rpcBody,
    /SQLERRM/i,
    "hardened RPC must not use SQLERRM for domain error branching (use stable error_code rows instead)",
  );
  assert.doesNotMatch(
    rpcBody,
    /ILIKE\s+'%/i,
    "hardened RPC must not use ILIKE pattern matching on error messages",
  );
  assert.doesNotMatch(
    rpcBody,
    /error\.message\.includes/i,
    "migration must not embed raw error-message substring matching",
  );
});

// ---------------------------------------------------------------------------
// Pre-flight guard integrity
// ---------------------------------------------------------------------------

test("migration includes a pre-flight guard that checks for required tables", () => {
  assert.match(
    sql,
    /to_regclass\('public\.payments'\)\s+IS\s+NULL/i,
    "pre-flight guard must check that payments table exists",
  );
  assert.match(
    sql,
    /to_regclass\('public\.invoices'\)\s+IS\s+NULL/i,
    "pre-flight guard must check that invoices table exists",
  );
  assert.match(
    sql,
    /to_regclass\('public\.services'\)\s+IS\s+NULL/i,
    "pre-flight guard must check that services table exists",
  );
});

test("migration includes a pre-flight guard that checks for prior RPC existence", () => {
  assert.match(
    sql,
    /to_regprocedure\('public\.record_invoice_payment\(uuid,numeric,date,text,text,text\)'\)\s+IS\s+NULL/i,
    "pre-flight guard must check that the prior 6-arg RPC exists before proceeding",
  );
});

test("migration includes a pre-flight guard that prevents double application", () => {
  // The guard must check that request_id column does not already exist.
  assert.match(
    sql,
    /c\.column_name\s*=\s*'request_id'/i,
    "pre-flight guard must check that request_id column does not already exist",
  );
});
