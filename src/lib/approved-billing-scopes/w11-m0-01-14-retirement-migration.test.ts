import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(
  new URL(
    "../../../supabase/migrations/20261027102347_w11_m0_01_14_approved_abs_retirement.sql",
    import.meta.url,
  ),
  "utf8",
);
const downstreamPreflight = readFileSync(
  new URL("../../../supabase/verification/w11m0_01_14_downstream_preflight.sql", import.meta.url),
  "utf8",
);
const remediationPreflight = readFileSync(
  new URL("../../../supabase/verification/w11m0_01_14_remediation_preflight.sql", import.meta.url),
  "utf8",
);
const postflight = readFileSync(
  new URL("../../../supabase/verification/w11m0_01_14_postflight.sql", import.meta.url),
  "utf8",
);
const targetFunctionStart = migration.indexOf("CREATE FUNCTION public._w11_m0_01_retirement_targets()");
const targetFunctionEnd = migration.indexOf("$function$;", targetFunctionStart) + "$function$;".length;
const targets = migration.slice(targetFunctionStart, targetFunctionEnd);
const targetTriples = [...targets.matchAll(
  /^\s*\('([0-9a-f-]{36})'::uuid,\s*'([0-9a-f-]{36})'::uuid,\s*'([0-9a-f-]{36})'::uuid/gm,
)].map((match) => [match[1], match[2], match[3]]);

test("W11 M0-01 retirement is limited to the exact Owner-approved 14 triples", () => {
  assert.deepEqual(targetTriples, [
    ["02bdefe9-6a1e-4dfe-8732-985af7a5df49", "307106ce-2a58-4901-bcb6-75abe12b03af", "4346aaec-8780-44a4-a4e3-bfcd7ebc3f02"],
    ["1421ecd2-4152-4676-8c41-ec292830e8a2", "daa17584-0180-4778-9316-826015b486ac", "3de3cf22-8fc3-4115-abc7-0b40cc2c41be"],
    ["1ac06a50-043a-4ff2-b441-f709da735a52", "d286e869-df5f-4510-a5d8-fb3397f6f5e3", "3c15e26b-8892-46c3-b669-d95074ebe096"],
    ["3802d0fa-11fe-44ad-b1f8-8503ea8cd8b5", "ec4717f4-ed0e-4879-aa6f-a4c3736d3556", "c11728f0-3d66-41ed-9c3b-3058ca45ea75"],
    ["3f7dfffb-3188-49d0-b4ac-3297a95a60e8", "591744aa-4684-4463-a782-260af6f90d6a", "5811cfed-cd16-48a1-a1e5-100ae67ed425"],
    ["52d67797-0fd5-466f-a810-2d3c14542b25", "bb5756e6-5488-4587-b475-63b8aa9620b3", "de7ab306-f1a9-4744-914f-e38e88726920"],
    ["804c7bbc-0048-4b6d-902c-c74f96d07cbc", "dcabf9d8-600b-438c-bd5d-0f2857785cd7", "6c248530-744b-416b-a16f-2c3021118d87"],
    ["895638bd-6568-4e48-aac0-876eea91fa88", "e2fdd626-cdab-4f34-b7ca-2d52b5412e9d", "59d76d2f-86c2-4457-8a95-a6ffc5b577b1"],
    ["a131fafb-347b-476e-95c0-2329ad641805", "401426ab-77df-4b6d-bd87-c511319f91b6", "6b7ca133-70c6-4015-9323-4a3bf752434c"],
    ["a267452a-802b-4d57-8b49-8d161aca508d", "afb16e3d-95d0-4823-918e-f7c8f52dd6f5", "59839e2a-ec55-4ca5-a770-8e45f433d18a"],
    ["e084cec0-c0d6-4429-8324-6c2a0f58db7f", "51607035-b574-44c5-ae84-f7e676d7a4d8", "b13c8a5a-fef4-4dc2-9d9a-7aff7209e5b1"],
    ["e392d1da-bfd1-4b40-ac48-4e5c14afb7c0", "90db681e-b166-479e-b4ed-6087266d1dfe", "9a77baf7-5df4-48fe-92ad-2cdab810d9af"],
    ["eb92008c-d17e-4eff-9f8b-99c5e5ab8ee0", "fd51e91e-af3a-4c0e-897f-0a5afbac766d", "ab5d8c9b-37c2-4b2b-b806-9a0a3819b055"],
    ["f01335fe-0807-46f2-ba02-0a84ca5a67c7", "63317742-a4cc-4e6a-86ec-f44075f9a0e8", "e92882a7-2d03-415b-8f85-e2533474eb69"],
  ]);
  for (const excludedId of [
    "c7ca6503-9746-4604-964a-cbe53c118009",
    "87932c67-cdca-4d6c-bb20-691b59f8961f",
    "513f1e78-5bfa-4ff2-a8a8-6986498d1987",
    "3082b962-009c-4e4f-b5c4-ec2adcb27027",
    "30d1f7a6-09a9-4e44-9a0a-f6c15eca5b8f",
    "dc395544-9d24-4869-b6c7-ac020dea959f",
    "82dc2e82-19fa-478a-b9a3-6ea6da4a6168",
    "040cdd06-76c7-4110-8307-73eea19c8e34",
    "0b9ac36f-ece0-4dff-a057-e4631d0d166f",
    "0eaf57a1-218d-481b-8240-9ad5bba64bc8",
    "1f1402cb-ec67-4db0-b8ad-332e9e09036c",
    "2a7b06c0-2167-4456-af74-1e2e0b1c22ca",
    "3175e652-bab7-4d90-8096-b4cb3c1daf37",
    "3eaf8f70-da39-4bda-a4f4-9601692c7ffa",
    "75154bb3-1c14-43fd-b9a5-a86cad2fb831",
    "7ce5a763-3180-43ad-b0f1-0a8fa2431b02",
    "99bb7f1b-5201-4992-bd7d-75c00ccb3097",
    "b3480d1a-e929-4461-8190-61fd3928d879",
    "d0a7179c-4319-4f9d-b821-eeb76778725f",
    "eba1b438-80fb-4cea-bd2d-822568e25357",
    "f78093d2-db60-481e-893e-fa4de40c23b5",
  ]) {
    assert.doesNotMatch(targets, new RegExp(excludedId));
  }
  assert.doesNotMatch(migration, /p_(?:service|quotation|abs)_id\s+uuid/i);
});

test("the narrow role boundary and invoker guard protect ordinary ABS lifecycle checks", () => {
  assert.match(
    migration,
    /^-- [^\n]+\n-- [^\n]+\n-- [^\n]+\s+BEGIN;\s+DO \$migration_preflight\$[\s\S]*?\$migration_preflight\$;[\s\S]*\nCOMMIT;\s*$/,
  );
  assert.match(migration, /PERFORM 1[\s\S]*?FROM public\.app_users AS u[\s\S]*?FOR SHARE;[\s\S]*?GET DIAGNOSTICS v_actor_count = ROW_COUNT/);
  assert.match(migration, /CREATE FUNCTION public\.retire_w11_m0_01_approved_abs\(p_owner_actor_id text\)[\s\S]*?SECURITY DEFINER\s+SET search_path = pg_catalog, public/);
  assert.match(migration, /CREATE FUNCTION public\.enforce_w11_m0_01_retirement_context\(\)[\s\S]*?SECURITY INVOKER\s+SET search_path = pg_catalog, public/);
  assert.match(migration, /current_user <> 'postgres'/);
  assert.match(migration, /w11_m0_01_prior_abs_audit_state_mismatch/);
  assert.match(migration, /v_now = v_max_audit_timestamp/);
  assert.match(migration, /v_service_deleted_at IS NOT NULL\s+AND NOT \(v_is_w11_m0_01_retirement AND v_service_status = 'Approved'\)/);
  assert.match(migration, /IF v_service_status = 'Completed' THEN[\s\S]*?scope_service_lifecycle_ineligible/);
  assert.match(migration, /w11_m0_01_prior_batch_state_mismatch/);
  assert.match(migration, /w11_m0_01_downstream_links_found/);

  const grants = [...migration.matchAll(/^GRANT EXECUTE ON FUNCTION public\.(\w+)\([^\n]* TO service_role;/gim)];
  assert.deepEqual(grants.map((match) => match[1]), ["retire_w11_m0_01_approved_abs"]);
  for (const helper of [
    "_w11_m0_01_retirement_targets",
    "_w11_m0_01_downstream_link_counts",
    "_w11_m0_01_valid_state_count",
    "enforce_w11_m0_01_retirement_context",
    "retire_w11_m0_01_approved_abs",
  ]) {
    assert.match(migration, new RegExp("REVOKE ALL ON FUNCTION public\\." + helper + "\\("));
  }
  assert.doesNotMatch(migration, /GRANT\s+(?:SELECT|INSERT|UPDATE|DELETE|ALL)\s+ON\s+(?:TABLE\s+)?public\./i);
});

test("the batch changes only fourteen ABS headers and appends one audit event per ABS", () => {
  const updateTargets = [...migration.matchAll(/^\s*UPDATE\s+public\.(\w+)/gim)].map((match) => match[1]);
  const insertTargets = [...migration.matchAll(/^\s*INSERT\s+INTO\s+public\.(\w+)/gim)].map((match) => match[1]);
  assert.deepEqual(updateTargets, ["approved_billing_scopes"]);
  assert.deepEqual(insertTargets, ["audit_logs"]);
  assert.match(migration, /SET status = 'voided',[\s\S]*?voided_by = v_owner_actor_id,[\s\S]*?void_reason = v_reason/);
  assert.match(migration, /GET DIAGNOSTICS v_locked_count = ROW_COUNT;\s+IF v_locked_count <> 14/);
  assert.match(migration, /GET DIAGNOSTICS v_audit_count = ROW_COUNT;\s+IF v_audit_count <> 14/);
  assert.match(migration, /w11_m0_01_audit_postcondition_mismatch/);
  assert.match(migration, /w11_m0_01_postcondition_state_mismatch/);
  assert.match(migration, /w11_m0_01_downstream_postcondition_failed/);
});

test("the downstream refusal graph covers the current contract without creating fixtures", () => {
  for (const relation of [
    "invoices",
    "payments",
    "customer_receipt_allocations",
    "customer_internal_credit_adjustments",
    "customer_credit_applications",
    "customer_refunds",
    "customer_internal_credit_adjustment_reversals",
    "approved_commitments",
    "approved_commitment_balances",
    "service_receipts",
    "service_supplier_allocations",
    "supplier_bookings",
    "expenses",
    "invoice_items",
    "invoice_draft_update_mutations",
    "customer_invoice_receivable_balances",
    "customer_invoice_settlement_balances",
    "customer_receipt_balances",
    "customer_receipt_reversals",
    "customer_credit_adjustment_balances",
    "customer_credit_application_reversals",
    "customer_refund_reversals",
    "project_tasks",
    "approved_commitment_amendments",
    "approved_commitment_documents",
    "service_receipt_documents",
    "service_receipt_corrections",
    "projects",
    "business_document_links",
    "service_tasks",
    "event_milestones",
    "service_procurement_requirements",
    "service_procurement_candidates",
    "service_procurement_candidate_documents",
    "service_procurement_packages",
    "service_procurement_package_requirements",
    "supplier_quotations",
    "supplier_quotation_documents",
    "supplier_quotation_lines",
    "supplier_quotation_requirements",
    "employee_cash_advances",
    "event_cost_budgets",
    "event_cost_close_versions",
    "event_cost_close_reopenings",
    "event_cost_etc_forecasts",
    "expense_documents",
    "expense_evidence_exceptions",
    "expense_reimbursement_settlements",
    "petty_cash_transactions",
    "cash_advance_expense_settlements",
    "expense_accountability_summaries",
    "supplier_advance_balances",
    "supplier_advance_commitment_balances",
    "supplier_advance_allocations",
    "supplier_advance_authorization_documents",
    "supplier_advance_authorization_releases",
    "supplier_advance_payments",
    "supplier_advance_payment_documents",
    "supplier_advance_payment_reversals",
    "supplier_advance_refunds",
    "supplier_advance_refund_documents",
    "supplier_bills",
    "supplier_bill_documents",
    "supplier_bill_payment_balances",
    "supplier_payments",
    "supplier_payment_documents",
    "supplier_payment_reversals",
    "accounting_ap_bridge_events",
    "accounting_expense_bridge_events",
    "accounting_journals",
    "accounting_source_effects",
    "accounting_inception_journal_links",
    "accounting_ar_bridge_event_versions",
    "accounting_ar_bridge_events",
    "accounting_ar_bridge_journal_lines",
    "accounting_ar_bridge_journal_links",
    "accounting_ap_bridge_event_versions",
    "accounting_ap_bridge_journal_lines",
    "accounting_ap_bridge_journal_links",
    "accounting_expense_bridge_event_versions",
    "accounting_expense_bridge_journal_lines",
    "accounting_expense_bridge_journal_links",
    "accounting_revenue_arrangements",
    "accounting_revenue_recognition_events",
    "accounting_revenue_recognition_journal_lines",
    "accounting_revenue_recognition_journal_links",
    "accounting_journal_line_versions",
    "accounting_journal_versions",
    "accounting_journal_events",
    "accounting_foundation_events",
  ]) {
    assert.match(migration, new RegExp("public\\." + relation + "\\b"));
    assert.match(downstreamPreflight, new RegExp("public\\." + relation + "\\b"));
  }
  assert.match(migration, /successor_approved_billing_scope_id/);
  assert.match(downstreamPreflight, /successor_approved_billing_scope_id/);
  assert.match(downstreamPreflight, /all_expanded_downstream_zero/);
  assert.match(remediationPreflight, /canonical_approval_count/);
  assert.match(remediationPreflight, /approved_billing_scope_approved/);
  assert.match(remediationPreflight, /actor_matches_approved_by/);
  assert.match(remediationPreflight, /timestamp_matches_approved_at/);
  assert.match(remediationPreflight, /protected_exclusions/);
  assert.doesNotMatch(migration, /INSERT\s+INTO\s+public\.(?:invoices|payments|accounting_[a-z_]+|service_receipts)/i);
});

test("the executed postflight artifact verifies exact retirement and stays read-only", () => {
  for (const metric of [
    "target_count",
    "abs_row_count",
    "retired_abs_count",
    "active_target_count",
    "service_integrity_count",
    "quotation_integrity_count",
    "batch_event_count",
    "batch_distinct_abs_count",
    "batch_non_target_event_count",
    "exact_target_audit_count",
    "protected_exclusions",
    "nonzero_downstream_relations",
  ]) {
    assert.match(postflight, new RegExp("'" + metric + "'"));
  }
  assert.match(postflight, /item_digest_matches/);
  assert.match(postflight, /Read-only/);
  assert.doesNotMatch(postflight, /\b(?:INSERT\s+INTO|UPDATE\s+public\.|DELETE\s+FROM|TRUNCATE|ALTER|CREATE)\b/i);
});
