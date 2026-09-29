import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";

const require = createRequire(import.meta.url);
const sourceRootUrl = new URL("../../", import.meta.url).href;
const { registerHooks } = require("node:module") as {
  registerHooks: (hooks: {
    resolve: (
      specifier: string,
      context: { parentURL?: string },
      nextResolve: (specifier: string, context: { parentURL?: string }) => { url: string; shortCircuit?: true },
    ) => { url: string; shortCircuit?: true };
  }) => void;
};

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith(".") && !specifier.endsWith(".ts") && context.parentURL?.startsWith(sourceRootUrl)) {
      return nextResolve(`${specifier}.ts`, context);
    }
    return nextResolve(specifier, context);
  },
});

const {
  accountingAccountVersionSchema,
  accountingCapabilitySchema,
  accountingPeriodVersionSchema,
  accountingGeneralLedgerInputSchema,
  accountingTrialBalanceInputSchema,
  prepareAccountingJournalInputSchema,
  accountingProfileInputSchema,
  saveAccountingAccountInputSchema,
  saveAccountingPeriodInputSchema,
  setAccountingCapabilityInputSchema,
  saveAccountingArBridgeEventInputSchema,
  saveAccountingApBridgeEventInputSchema,
  accountingArBridgeReconciliationSchema,
  saveAccountingExpenseBridgeEventInputSchema,
  accountingExpenseBridgeReconciliationSchema,
} = await import("./schemas.ts");

const inactiveProfile = {
  framework_key: "SA_IFRS_FOR_SMES",
  framework_edition: 2025,
  policy_version: "W10 provisional policy",
  endorsement_context: "Controller approved provisional baseline",
  professional_validation_state: "DEFERRED",
  professional_validation_evidence_ref: null,
  functional_currency: "SAR",
  fiscal_start_month: 1,
  fiscal_start_day: 1,
  fiscal_end_month: 12,
  fiscal_end_day: 31,
  fiscal_timezone: "Asia/Riyadh",
  accounting_start_date: null,
  cutover_boundary_date: null,
  legal_fiscal_evidence_pending: true,
  legal_fiscal_evidence_ref: null,
  vat_mode: "not_registered",
  zatca_state: "INACTIVE",
  fatoora_state: "INACTIVE",
  activation_state: "INACTIVE",
} as const;

test("capability schema recognizes only the fixed W10 vocabulary", () => {
  assert.equal(accountingCapabilitySchema.parse("accounting:view"), "accounting:view");
  assert.equal(accountingCapabilitySchema.parse("accounting:manage_chart"), "accounting:manage_chart");
  assert.equal(accountingCapabilitySchema.safeParse("accounting:future_key").success, false);
});

test("profile schema fixes the provisional accounting basis and defers professional validation", () => {
  assert.equal(accountingProfileInputSchema.safeParse(inactiveProfile).success, true);
  assert.equal(
    accountingProfileInputSchema.safeParse({ ...inactiveProfile, functional_currency: "USD" }).success,
    false,
  );
  assert.equal(
    accountingProfileInputSchema.safeParse({ ...inactiveProfile, framework_edition: 2024 }).success,
    false,
  );
  assert.equal(
    accountingProfileInputSchema.safeParse({ ...inactiveProfile, vat_mode: "registered" }).success,
    false,
  );
  assert.equal(
    accountingProfileInputSchema.safeParse({ ...inactiveProfile, activation_state: "PRODUCTION_ACTIVE" }).success,
    false,
  );
  assert.equal(
    accountingProfileInputSchema.safeParse({ ...inactiveProfile, professional_validation_state: "VALIDATED" }).success,
    false,
  );
});

