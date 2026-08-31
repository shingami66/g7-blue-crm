import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(
  new URL("../../../supabase/migrations/20260831120000_w2b_quotation_revision_lineage.sql", import.meta.url),
  "utf8",
);
const actions = readFileSync(new URL("./actions.ts", import.meta.url), "utf8");
const schemas = readFileSync(new URL("./schemas.ts", import.meta.url), "utf8");

test("W2B adds only bounded internal quotation lineage persistence", () => {
  assert.match(migration, /ADD COLUMN quotation_family_id uuid NOT NULL DEFAULT extensions\.gen_random_uuid\(\)/);
  assert.match(migration, /ADD COLUMN revision_of_quotation_id uuid NULL/);
  assert.match(migration, /ADD COLUMN revision_number integer NOT NULL DEFAULT 1/);
  assert.match(migration, /ADD COLUMN revision_reason text NULL/);
  assert.match(migration, /revision_of_quotation_id IS NOT NULL[\s\S]*revision_reason IS NOT NULL/);
  assert.match(migration, /quotations_revision_source_family_fkey[\s\S]*ON DELETE RESTRICT/);
  assert.match(migration, /idx_quotations_family_revision_unique/);
  assert.match(migration, /idx_quotations_revision_source_unique/);
  assert.doesNotMatch(migration, /CREATE TABLE public\.(quotation_revision|commercial_revision|change_order)/i);
});

test("W2B enforces a linear, non-cyclic family and closes post-Sent mutation bypasses", () => {
  assert.match(migration, /quotations_revision_root_shape_check/);
  assert.match(migration, /quotation_revision_self_reference/);
  assert.match(migration, /quotation_revision_status_invalid/);
  assert.match(migration, /NEW\.revision_number <> v_predecessor\.revision_number \+ 1/);
  assert.match(migration, /v_predecessor\.status NOT IN \('sent', 'rejected', 'expired'\)/);
  assert.match(migration, /quotation_revision_predecessor_invalid/);
  assert.match(migration, /quotation_revision_source_has_successor/);
  assert.match(migration, /post_sent_quotation_status_transition_invalid/);
  assert.match(migration, /OLD\.is_deleted IS DISTINCT FROM NEW\.is_deleted/);
  assert.match(migration, /OLD\.created_by IS DISTINCT FROM NEW\.created_by/);
  assert.match(migration, /CREATE TRIGGER prevent_approval_of_revised_quotation_trg/);
});

test("revision RPC clones the existing commercial snapshot without touching ABS history", () => {
  const fnStart = migration.indexOf("CREATE FUNCTION public.create_quotation_revision(");
  assert.notEqual(fnStart, -1);
  const revisionFunction = migration.slice(fnStart);
  assert.match(revisionFunction, /v_source\.status NOT IN \('sent', 'rejected', 'expired'\)/);
  assert.match(revisionFunction, /quotation_revision_approved_not_allowed/);
  assert.match(revisionFunction, /quotation_revision_successor_exists/);
  assert.match(revisionFunction, /snapshot_seller/);
  assert.match(revisionFunction, /snapshot_buyer/);
  assert.match(revisionFunction, /WITH item_map AS MATERIALIZED/);
  assert.match(revisionFunction, /parent_map\.successor_item_id/);
  assert.match(revisionFunction, /quotation_revision_created/);
  assert.doesNotMatch(revisionFunction, /approved_billing_scopes|approved_billing_scope_items|supersed/i);
  assert.match(revisionFunction, /SET search_path = pg_catalog, public/);
});

test("revision action reuses existing authorization and presents a bounded RPC", () => {
  assert.match(schemas, /export const quotationRevisionSchema/);
  assert.match(actions, /export async function createQuotationRevision/);
  assert.match(actions, /requirePermission\("quotations:write"\)/);
  assert.match(actions, /requirePermission\("services:read"\)/);
  assert.match(actions, /supabase\.rpc\("create_quotation_revision"/);
  assert.match(actions, /quotation_revision_approved_not_allowed/);
});

test("post-Sent soft-delete action fails closed before the W2B database guard", () => {
  const start = actions.indexOf("export async function softDeleteQuotation");
  assert.notEqual(start, -1);
  const softDeleteBlock = actions.slice(start, actions.indexOf("export async function approveQuotation", start));
  assert.match(softDeleteBlock, /qData\.status !== "draft"/);
  assert.match(softDeleteBlock, /Only draft quotations can be deleted\. Create a Draft revision instead\./);
});

test("all W2B functions remain service-role-only with fixed search paths", () => {
  for (const name of [
    "prevent_quotation_revision_lineage_mutation",
    "validate_quotation_revision_lineage",
    "prevent_post_sent_quotation_commercial_mutation",
    "prevent_post_sent_quotation_item_mutation",
    "prevent_approval_of_revised_quotation",
    "create_quotation_revision",
  ]) {
    const functionBlock = migration.slice(migration.indexOf(`FUNCTION public.${name}`));
    assert.match(functionBlock, /SET search_path = pg_catalog, public/);
    assert.match(functionBlock, new RegExp(`GRANT EXECUTE ON FUNCTION public\\.${name}`));
    assert.match(functionBlock, /TO service_role/);
  }
});
