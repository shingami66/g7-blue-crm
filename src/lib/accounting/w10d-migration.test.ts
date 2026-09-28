import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(
  new URL("../../../supabase/migrations/20260928105910_w10d_accounts_receivable_accounting_bridge.sql", import.meta.url),
  "utf8",
);
const mappingCompatibilityMigration = readFileSync(
  new URL("../../../supabase/migrations/20260928141020_w10d_posting_mapping_key_compatibility.sql", import.meta.url),
  "utf8",
);
const auditCompatibilityMigration = readFileSync(
  new URL("../../../supabase/migrations/20260928160000_w10d_audit_action_compatibility.sql", import.meta.url),
  "utf8",
);
const rollbackFixture = readFileSync(
  new URL("../../../supabase/verification/w10d_accounts_receivable_bridge_rollback_regression.sql", import.meta.url),
  "utf8",
);

const tables = [
  "accounting_ar_bridge_events",
  "accounting_ar_bridge_event_versions",
  "accounting_ar_bridge_journal_links",
  "accounting_ar_bridge_journal_lines",
];

const rpcs = [
  "save_accounting_ar_bridge_event",
  "prepare_accounting_ar_bridge_event",
  "post_accounting_ar_bridge_journal",
  "get_accounting_ar_bridge_reconciliation",
];