test("DEV_PROVISIONAL requires ordered start and cutover dates", () => {
  assert.equal(
    accountingProfileInputSchema.safeParse({
      ...inactiveProfile,
      accounting_start_date: "2026-01-01",
      cutover_boundary_date: "2026-01-01",
      activation_state: "DEV_PROVISIONAL",
    }).success,
    true,
  );
  assert.equal(
    accountingProfileInputSchema.safeParse({
      ...inactiveProfile,
      accounting_start_date: null,
      cutover_boundary_date: null,
      activation_state: "DEV_PROVISIONAL",
    }).success,
    false,
  );
  assert.equal(
    accountingProfileInputSchema.safeParse({
      ...inactiveProfile,
      accounting_start_date: "2026-02-01",
      cutover_boundary_date: "2026-01-31",
      activation_state: "DEV_PROVISIONAL",
    }).success,
    false,
  );
});

test("authority request schema requires revisions, request identity, and no expiry for deny or revoke", () => {
  const base = {
    target_user_id: "9f09e715-9698-4804-a72b-331ebc776b8d",
    capability: "accounting:view",
    effect: "ALLOW",
    expires_at: null,
    expected_revision: 0,
    reason: "Approved by the Controller",
    evidence_ref: null,
    request_id: "6f5b2999-ea2b-4c2e-8928-93220196a910",
  } as const;
  assert.equal(setAccountingCapabilityInputSchema.safeParse(base).success, true);
  assert.equal(
    setAccountingCapabilityInputSchema.safeParse({ ...base, effect: "DENY", expires_at: "2027-01-01T00:00:00Z" }).success,
    false,
  );
  assert.equal(
    setAccountingCapabilityInputSchema.safeParse({ ...base, expected_revision: -1 }).success,
    false,
  );
  assert.equal(
    setAccountingCapabilityInputSchema.safeParse({ ...base, unexpected_actor_id: "browser-controlled" }).success,
    false,
  );
});


const chartAccount = {
  account_code: "TEMP-001",
  name_en: "Synthetic control heading",
  name_ar: "رأس اصطناعي",
  account_type: "ASSET",
  category: "synthetic",
  normal_balance: "DEBIT",
  account_kind: "NON_POSTING",
  parent_account_id: null,
  is_active: true,
  is_protected: true,
  control_classification: "CASH_ACCOUNTABILITY",
} as const;

test("account save schema preserves versioned identity and protected control classification", () => {
  const create = {
    account_id: null,
    expected_version: 0,
    account: chartAccount,
    reason: "Synthetic chart regression",
    evidence_ref: null,
    request_id: "00000000-0000-4000-8000-00000000a551",
  };
  assert.equal(saveAccountingAccountInputSchema.safeParse(create).success, true);
  assert.equal(
    saveAccountingAccountInputSchema.safeParse({ ...create, account_id: "00000000-0000-4000-8000-00000000a552" }).success,
    false,
  );
  assert.equal(
    saveAccountingAccountInputSchema.safeParse({
      ...create,
      account: { ...chartAccount, is_protected: false },
    }).success,
    false,
  );
  assert.equal(
    saveAccountingAccountInputSchema.safeParse({
      ...create,
      account: { ...chartAccount, parent_account_id: "not-a-uuid" },
    }).success,
    false,
  );
  assert.equal(
    accountingAccountVersionSchema.safeParse({
      ...chartAccount,
      account_id: "00000000-0000-4000-8000-00000000a553",
      profile_id: "00000000-0000-4000-8000-00000000a554",
      version: 1,
      is_current: true,
      previous_version: null,
      effective_from: "2026-09-27T00:00:00Z",
      reason: "Synthetic chart regression",
      evidence_ref: null,
      created_by: "00000000-0000-4000-8000-00000000a555",
      created_at: "2026-09-27T00:00:00Z",
    }).success,
    true,
  );
});

