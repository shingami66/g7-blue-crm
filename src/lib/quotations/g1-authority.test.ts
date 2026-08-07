import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const REPO_ROOT = join(import.meta.dirname, "../../..");
const MIGRATION = join(
  REPO_ROOT,
  "supabase/migrations/20260807090000_g1_financial_lifecycle_authority.sql",
);
const ACTIONS = join(REPO_ROOT, "src/lib/quotations/actions.ts");

function read(path: string) {
  return readFileSync(path, "utf8");
}

test("G1 closes edit, reject, and delete races at the approved quotation boundary", () => {
  const migration = read(MIGRATION);
  const actions = read(ACTIONS);

  assert.match(
    migration,
    /CREATE OR REPLACE FUNCTION public\.prevent_approved_quotation_mutation\(\)/,
  );
  assert.match(
    migration,
    /BEFORE UPDATE OR DELETE ON public\.quotations/,
  );
  assert.match(
    migration,
    /CREATE OR REPLACE FUNCTION public\.prevent_approved_quotation_item_mutation\(\)/,
  );
  assert.match(
    migration,
    /BEFORE INSERT OR UPDATE OR DELETE ON public\.quotation_items/,
  );
  assert.equal(
    migration.match(/approved_quotation_immutable/g)?.length,
    4,
    "parent and child guards must use one stable authority error",
  );
  assert.match(
    migration,
    /FROM public\.quotations q[\s\S]*WHERE q\.id = v_quotation_id[\s\S]*FOR SHARE;/,
  );

  assert.match(
    actions,
    /update\([\s\S]*?\.select\("id"\)\n\s*\.maybeSingle\(\)/,
  );
  assert.match(actions, /approved_quotation_immutable/);
  assert.match(actions, /Cannot delete an approved quotation/);
  assert.match(actions, /Cannot reject an approved quotation/);
});

test("G1 preserves the Service-first approval lock and covers all adversarial mutation races", () => {
  const approvalMigration = read(
    join(
      REPO_ROOT,
      "supabase/migrations/20260803090000_quotation_approval_internal_abs_activation.sql",
    ),
  );
  const guardMigration = read(MIGRATION);

  assert.match(
    approvalMigration,
    /FROM public\.services s[\s\S]*FOR UPDATE;/,
  );
  assert.match(
    approvalMigration,
    /FROM public\.quotations q[\s\S]*FOR UPDATE;/,
  );
  assert.match(guardMigration, /BEFORE UPDATE OR DELETE ON public\.quotations/);
  assert.match(
    guardMigration,
    /BEFORE INSERT OR UPDATE OR DELETE ON public\.quotation_items/,
  );
  assert.match(guardMigration, /FOR SHARE;/);
});

test("approved quotation mutation guards are SECURITY DEFINER and not public RPCs", () => {
  const migration = read(MIGRATION);

  assert.equal(
    migration.match(/^\s*SECURITY DEFINER$/gm)?.length,
    5,
    "both quotation guards and both invoice helpers/RPC layers must be definer-controlled",
  );
  assert.match(
    migration,
    /REVOKE ALL ON FUNCTION public\.prevent_approved_quotation_mutation\(\)\s+FROM PUBLIC, anon, authenticated;/,
  );
  assert.match(
    migration,
    /REVOKE ALL ON FUNCTION public\.prevent_approved_quotation_item_mutation\(\)\s+FROM PUBLIC, anon, authenticated;/,
  );
});