test("W10D adds only its four immutable RPC-only accounting evidence tables and four public RPC grants", () => {
  const createdTables = [...migration.matchAll(/CREATE TABLE public\.(\w+)/g)].map((match) => match[1]);
  assert.deepEqual(createdTables.sort(), [...tables].sort());

  const grantedRpcs = [...migration.matchAll(/GRANT EXECUTE ON FUNCTION public\.(\w+)\(/g)]
    .map((match) => match[1]);
  assert.deepEqual(grantedRpcs.sort(), [...rpcs].sort());

  for (const table of tables) {
    assert.match(migration, new RegExp(`ALTER TABLE public\\.${table} ENABLE ROW LEVEL SECURITY;`));
  }
  assert.match(migration, /REVOKE ALL ON TABLE public\.accounting_ar_bridge_events,[\s\S]{0,250}FROM PUBLIC,anon,authenticated,service_role;/);
  assert.match(migration, /BEFORE UPDATE OR DELETE ON public\.accounting_ar_bridge_event_versions/);
  assert.match(migration, /BEFORE TRUNCATE ON public\.accounting_ar_bridge_event_versions/);
  assert.match(migration, /UNIQUE\(profile_id,source_type,source_record_id\)/);
  assert.match(migration, /UNIQUE\(profile_id,source_record_key,economic_event_key\)/);
  assert.doesNotMatch(migration, /(?:INSERT INTO|UPDATE|DELETE FROM) public\.(?:payments|customer_receipt_allocations|customer_internal_credit_adjustments|customer_credit_applications|customer_refunds)\b/i);
});

test("W10D identities and posting specs preserve one cash effect and hold unsupported revenue treatments", () => {
  assert.match(migration, /'source_record_key','W7\/'\|\|p_source_type\|\|'\/'\|\|p_source_record_id::text/);
  assert.match(migration, /'economic_event_key','W7\/'\|\|p_source_type\|\|'\/'\|\|p_source_record_id::text\|\|'\/AR_EFFECT'/);
  assert.match(migration, /WHEN p_source_type IN \('PAYMENT','RECEIPT'\) AND p_classification='CUSTOMER_ADVANCE'[\s\S]*?'debit_key','CASH_ACCOUNT','credit_key','CUSTOMER_ADVANCE'/);
  assert.match(migration, /WHEN p_source_type='ALLOCATION' AND p_classification='SETTLEMENT'[\s\S]*?'debit_key','CUSTOMER_ADVANCE','credit_key','AR_CONTROL'/);
  assert.match(migration, /p_source_type IN \('CREDIT_APPLICATION','REFUND','ALLOCATION'\)/);
  assert.match(migration, /p_source_type='ALLOCATION' AND v_original_classification<>'CUSTOMER_ADVANCE'/);
  assert.match(migration, /'HELD_REVENUE_CORRECTION'/);
  assert.match(migration, /'revenue_correction_required'/);
  assert.doesNotMatch(migration, /WHEN p_source_type='INVOICE'[\s\S]{0,500}'debit_key','AR_CONTROL','credit_key','REVENUE'/);
});

test("W10D extends typed W10B journal authorization and blocks W10C-covered replay", () => {
  assert.match(migration, /public\.accounting_ar_bridge_mapping_authorized/);
  assert.match(migration, /public\.accounting_ar_bridge_line_authorized/);
  assert.match(migration, /public\.accounting_ar_bridge_journal_link_authorized/);
  assert.match(migration, /public\.accounting_ar_bridge_journal_account_authorized/);
  assert.match(migration, /cv\.classification IN \('RECONSTRUCTED_HISTORY','OPENING_BALANCE','UNRESOLVED'\)/);
  assert.match(migration, /SELECT l\.prepared_version INTO v_prepared_version/);
  assert.match(migration, /accounting:manage_ar_bridge/);
  assert.match(migration, /v_header\.source_domain<>['"]AR_BRIDGE['"]/);
  assert.doesNotMatch(migration, /CREATE OR REPLACE FUNCTION public\.reverse_accounting_journal\b/);
  assert.doesNotMatch(migration, /CREATE FUNCTION public\.(?:close|reopen|lock)_accounting_period\b/i);
  assert.match(migration, /public\.accounting_ar_bridge_account_authorized\(NEW\.profile_id,NEW\.mapping_key,/);
  assert.doesNotMatch(migration, /v_new:='NOT \(public\.accounting_inception_mapping_authorized[\s\S]{0,300}public\.accounting_ar_bridge_mapping_authorized/);
});

test("W10D reconciliation uses both historical boundaries and explicit source/party difference states", () => {
  assert.match(migration, /x\.created_at<=p_recorded_at_cutoff AND x\.source_recorded_at<=p_recorded_at_cutoff/);
  assert.match(migration, /jv\.posted_at<=p_recorded_at_cutoff AND jv\.accounting_date<=p_as_of_date/);
  assert.match(migration, /'MISSING_EFFECT'/);
  assert.match(migration, /'DUPLICATE_CONFLICT'/);
  assert.match(migration, /'INCEPTION_COVERED'/);
  assert.match(migration, /'party_difference_count'/);
  assert.match(migration, /'timing_difference_count'/);
});

test("W10D receipt reversal preserves the immutable receipt source snapshot and history", () => {
  assert.match(migration, /WHEN 'RECEIPT' THEN[\s\S]*?p\.invoice_id IS NULL AND NOT coalesce\(p\.is_deleted,false\),[\s\S]*?jsonb_build_object\('payment_number',p\.payment_number,'method',p\.method/);
  assert.match(migration, /SELECT 'PAYMENT',p\.id FROM public\.payments p[\s\S]{0,80}WHERE p\.invoice_id IS NOT NULL/);
  assert.match(migration, /SELECT 'RECEIPT',p\.id FROM public\.payments p[\s\S]{0,80}WHERE p\.invoice_id IS NULL/);
  const receiptSnapshotBranch = migration.match(
    /CREATE FUNCTION public\.accounting_ar_bridge_source_snapshot[\s\S]*?WHEN 'RECEIPT' THEN([\s\S]*?)WHEN 'ALLOCATION' THEN/,
  )?.[1];
  assert.ok(receiptSnapshotBranch, "W10D receipt source snapshot branch is missing");
  assert.doesNotMatch(receiptSnapshotBranch, /p\.status/);
});

test("W10D DEV fixture covers the bounded source classes and verifies explicit rollback with no residue", () => {
  assert.match(rollbackFixture, /^-- W10D synthetic DEV regression only\.[\s\S]*?\nBEGIN;/);
  for (const sourceType of [
    "INVOICE", "PAYMENT", "RECEIPT", "ALLOCATION", "RECEIPT_REVERSAL", "ALLOCATION_REVERSAL",
    "CREDIT_ADJUSTMENT", "CREDIT_ADJUSTMENT_REVERSAL", "CREDIT_APPLICATION",
    "CREDIT_APPLICATION_REVERSAL", "REFUND", "REFUND_REVERSAL",
  ]) {
    assert.ok(rollbackFixture.includes(`'${sourceType}'`), `fixture is missing ${sourceType}`);
  }
  for (const invariant of [
    "unsupported classification was not held",
    "invoice-linked payment must produce one cash effect",
    "inception-covered event was not rejected",
    "same request payload was not idempotent",
    "same request identity accepted changed payload",
    "protected AR control bypass was accepted",
    "accounting-date cutoff included a future entry",
    "recorded-at cutoff included a future event",
    "AR party reconciliation is not balanced",
    "trial balance is not balanced",
  ]) {
    assert.ok(rollbackFixture.includes(invariant), `fixture is missing assertion: ${invariant}`);
  }
  assert.match(rollbackFixture, /ROLLBACK;/);
  assert.match(rollbackFixture, /synthetic residue/i);
  for (const reversalTable of [
    "customer_receipt_reversals",
    "customer_receipt_allocation_reversals",
    "customer_internal_credit_adjustment_reversals",
    "customer_credit_application_reversals",
    "customer_refund_reversals",
  ]) {
    assert.ok(rollbackFixture.includes(`FROM public.${reversalTable}`), `residue check omits ${reversalTable}`);
  }
});


test("W10D bounds source inventory before snapshot reads and guards allocation ordering", () => {
  const sourceInventory = migration.match(
    /CREATE FUNCTION public\.accounting_ar_bridge_source_inventory\([\s\S]*?\$ar_source_inventory\$;/,
  )?.[0];
  assert.ok(sourceInventory, "W10D source inventory definition is missing");
  const sourceArms = sourceInventory.match(
    /WITH source_ids[\s\S]*?\), bounded_source_ids AS MATERIALIZED/,
  )?.[0];
  assert.ok(sourceArms, "W10D bounded source-id query is missing");

  assert.equal(
    [...sourceArms.matchAll(/ORDER BY [a-z]\.id LIMIT p_limit\)/g)].length,
    12,
    "each W7 source class must stop its identifier scan at the requested limit",
  );
  assert.equal(
    [...sourceArms.matchAll(/<=p_recorded_at_cutoff/g)].length,
    12,
    "each W7 source class must push down the recorded-at cutoff",
  );
  assert.equal(
    [...sourceArms.matchAll(/<=p_as_of_date/g)].length,
    12,
    "each W7 source class must push down the business-date cutoff",
  );
  assert.match(
    sourceInventory,
    /bounded_source_ids AS MATERIALIZED[\s\S]*?ORDER BY s\.source_type,s\.source_record_id LIMIT p_limit[\s\S]*?snapshots AS MATERIALIZED[\s\S]*?accounting_ar_bridge_source_snapshot/,
  );
  assert.match(
    migration,
    /FROM public\.accounting_ar_bridge_source_inventory\(p_as_of_date,p_recorded_at_cutoff,p_limit\+1\)/,
  );

  assert.ok(
    rollbackFixture.includes("allocation without a posted invoice origin was not held"),
    "fixture is missing the out-of-order invoice-origin guard",
  );
  assert.ok(
    rollbackFixture.includes("bounded W10D reconciliation limit was not enforced"),
    "fixture is missing the bounded reconciliation assertion",
  );
});

test("W10D adapts uppercase accounting roles to W10B lowercase posting-rule keys", () => {
  const postingSpec = mappingCompatibilityMigration.match(
    /CREATE OR REPLACE FUNCTION public\.accounting_ar_bridge_posting_spec\([\s\S]*?\$w10d_posting_spec_v2\$;/,
  )?.[0];
  assert.ok(postingSpec, "W10D lowercase-key posting spec replacement is missing");
  assert.doesNotMatch(postingSpec, /'(?:debit_key|credit_key)','[A-Z_]+/);
  assert.match(postingSpec, /'debit_role','AR_CONTROL'/);
  assert.match(mappingCompatibilityMigration, /CASE upper\(p_mapping_key\)/);
  assert.match(mappingCompatibilityMigration, /CASE upper\(v_line\.mapping_key\)/);
  assert.match(rollbackFixture, /'mapping_key',lower\(a\.mapping_key\)/);
  assert.match(rollbackFixture, /'mapping_key','ar_control'[\s\S]*?'mapping_key','contract_liability'/);
  const serviceRoleSection = rollbackFixture.match(/SET LOCAL ROLE service_role;([\s\S]*?)RESET ROLE;/)?.[1];
  assert.ok(serviceRoleSection, "W10D fixture service-role verification section is missing");
  assert.doesNotMatch(serviceRoleSection, /accounting_capability_catalog/);
  assert.match(rollbackFixture.slice(0, rollbackFixture.indexOf("SET LOCAL ROLE service_role;")), /accounting_capability_catalog/);
});

test("W10D audit compatibility scopes classify and hold actions to bridge events", () => {
  assert.match(auditCompatibilityMigration, /b29578d02f5c940c4a2b60be53707d49/);

  const existingGenericActions = [
    "create", "update", "delete", "restore", "status_change", "payment_recorded", "correction",
    "procurement_package_created", "procurement_package_updated", "procurement_package_requirements_set",
    "procurement_package_supplier_selected", "procurement_package_supplier_cleared", "expense_submitted",
    "expense_approved", "expense_rejected", "expense_cancelled", "expense_evidence_exception_recorded",
    "expense_evidence_exception_disposed", "expense_document_attached", "expense_reimbursement_settled",
    "cash_advance_requested", "cash_advance_approved", "cash_advance_rejected", "cash_advance_cancelled",
    "cash_advance_issued", "cash_advance_expense_settled", "cash_advance_returned",
    "petty_cash_transaction_recorded", "expense_finance_reviewed", "supplier_bill_recorded",
    "supplier_bill_updated", "supplier_bill_documents_attached", "supplier_bill_approved",
    "supplier_payment_recorded", "supplier_payment_reversed", "supplier_advance_authorized",
    "supplier_advance_payment_recorded", "supplier_advance_payment_reversed", "supplier_advance_allocated",
    "supplier_advance_allocation_corrected", "supplier_advance_refund_recorded",
    "customer_receipt_recorded", "customer_receipt_allocated", "customer_receipt_allocation_reversed",
    "customer_receipt_reversed",
  ];
  const actionCheck = auditCompatibilityMigration.match(
    /ADD CONSTRAINT audit_logs_action_check CHECK \(([\s\S]*?)\n\);/,
  )?.[1];
  assert.ok(actionCheck, "W10D audit action compatibility constraint is missing");

  const genericActions = actionCheck.match(/action = ANY \(ARRAY\[([\s\S]*?)\]\)\s+OR\s+\(/)?.[1];
  assert.ok(genericActions, "existing generic audit action array is missing");
  assert.deepEqual(
    [...genericActions.matchAll(/'([^']+)'::text/g)].map(([, action]) => action),
    existingGenericActions,
  );

  const scopedActions = [...actionCheck.matchAll(
    /\(\s*entity_type='([^']+)'\s+AND\s+action = ANY \(ARRAY\[([^\]]+)\]\)\s*\)/g,
  )].map(([, entityType, actions]) => [
    entityType,
    [...actions.matchAll(/'([^']+)'::text/g)].map(([, action]) => action),
  ]);
  assert.deepEqual(scopedActions, [
    ["accounting_journal", ["prepare", "post", "reverse"]],
    ["accounting_inception_package", ["save", "approve", "reject", "prepare", "accept"]],
    ["accounting_ar_bridge_event", ["classify", "hold"]],
  ]);
  assert.match(migration, /CASE WHEN v_status='HELD' THEN 'hold' ELSE 'classify' END/);
});