test("W10D event schema pairs classification evidence and requires accounting dates only for ready treatments", () => {
  const base = {
    source_type: "RECEIPT",
    source_record_id: "00000000-0000-4000-8000-00000000d701",
    expected_version: 0,
    classification: "CUSTOMER_ADVANCE",
    accounting_date: "2026-09-28",
    evidence_ref: "synthetic://w10d/receipt-cash-account",
    evidence_sha256: "a".repeat(64),
    reason: "Synthetic receipt classification",
    request_id: "00000000-0000-4000-8000-00000000d702",
  };
  assert.equal(saveAccountingArBridgeEventInputSchema.safeParse(base).success, true);
  assert.equal(
    saveAccountingArBridgeEventInputSchema.safeParse({ ...base, evidence_sha256: null }).success,
    false,
  );
  assert.equal(
    saveAccountingArBridgeEventInputSchema.safeParse({ ...base, accounting_date: null }).success,
    false,
  );
  assert.equal(
    saveAccountingArBridgeEventInputSchema.safeParse({
      ...base,
      classification: "HELD_REVENUE_CORRECTION",
      accounting_date: null,
      evidence_ref: null,
      evidence_sha256: null,
    }).success,
    true,
  );
});

test("W10E1 AP schema keeps receipt valuation explicit and binds only evidenced cash movements", () => {
  const base = {
    source_type: "SERVICE_RECEIPT",
    source_record_id: "00000000-0000-4000-8000-00000000e101",
    expected_version: 0,
    classification: "RECEIPT_ACCRUAL",
    amount_halalah: null,
    matched_receipt_halalah: "0",
    direct_classification: null,
    accounting_date: "2026-09-29",
    evidence_ref: null,
    evidence_sha256: null,
    cash_binding_evidence_ref: null,
    cash_binding_evidence_sha256: null,
    cash_account_id: null,
    cash_account_version: null,
    reason: "Accepted receipt without accounting valuation",
    request_id: "00000000-0000-4000-8000-00000000e102",
  };

  assert.equal(saveAccountingApBridgeEventInputSchema.safeParse(base).success, true);
  assert.equal(saveAccountingApBridgeEventInputSchema.safeParse({
    ...base,
    source_type: "SUPPLIER_BILL",
    amount_halalah: "1000",
  }).success, false);
  assert.equal(saveAccountingApBridgeEventInputSchema.safeParse({
    ...base,
    source_type: "SUPPLIER_PAYMENT",
    classification: "SUPPLIER_PAYMENT",
    amount_halalah: null,
    cash_binding_evidence_ref: "synthetic://w10e1/cash-binding",
    cash_binding_evidence_sha256: "a".repeat(64),
    cash_account_id: "00000000-0000-4000-8000-00000000e103",
    cash_account_version: 1,
  }).success, true);
  assert.equal(saveAccountingApBridgeEventInputSchema.safeParse({
    ...base,
    source_type: "SUPPLIER_BILL",
    cash_binding_evidence_ref: "synthetic://w10e1/not-cash",
    cash_binding_evidence_sha256: "a".repeat(64),
    cash_account_id: "00000000-0000-4000-8000-00000000e103",
    cash_account_version: 1,
  }).success, false);
  assert.equal(saveAccountingApBridgeEventInputSchema.safeParse({
    ...base,
    source_type: "SUPPLIER_BILL",
    matched_receipt_halalah: "1",
  }).success, true);
  assert.equal(saveAccountingApBridgeEventInputSchema.safeParse({
    ...base,
    source_type: "SUPPLIER_ADVANCE_ALLOCATION",
    classification: "SUPPLIER_ADVANCE_ALLOCATION",
    matched_receipt_halalah: "1",
  }).success, false);
});

