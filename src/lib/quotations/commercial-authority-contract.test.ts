import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(
  new URL("../../../supabase/migrations/20260831110000_w2a_commercial_authority_lines.sql", import.meta.url),
  "utf8",
);
const actions = readFileSync(
  new URL("./actions.ts", import.meta.url),
  "utf8",
);

test("W2A migration stays on quotation and ABS lineage", () => {
  assert.match(migration, /ALTER TABLE public\.quotation_items/);
  assert.match(migration, /quotation_items_parent_authority_line_fkey/);
  assert.match(migration, /commercial_role IN \('authority_line', 'included_component', 'optional_add_on'\)/);
  assert.match(migration, /source_commercial_role/);
  assert.match(migration, /set_quotation_commercial_structure\(uuid, jsonb, text\)/);
  assert.match(migration, /GRANT EXECUTE ON FUNCTION public\.set_quotation_commercial_structure[\s\S]*TO service_role/);
  assert.doesNotMatch(migration, /CREATE TABLE public\.(commercial_authority|authority_lines)/i);
  assert.doesNotMatch(migration, /CREATE\s+TABLE\s+public\.[^;]*revision/i);
});

test("W2A migration protects optional and included contribution semantics", () => {
  assert.match(migration, /quotation_items_included_component_price_check/);
  assert.match(migration, /quotation_items_optional_unselected_total_check/);
  assert.match(migration, /quotation_included_component_must_be_non_priced/);
  assert.match(migration, /quotation_unselected_optional_total_must_be_zero/);
  assert.match(migration, /quotation_authority_line_has_children/);
  assert.match(migration, /selected_optional_add_on_count/);
  assert.match(migration, /Validate the complete proposed graph/);
  assert.match(migration, /jsonb_array_elements\(p_lines\)[\s\S]*v_parent_role <> 'authority_line'/);
  assert.match(migration, /Apply proposed roots first[\s\S]*current roots that are being demoted/);
  assert.match(migration, /ORDER BY CASE[\s\S]*current_item\.commercial_role <> 'authority_line'/);
});

test("legacy quotation replacement fails closed for structured drafts", () => {
  assert.match(actions, /legacy replace-all RPC cannot carry W2A hierarchy metadata/);
  assert.match(actions, /commercial_role.*!== "authority_line"/);
});
