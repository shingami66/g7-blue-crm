import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const REPO_ROOT = join(import.meta.dirname, "../../..");
const originalMigration = readFileSync(
  join(REPO_ROOT, "supabase/migrations/20260901061855_w4_procurement_requirement_sourcing.sql"),
  "utf8",
);
const requirementCorrectiveMigration = readFileSync(
  join(REPO_ROOT, "supabase/migrations/20260901065813_w4_procurement_requirement_rpc_ambiguity_repair.sql"),
  "utf8",
);
const candidateCorrectiveMigration = readFileSync(
  join(REPO_ROOT, "supabase/migrations/20260901071504_w4_procurement_candidate_rpc_ambiguity_repair.sql"),
  "utf8",
);

function functionSection(source: string, functionName: string) {
  const start = source.indexOf(`CREATE OR REPLACE FUNCTION public.${functionName}`);
  assert.notEqual(start, -1, `${functionName} definition was not found`);
  const end = source.indexOf("\n$$;", start);
  assert.notEqual(end, -1, `${functionName} body terminator was not found`);
  return source.slice(start, end + 4);
}

test("fresh requirement creation qualifies the RETURNING list", () => {
  const requirementRpc = functionSection(requirementCorrectiveMigration, "upsert_service_procurement_requirement");

  assert.match(
    requirementRpc,
    /INSERT INTO public\.service_procurement_requirements AS spr[\s\S]*?RETURNING spr\.id, spr\.selection_status, spr\.selected_supplier_id\s+INTO v_requirement_id, v_selection_status, v_selected_supplier_id;/,
  );
  assert.doesNotMatch(requirementRpc, /RETURNING\s+id,\s*selection_status,\s*selected_supplier_id/);
});

test("requirement replay remains request-bound and returns the existing row", () => {
  const requirementRpc = functionSection(requirementCorrectiveMigration, "upsert_service_procurement_requirement");

  assert.match(requirementRpc, /a\.details ->> 'request_id' = p_request_id::text/);
  assert.match(requirementRpc, /v_audit_payload IS DISTINCT FROM v_payload/);
  assert.match(
    requirementRpc,
    /RETURN QUERY SELECT NULL::text, v_requirement_id, p_service_id, v_selection_status, v_selected_supplier_id, true;/,
  );
  assert.match(requirementRpc, /'operation', 'requirement_upsert'/);
  assert.match(requirementRpc, /'request_id', p_request_id::text/);
});

test("the other W4 RPCs have no analogous unqualified RETURNING clause", () => {
  const candidateRpc = functionSection(candidateCorrectiveMigration, "upsert_service_procurement_candidate");
  const selectionRpc = functionSection(originalMigration, "select_service_procurement_supplier");

  assert.doesNotMatch(candidateRpc, /\bRETURNING\b/);
  assert.doesNotMatch(selectionRpc, /\bRETURNING\b/);
});

test("candidate create, update, and replay use the named primary-key conflict target", () => {
  const candidateRpc = functionSection(candidateCorrectiveMigration, "upsert_service_procurement_candidate");

  assert.match(
    candidateRpc,
    /ON CONFLICT ON CONSTRAINT service_procurement_candidates_pkey DO UPDATE[\s\S]*?updated_by = p_actor_id;/,
  );
  assert.doesNotMatch(candidateRpc, /ON CONFLICT\s*\(\s*requirement_id\s*,\s*supplier_id\s*\)/);
  assert.match(candidateRpc, /v_existing := FOUND/);
  assert.match(candidateRpc, /'from', v_before/);
  assert.match(candidateRpc, /'payload', v_payload/);
  assert.match(candidateRpc, /v_audit_payload IS DISTINCT FROM v_payload/);
  assert.match(
    candidateRpc,
    /RETURN QUERY SELECT NULL::text, p_requirement_id, p_supplier_id, v_service_id, true;/,
  );
});

test("all W4 RETURNS TABLE RPCs avoid the audited output-name collision class", () => {
  const requirementRpc = functionSection(requirementCorrectiveMigration, "upsert_service_procurement_requirement");
  const candidateRpc = functionSection(candidateCorrectiveMigration, "upsert_service_procurement_candidate");
  const selectionRpc = functionSection(originalMigration, "select_service_procurement_supplier");

  for (const rpc of [requirementRpc, candidateRpc, selectionRpc]) {
    assert.doesNotMatch(rpc, /\bWHERE\s+(?:id|requirement_id|supplier_id|service_id|selection_status)\b/);
  }
  assert.doesNotMatch(candidateRpc, /ON CONFLICT\s*\(\s*requirement_id\s*,\s*supplier_id\s*\)/);
  assert.match(requirementRpc, /RETURNING spr\.id, spr\.selection_status, spr\.selected_supplier_id/);
  assert.match(requirementRpc, /RETURNING r\.id, r\.selection_status, r\.selected_supplier_id/);
  assert.doesNotMatch(candidateRpc, /\bRETURNING\b/);
  assert.doesNotMatch(selectionRpc, /\bRETURNING\b|\bON CONFLICT\b/);
});

test("the corrective replacement preserves the W4 RPC boundary", () => {
  const requirementRpc = functionSection(requirementCorrectiveMigration, "upsert_service_procurement_requirement");

  assert.match(
    requirementRpc,
    /public\.upsert_service_procurement_requirement\(\s*p_requirement_id uuid,[\s\S]*?p_actor_role text\s*\)/,
  );
  assert.match(requirementRpc, /RETURNS TABLE\([\s\S]*?idempotent_replay boolean[\s\S]*?\)/);
  assert.match(requirementRpc, /LANGUAGE plpgsql\s+SECURITY DEFINER\s+SET search_path = pg_catalog, public/);
});

test("the candidate corrective replacement preserves the W4 RPC boundary", () => {
  const candidateRpc = functionSection(candidateCorrectiveMigration, "upsert_service_procurement_candidate");

  assert.match(
    candidateRpc,
    /public\.upsert_service_procurement_candidate\(\s*p_requirement_id uuid,[\s\S]*?p_actor_role text\s*\)/,
  );
  assert.match(candidateRpc, /RETURNS TABLE\([\s\S]*?idempotent_replay boolean[\s\S]*?\)/);
  assert.match(candidateRpc, /LANGUAGE plpgsql\s+SECURITY DEFINER\s+SET search_path = pg_catalog, public/);
});