test("W10D reconciliation schema carries held, duplicate, party, and source/accounting date differences", () => {
  const id = "00000000-0000-4000-8000-00000000d711";
  const reconciliation = {
    state: "READY",
    as_of_date: "2026-09-28",
    recorded_at_cutoff: "2026-09-28T12:00:00Z",
    source_event_count: 2,
    posted_effect_count: 1,
    held_unresolved_count: 1,
    inception_covered_count: 0,
    missing_effect_count: 0,
    duplicate_conflict_count: 0,
    party_difference_count: 1,
    timing_difference_count: 1,
    truncated: false,
    events: [{
      source_type: "INVOICE",
      source_record_id: id,
      source_record_key: `W7/INVOICE/${id}`,
      economic_event_key: `W7/INVOICE/${id}/AR_EFFECT`,
      reconciliation_status: "DUPLICATE_CONFLICT",
      event_id: null,
      event_version: null,
      classification: null,
      customer_id: id,
      service_id: id,
      invoice_id: id,
      amount_halalah: "12500",
      source_business_date: "2026-09-27",
      source_recorded_at: "2026-09-27T08:00:00Z",
      accounting_date: null,
      posted_accounting_date: null,
      posted_at: null,
      journal_id: null,
      held_code: null,
      expected_ar_delta_halalah: "12500",
      posted_ar_delta_halalah: "0",
      source_snapshot_sha256: null,
    }],
    party_balances: [{
      customer_id: id,
      service_id: id,
      invoice_id: id,
      source_ar_delta_halalah: "12500",
      posted_ar_delta_halalah: "0",
      difference_halalah: "12500",
    }],
  };
  assert.equal(accountingArBridgeReconciliationSchema.safeParse(reconciliation).success, true);
  assert.equal(accountingArBridgeReconciliationSchema.safeParse({ ...reconciliation, source_event_count: -1 }).success, false);
});

test("W10B journal and report schemas preserve versioned evidence and bounded cutoff inputs", () => {
  const journal = {
    accounting_date: "2301-01-15",
    period_id: "00000000-0000-4000-8000-00000000b903",
    period_version: 1,
    posting_rule_id: "00000000-0000-4000-8000-00000000b904",
    rule_version: 1,
    source_record_key: "synthetic-source-1",
    economic_event_key: "synthetic-event-1",
    posting_purpose: "manual-correction",
    description_en: "Synthetic journal",
    description_ar: "قيد اصطناعي",
    lines: [
      { mapping_key: "debit", side: "DEBIT", amount_halalah: "2500", service_id: null, description_en: "Debit", description_ar: "مدين" },
      { mapping_key: "credit", side: "CREDIT", amount_halalah: "2500", service_id: null, description_en: "Credit", description_ar: "دائن" },
    ],
  };
  const request = {
    journal_id: null,
    expected_version: 0,
    journal,
    reason: "Synthetic regression",
    evidence_ref: null,
    request_id: "00000000-0000-4000-8000-00000000b905",
  };
  assert.equal(prepareAccountingJournalInputSchema.safeParse(request).success, true);
  assert.equal(prepareAccountingJournalInputSchema.safeParse({ ...request, journal: { ...journal, lines: journal.lines.slice(0, 1) } }).success, false);
  assert.equal(prepareAccountingJournalInputSchema.safeParse({ ...request, actor_user_id: "browser-controlled" }).success, false);
  assert.equal(prepareAccountingJournalInputSchema.safeParse({ ...request, expected_version: 1 }).success, false);

  const ledgerInput = {
    from_date: "2301-01-01",
    through_date: "2301-01-31",
    recorded_at_cutoff: "2301-02-01T00:00:00Z",
    account_id: null,
    service_id: null,
    offset: 0,
    limit: 100,
  };
  assert.equal(accountingGeneralLedgerInputSchema.safeParse(ledgerInput).success, true);
  assert.equal(accountingGeneralLedgerInputSchema.safeParse({ ...ledgerInput, through_date: "2300-12-31" }).success, false);
  assert.equal(accountingGeneralLedgerInputSchema.safeParse({ ...ledgerInput, limit: 501 }).success, false);
  assert.equal(accountingTrialBalanceInputSchema.safeParse({
    as_of_date: "2301-01-31",
    recorded_at_cutoff: null,
    service_id: null,
    offset: 0,
    limit: 100,
  }).success, true);

  const closedPeriod = {
    period_id: "00000000-0000-4000-8000-00000000b906",
    profile_id: "00000000-0000-4000-8000-00000000b907",
    version: 2,
    is_current: true,
    previous_version: 1,
    start_date: "2301-01-01",
    end_date: "2301-01-31",
    status: "CLOSED",
    effective_from: "2301-02-01T00:00:00Z",
    reason: "Synthetic period-state seam",
    evidence_ref: null,
    created_by: "00000000-0000-4000-8000-00000000b908",
    created_at: "2301-02-01T00:00:00Z",
  };
  assert.equal(accountingPeriodVersionSchema.safeParse(closedPeriod).success, true);
  assert.equal(accountingPeriodVersionSchema.safeParse({ ...closedPeriod, status: "LOCKED" }).success, true);
});

