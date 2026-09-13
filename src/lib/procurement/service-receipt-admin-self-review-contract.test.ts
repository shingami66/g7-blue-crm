import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { getProcurementCommitmentDictionary } from "../i18n/dictionaries/procurement-commitments.ts";

const ROOT = join(import.meta.dirname, "../../..");
const previousMigrationPath = "supabase/migrations/20260906120000_w4_architecture_remediation.sql";
const correctiveMigrationPath = "supabase/migrations/20260913170214_allow_admin_service_receipt_self_review.sql";

function read(path: string) {
  return readFileSync(join(ROOT, path), "utf8");
}

function functionBody(source: string) {
  const start = source.indexOf("FUNCTION public.review_service_receipt(");
  const end = source.indexOf("$$;", start);
  assert.ok(start >= 0, "review_service_receipt definition is required");
  assert.ok(end > start, "review_service_receipt body must be complete");
  return source.slice(start, end + 3).replace(/--.*$/gm, "").replace(/\s+/g, " ").trim();
}

test("corrective RPC allows only Admin self-review and preserves the authoritative body", () => {
  const previous = functionBody(read(previousMigrationPath));
  const corrective = read(correctiveMigrationPath);
  const current = functionBody(corrective);

  assert.equal(
    current,
    previous.replace(
      "IF v_submitter = p_actor_id THEN",
      "IF v_submitter = p_actor_id AND p_actor_role <> 'admin' THEN",
    ),
  );
  assert.match(current, /p_actor_role NOT IN \('admin', 'manager'\)/);
  assert.match(current, /p_acceptance_status NOT IN \('ACCEPTED', 'ACCEPTED_WITH_CONDITIONS', 'REJECTED'\)/);
  assert.match(corrective, /SECURITY DEFINER\s+SET search_path = pg_catalog, public/);
  assert.match(corrective, /REVOKE ALL ON FUNCTION public\.review_service_receipt\(uuid,text,text,uuid,text,text\) FROM PUBLIC, anon, authenticated;/);
  assert.match(corrective, /GRANT EXECUTE ON FUNCTION public\.review_service_receipt\(uuid,text,text,uuid,text,text\) TO service_role;/);
});

test("self-review feedback explains the Admin exception in both locales", () => {
  const english = getProcurementCommitmentDictionary("en");
  const arabic = getProcurementCommitmentDictionary("ar");

  assert.match(english.errors.service_receipt_self_review_forbidden, /Admin/);
  assert.match(arabic.errors.service_receipt_self_review_forbidden, /مسؤول النظام/);
});