test("period schema supports arbitrary OPEN boundaries and rejects invalid, reversed, or close-state input", () => {
  const create = {
    period_id: null,
    expected_version: 0,
    period: { start_date: "2026-10-03", end_date: "2026-10-19", status: "OPEN" },
    reason: "Synthetic period regression",
    evidence_ref: null,
    request_id: "00000000-0000-4000-8000-00000000a561",
  };
  assert.equal(saveAccountingPeriodInputSchema.safeParse(create).success, true);
  assert.equal(
    saveAccountingPeriodInputSchema.safeParse({
      ...create,
      period: { start_date: "2026-10-20", end_date: "2026-10-19", status: "OPEN" },
    }).success,
    false,
  );
  assert.equal(
    saveAccountingPeriodInputSchema.safeParse({
      ...create,
      period: { start_date: "2026-02-29", end_date: "2026-03-02", status: "OPEN" },
    }).success,
    false,
  );
  assert.equal(
    saveAccountingPeriodInputSchema.safeParse({
      ...create,
      period: { start_date: "2026-10-03", end_date: "2026-10-19", status: "CLOSED" },
    }).success,
    false,
  );
  assert.equal(
    accountingPeriodVersionSchema.safeParse({
      period_id: "00000000-0000-4000-8000-00000000a562",
      profile_id: "00000000-0000-4000-8000-00000000a554",
      version: 1,
      is_current: true,
      previous_version: null,
      start_date: "2026-10-03",
      end_date: "2026-10-19",
      status: "OPEN",
      effective_from: "2026-09-27T00:00:00Z",
      reason: "Synthetic period regression",
      evidence_ref: null,
      created_by: "00000000-0000-4000-8000-00000000a555",
      created_at: "2026-09-27T00:00:00Z",
    }).success,
    true,
  );
});


test("W10E2 accepts explicit missing-provenance candidates for fail-closed database holds", () => {
  const base = {
    source_type: "EXPENSE_REIMBURSEMENT_SETTLEMENT",
    source_record_id: "00000000-0000-4000-8000-00000000e401",
    expected_version: 0,
    classification: "REIMBURSEMENT_ADVANCE_OFFSET",
    direct_classification: null,
    accounting_date: "2026-09-29",
    service_attribution: "SERVICE",
    expense_account_id: null,
    expense_account_version: null,
    control_account_id: null,
    control_account_version: null, advance_account_id: null, advance_account_version: null,
    cash_account_id: null,
    cash_account_version: null,
    cash_binding_evidence_ref: null,
    cash_binding_evidence_sha256: null,
    evidence_ref: null,
    evidence_sha256: null,
    related_advance_id: null,
    advance_provenance_evidence_ref: null,
    advance_provenance_evidence_sha256: null,
    return_direction: null,
    reason: "Missing structured advance provenance is held by the accounting bridge",
    request_id: "00000000-0000-4000-8000-00000000e402",
  };

  assert.equal(saveAccountingExpenseBridgeEventInputSchema.safeParse(base).success, true);
  assert.equal(saveAccountingExpenseBridgeEventInputSchema.safeParse({
    ...base,
    source_type: "PETTY_CASH_TRANSACTION",
    source_record_id: "00000000-0000-4000-8000-00000000e403",
    classification: "PETTY_RETURN_TO_TREASURY",
  }).success, true);
  assert.equal(saveAccountingExpenseBridgeEventInputSchema.safeParse({
    ...base,
    classification: "expense_category",
  }).success, false);
  assert.equal(saveAccountingExpenseBridgeEventInputSchema.safeParse({
    ...base,
    evidence_ref: "synthetic://w10e2/unhashed",
  }).success, false);
  assert.equal(accountingExpenseBridgeReconciliationSchema.safeParse({ state: "NOT_INITIALIZED" }).success, true);
});
