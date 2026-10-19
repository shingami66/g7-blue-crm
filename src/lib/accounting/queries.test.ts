import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test, { mock } from "node:test";

type ResolveResult = { url: string; shortCircuit?: true };
type ResolveContext = { parentURL?: string };
type TargetQuery = {
  table: string;
  columns: string | null;
  filters: Array<{ method: "eq" | "neq" | "in" | "lte"; column: string; value: unknown }>;
  orders: Array<{ column: string; ascending: boolean; nullsFirst?: boolean }>;
  limit: number | null;
};
type QueryState = {
  rpc: (name: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: { code?: string } | null }>;
  calls: Array<{ name: string; args: Record<string, unknown> }>;
  permission: string | null;
  usersManage: boolean;
  targetRows: unknown;
  targetRowsByTable: Record<string, unknown>;
  targetQuery: TargetQuery | null;
  targetQueries: TargetQuery[];
};

const require = createRequire(import.meta.url);
const sourceRootUrl = new URL("../../", import.meta.url).href;
const { registerHooks } = require("node:module") as {
  registerHooks: (hooks: {
    resolve: (specifier: string, context: ResolveContext, nextResolve: (specifier: string, context: ResolveContext) => ResolveResult) => ResolveResult;
  }) => void;
};

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "server-only") {
      return { shortCircuit: true, url: "data:text/javascript,export default {}" };
    }
    if (specifier.startsWith("@/")) {
      return { shortCircuit: true, url: new URL(`../../${specifier.slice(2)}.ts`, import.meta.url).href };
    }
    if (specifier.startsWith(".") && !specifier.endsWith(".ts") && context.parentURL?.startsWith(sourceRootUrl)) {
      return nextResolve(`${specifier}.ts`, context);
    }
    return nextResolve(specifier, context);
  },
});

let state: QueryState = {
  rpc: async () => ({ data: null, error: null }),
  calls: [],
  permission: null,
  usersManage: true,
  targetRows: [],
  targetRowsByTable: {},
  targetQuery: null,
  targetQueries: [],
};

mock.module("@/lib/auth/permissions", {
  namedExports: {
    requireUser: async () => ({ id: "8cefe8c1-7914-4b3b-915d-24d6fcdfc76f", role: "viewer", is_active: true }),
    requirePermission: async (permission: string) => {
      state.permission = permission;
      return { id: "8cefe8c1-7914-4b3b-915d-24d6fcdfc76f", role: "viewer", is_active: true };
    },
    checkPermission: async (permission: string) => {
      state.permission = permission;
      return state.usersManage;
    },
  },
});

mock.module("@/lib/supabase/admin", {
  namedExports: {
    createAdminClient: () => ({
      rpc: async (name: string, args: Record<string, unknown>) => {
        state.calls.push({ name, args });
        return state.rpc(name, args);
      },
      from: (table: string) => {
        const queryState: TargetQuery = {
          table,
          columns: null,
          filters: [],
          orders: [],
          limit: null,
        };
        state.targetQuery = queryState;
        state.targetQueries.push(queryState);
        const rows = () => Object.prototype.hasOwnProperty.call(state.targetRowsByTable, table)
          ? state.targetRowsByTable[table]
          : state.targetRows;
        const query = {
          select(columns: string) {
            queryState.columns = columns;
            return query;
          },
          eq(column: string, value: unknown) {
            queryState.filters.push({ method: "eq", column, value });
            return query;
          },
          neq(column: string, value: unknown) {
            queryState.filters.push({ method: "neq", column, value });
            return query;
          },
          in(column: string, value: unknown) {
            queryState.filters.push({ method: "in", column, value });
            return query;
          },
          lte(column: string, value: unknown) {
            queryState.filters.push({ method: "lte", column, value });
            return query;
          },
          order(column: string, options: { ascending: boolean; nullsFirst?: boolean }) {
            queryState.orders.push({ column, ...options });
            return query;
          },
          async limit(value: number) {
            queryState.limit = value;
            return { data: rows(), error: null };
          },
          async maybeSingle() {
            const data = rows();
            return { data: Array.isArray(data) ? data[0] ?? null : data, error: null };
          },
        };
        return query;
      },
    }),
  },
});

const {
  getAccountingProfile,
  getAccountingSetupStatus,
  listAccountingSetupTargets,
  listAccountingAccounts,
  listAccountingCapabilityAssignments,
  listAccountingPeriods,
  listAccountingPostingRules,
  getAccountingJournal,
  getAccountingGeneralLedger,
  getAccountingTrialBalance,
  getAccountingRevenueReconciliation,
  getAccountingW10HReport,
  listAccountingBankBindings,
  getAccountingBankReconciliationHistory,
  getAccountingArBridgeReconciliation,
} = await import("./queries.ts");
const { AuthDependencyError } = await import("../auth/errors.ts");
const actorId = "8cefe8c1-7914-4b3b-915d-24d6fcdfc76f";

function resetState(rpc: QueryState["rpc"]) {
  state = { rpc, calls: [], permission: null, usersManage: true, targetRows: [], targetRowsByTable: {}, targetQuery: null, targetQueries: [] };
}

test("AAR-D1 setup status uses the trusted actor and validates the discriminated response", async () => {
  resetState(async () => ({ data: { state: "NOT_INITIALIZED", can_bootstrap: true }, error: null }));

  assert.deepEqual(await getAccountingSetupStatus(), { state: "NOT_INITIALIZED", can_bootstrap: true });
  assert.deepEqual(state.calls, [{
    name: "get_accounting_setup_status",
    args: { p_actor_user_id: actorId },
  }]);

  resetState(async () => ({ data: { state: "INITIALIZED", can_manage_profile: true }, error: null }));
  await assert.rejects(() => getAccountingSetupStatus(), /Accounting setup status response was invalid/);
});

test("AAR-D1 setup targets allow CRM Admin or accounting authority and remain active-only and bounded", async () => {
  resetState(async () => ({ data: false, error: null }));
  state.targetRows = [{ id: "9f09e715-9698-4804-a72b-331ebc776b8d", name: "Target", role: "accountant" }];

  assert.deepEqual(await listAccountingSetupTargets(true), state.targetRows);
  assert.equal(state.permission, "users:manage");
  assert.deepEqual(state.targetQuery, {
    table: "app_users",
    columns: "id,name,role",
    filters: [
      { method: "eq", column: "is_active", value: true },
      { method: "neq", column: "id", value: actorId },
    ],
    orders: [
      { column: "name", ascending: true, nullsFirst: false },
      { column: "id", ascending: true },
    ],
    limit: 100,
  });

  resetState(async () => ({ data: false, error: null }));
  state.usersManage = false;
  await assert.rejects(() => listAccountingSetupTargets(), /Accounting authority is required/);
  assert.equal(state.targetQuery, null);
  assert.deepEqual(state.calls, [{
    name: "get_accounting_capability",
    args: { p_actor_user_id: actorId, p_capability: "accounting:manage_authority" },
  }]);
});

test("profile query allows an explicit manage_profile grant without a CRM role grant", async () => {
  resetState(async (name, args) => {
    if (name === "get_accounting_capability") {
      return { data: args.p_capability === "accounting:manage_profile", error: null };
    }
    return { data: { state: "NOT_INITIALIZED" }, error: null };
  });

  assert.deepEqual(await getAccountingProfile(), { state: "NOT_INITIALIZED" });
  assert.deepEqual(state.calls.map(({ name }) => name), [
    "get_accounting_capability",
    "get_accounting_capability",
    "get_accounting_profile",
  ]);
  assert.equal(state.calls[2].args.p_actor_user_id, "8cefe8c1-7914-4b3b-915d-24d6fcdfc76f");
  assert.equal("p_actor_role" in state.calls[2].args, false);
});

test("authority assignment query requires the canonical capability and sends no browser actor", async () => {
  resetState(async () => ({ data: [], error: null }));
  assert.deepEqual(
    await listAccountingCapabilityAssignments({ target_user_id: "9f09e715-9698-4804-a72b-331ebc776b8d" }),
    [],
  );
  assert.equal(state.permission, "accounting:manage_authority");
  assert.deepEqual(state.calls, [
    {
      name: "list_accounting_capability_assignments",
      args: {
        p_actor_user_id: "8cefe8c1-7914-4b3b-915d-24d6fcdfc76f",
        p_target_user_id: "9f09e715-9698-4804-a72b-331ebc776b8d",
      },
    },
  ]);
});

test("query dependency and malformed responses fail closed without exposing database details", async () => {
  resetState(async (name) => ({
    data: name === "get_accounting_capability"
      ? true
      : { state: "NOT_INITIALIZED", secret: "hidden" },
    error: null,
  }));
  await assert.rejects(() => getAccountingProfile(), (error: unknown) => {
    assert.ok(error instanceof AuthDependencyError);
    assert.equal(error.message.includes("hidden"), false);
    return true;
  });

  resetState(async () => ({ data: null, error: { code: "57P01" } }));
  await assert.rejects(() => listAccountingCapabilityAssignments({ target_user_id: "9f09e715-9698-4804-a72b-331ebc776b8d" }), AuthDependencyError);
});

test("W10H report reads pass the authenticated actor to the database gate and preserve exact RPC strings", async () => {
  const report = {
    report_type: "PROFIT_AND_LOSS",
    state: "PARTIAL",
    reason_codes: ["SOURCE_RECONCILIATION_NOT_BOUNDARY_VERIFIED"],
    from_date: "2026-01-01",
    through_date: "2026-09-30",
    recorded_at_cutoff: "2026-09-30T11:00:00+03:00",
    generated_at: "2026-09-30T11:01:00+03:00",
    mapping_version: 2,
    total_count: 1,
    has_more: false,
    rows: [{
      amount_halalah: "9007199254740993",
      journal_evidence: [{
        journal_id: "00000000-0000-4000-8000-00000000f001",
        journal_version: 1,
        source_domain: "CONTROLLED_MANUAL",
        accounting_date: "2026-09-30",
        posted_at: "2026-09-30T11:00:00+03:00",
        reversal_of_journal_id: null,
        correction_group_id: "00000000-0000-4000-8000-00000000f002",
        service_id: null,
        service_number: null,
        event_name: null,
        event_type: null,
        line_number: 1,
        side: "CREDIT",
        amount_halalah: "9007199254740993",
      }],
    }],
    line_totals: [],
    totals: { revenue_halalah: "9007199254740993", expense_halalah: "0", profit_loss_halalah: "9007199254740993" },
    service_id: null,
    account_id: null,
  };
  resetState(async (name) => ({ data: name === "get_w10h_accounting_report" ? report : false, error: null }));
  const result = await getAccountingW10HReport({
    report_type: "PROFIT_AND_LOSS", from_date: "2026-01-01", through_date: "2026-09-30",
    recorded_at_cutoff: "2026-09-30T11:00:00+03:00", account_id: null, service_id: null, offset: 0, limit: 50,
  });
  assert.equal(state.permission, null);
  assert.equal(result.rows[0]?.amount_halalah, "9007199254740993");
  assert.equal(result.rows[0]?.journal_evidence?.[0]?.amount_halalah, "9007199254740993");
  assert.deepEqual(state.calls[0], {
    name: "get_w10h_accounting_report",
    args: {
      p_actor_user_id: actorId,
      p_report_type: "PROFIT_AND_LOSS",
      p_from_date: "2026-01-01",
      p_through_date: "2026-09-30",
      p_recorded_at_cutoff: "2026-09-30T11:00:00+03:00",
      p_account_id: null,
      p_service_id: null,
      p_offset: 0,
      p_limit: 50,
    },
  });

  const unsafeNestedReport = {
    ...report,
    rows: [{
      ...report.rows[0],
      journal_evidence: [{ ...report.rows[0].journal_evidence[0], amount_halalah: 9007199254740993 }],
    }],
  };
  resetState(async (name) => ({
    data: name === "get_w10h_accounting_report" ? unsafeNestedReport : false,
    error: null,
  }));
  await assert.rejects(
    () => getAccountingW10HReport({
      report_type: "PROFIT_AND_LOSS", from_date: "2026-01-01", through_date: "2026-09-30",
      recorded_at_cutoff: "2026-09-30T11:00:00+03:00", account_id: null, service_id: null, offset: 0, limit: 50,
    }),
    (error: unknown) => error instanceof AuthDependencyError
      && error.message === "Accounting report response was invalid",
  );
});

test("W10H initialized-report capability denials are enforced by the database RPC", async () => {
  resetState(async () => ({ data: null, error: { code: "42501" } }));
  await assert.rejects(() => getAccountingW10HReport({
    report_type: "PROFIT_AND_LOSS", from_date: "2026-01-01", through_date: "2026-09-30",
    recorded_at_cutoff: null, account_id: null, service_id: null, offset: 0, limit: 50,
  }), /Accounting capability required/);
  assert.equal(state.permission, null);
  assert.equal(state.calls[0]?.args.p_actor_user_id, actorId);
});


test("chart and period reads use the existing explicit accounting capability resolver and validate history", async () => {
  const accountRow = {
    account_id: "00000000-0000-4000-8000-00000000a591",
    profile_id: "00000000-0000-4000-8000-00000000a592",
    version: 1,
    is_current: true,
    previous_version: null,
    account_code: "TEMP-001",
    name_en: "Synthetic account",
    name_ar: "حساب اصطناعي",
    account_type: "ASSET",
    category: "synthetic",
    normal_balance: "DEBIT",
    account_kind: "POSTING",
    parent_account_id: null,
    is_active: true,
    is_protected: false,
    control_classification: "NONE",
    effective_from: "2026-09-27T00:00:00Z",
    reason: "Synthetic chart read",
    evidence_ref: null,
    created_by: "00000000-0000-4000-8000-00000000a593",
    created_at: "2026-09-27T00:00:00Z",
  };
  const periodRow = {
    period_id: "00000000-0000-4000-8000-00000000a594",
    profile_id: "00000000-0000-4000-8000-00000000a592",
    version: 1,
    is_current: true,
    previous_version: null,
    start_date: "2026-10-03",
    end_date: "2026-10-19",
    status: "OPEN",
    effective_from: "2026-09-27T00:00:00Z",
    reason: "Synthetic period read",
    evidence_ref: null,
    created_by: "00000000-0000-4000-8000-00000000a593",
    created_at: "2026-09-27T00:00:00Z",
  };
  resetState(async (name, args) => {
    if (name === "get_accounting_capability") {
      return {
        data: args.p_capability === "accounting:manage_chart" || args.p_capability === "accounting:manage_periods",
        error: null,
      };
    }
    if (name === "list_accounting_accounts") return { data: [accountRow], error: null };
    if (name === "list_accounting_periods") return { data: [periodRow], error: null };
    return { data: null, error: null };
  });

  assert.deepEqual(await listAccountingAccounts(), [accountRow]);
  assert.deepEqual(await listAccountingPeriods(), [periodRow]);
  const capabilityCalls = state.calls.filter(({ name }) => name === "get_accounting_capability");
  assert.deepEqual(
    capabilityCalls.map(({ args }) => args.p_capability),
    ["accounting:view", "accounting:manage_chart", "accounting:view", "accounting:manage_periods"],
  );
  assert.equal(state.calls.find(({ name }) => name === "list_accounting_accounts")?.args.p_actor_user_id,
    "8cefe8c1-7914-4b3b-915d-24d6fcdfc76f");
  assert.equal("p_actor_role" in (state.calls.find(({ name }) => name === "list_accounting_periods")?.args ?? {}), false);
});

test("W10B accounting readers validate rule, journal, ledger, and Trial Balance RPC contracts", async () => {
  const profileId = "00000000-0000-4000-8000-00000000b940";
  const ruleId = "00000000-0000-4000-8000-00000000b941";
  const periodId = "00000000-0000-4000-8000-00000000b942";
  const journalId = "00000000-0000-4000-8000-00000000b943";
  const accountId = "00000000-0000-4000-8000-00000000b944";
  const timestamp = "2301-01-15T10:00:00Z";
  const rule = {
    posting_rule_id: ruleId,
    profile_id: profileId,
    version: 1,
    is_current: true,
    previous_version: null,
    rule_code: "SYNTHETIC_MANUAL",
    name_en: "Synthetic rule",
    name_ar: "قاعدة اصطناعية",
    is_active: true,
    effective_from: timestamp,
    reason: "Synthetic read",
    evidence_ref: null,
    created_by: actorId,
    created_at: timestamp,
    mappings: [{
      mapping_key: "debit",
      account_id: accountId,
      account_version: 1,
      allowed_side: "DEBIT",
      service_requirement: "OPTIONAL",
    }],
  };
  const line = {
    mapping_key: "debit",
    side: "DEBIT",
    amount_halalah: "2500",
    service_id: null,
    description_en: "Synthetic debit",
    description_ar: "مدين اصطناعي",
    line_number: 1,
    account_id: accountId,
    account_version: 1,
    account_code: "SYN-001",
    name_en: "Synthetic account",
    name_ar: "حساب اصطناعي",
    account_type: "ASSET",
    normal_balance: "DEBIT",
    service_number: null,
    event_name: null,
    event_type: null,
    event_start_date: null,
    event_end_date: null,
  };
  const journal = {
    journal_id: journalId,
    profile_id: profileId,
    correction_group_id: journalId,
    reversal_of_journal_id: null,
    current_version: 1,
    versions: [{
      version: 1,
      previous_version: null,
      status: "POSTED",
      profile_version: 1,
      period_id: periodId,
      period_version: 1,
      accounting_date: "2301-01-15",
      posting_rule_id: ruleId,
      rule_version: 1,
      source_domain: "CONTROLLED_MANUAL",
      source_record_key: "synthetic-source",
      economic_event_key: "synthetic-event",
      posting_purpose: "manual-correction",
      description_en: "Synthetic journal",
      description_ar: "قيد اصطناعي",
      currency: "SAR",
      reason: "Synthetic read",
      evidence_ref: null,
      prepared_by: actorId,
      prepared_at: timestamp,
      posted_by: actorId,
      posted_at: timestamp,
      lines: [line],
    }],
  };
  const ledgerEntry = {
    journal_id: journalId,
    journal_version: 1,
    accounting_date: "2301-01-15",
    posted_at: timestamp,
    posted_by: actorId,
    reversal_of_journal_id: null,
    correction_group_id: journalId,
    account_id: accountId,
    account_version: 1,
    account_code: "SYN-001",
    account_name_en: "Synthetic account",
    account_name_ar: "حساب اصطناعي",
    side: "DEBIT",
    amount_halalah: "2500",
    service_id: null,
    service_number: null,
    event_name: null,
    event_type: null,
    event_start_date: null,
    event_end_date: null,
    line_number: 1,
    description_en: "Synthetic debit",
    description_ar: "مدين اصطناعي",
  };
  resetState(async (name, args) => {
    if (name === "get_accounting_capability") {
      return { data: args.p_capability === "accounting:manage_chart", error: null };
    }
    if (name === "list_accounting_posting_rules") return { data: [rule], error: null };
    if (name === "get_accounting_journal") return { data: journal, error: null };
    if (name === "get_accounting_general_ledger") {
      return { data: [{
        report: { entries: [ledgerEntry], from_date: "2301-01-01", through_date: "2301-01-31", recorded_at_cutoff: timestamp },
        is_complete: true,
        generated_at: timestamp,
      }], error: null };
    }
    if (name === "get_accounting_trial_balance") {
      return { data: [{
        report: {
          as_of_date: "2301-01-31",
          recorded_at_cutoff: timestamp,
          service_id: null,
          accounts: [{
            account_id: accountId,
            account_code: "SYN-001",
            account_name_en: "Synthetic account",
            account_name_ar: "حساب اصطناعي",
            account_type: "ASSET",
            normal_balance: "DEBIT",
            debit_activity_halalah: "2500",
            credit_activity_halalah: "0",
            debit_balance_halalah: "2500",
            credit_balance_halalah: "0",
          }],
          debit_balance_total_halalah: "2500",
          credit_balance_total_halalah: "0",
          debits_equal_credits: false,
          account_count: 1,
        },
        is_complete: true,
        generated_at: timestamp,
      }], error: null };
    }
    return { data: null, error: null };
  });

  assert.deepEqual(await listAccountingPostingRules(), [rule]);
  assert.equal((await getAccountingJournal(journalId))?.journal_id, journalId);
  const ledger = await getAccountingGeneralLedger({
    from_date: "2301-01-01",
    through_date: "2301-01-31",
    recorded_at_cutoff: timestamp,
    account_id: accountId,
    service_id: null,
    offset: 0,
    limit: 50,
  });
  assert.equal(ledger.report.entries[0]?.amount_halalah, "2500");
  assert.equal(ledger.report.recorded_at_cutoff, timestamp);
  const trialBalance = await getAccountingTrialBalance({
    as_of_date: "2301-01-31",
    recorded_at_cutoff: timestamp,
    service_id: null,
    offset: 0,
    limit: 50,
  });
  assert.equal(trialBalance.report.debit_balance_total_halalah, "2500");
  assert.equal(trialBalance.report.account_count, 1);
  assert.deepEqual(state.calls.filter(({ name }) => name === "get_accounting_capability")
    .map(({ args }) => args.p_capability), ["accounting:view", "accounting:manage_chart"]);
  assert.equal(state.calls.filter(({ name }) => name === "get_accounting_journal")
    .every(({ args }) => args.p_actor_user_id === actorId), true);
  assert.equal(state.calls.find(({ name }) => name === "get_accounting_general_ledger")?.args.p_recorded_at_cutoff, timestamp);
  assert.equal(state.calls.find(({ name }) => name === "get_accounting_trial_balance")?.args.p_recorded_at_cutoff, timestamp);
});

test("chart and period reads fail closed when explicit accounting grants are absent", async () => {
  resetState(async () => ({ data: false, error: null }));
  await assert.rejects(() => listAccountingAccounts(), /Accounting capability required/);
  assert.equal(state.calls.some(({ name }) => name === "list_accounting_accounts"), false);
});

test("W10F reconciliation requires an explicit accounting grant and preserves cutoff boundaries", async () => {
  const cutoff = "2026-09-29T12:00:00Z";
  resetState(async (name, args) => {
    if (name === "get_accounting_capability") {
      return { data: args.p_capability === "accounting:view", error: null };
    }
    return {
      data: {
        state: "READY",
        as_of_date: "2026-09-29",
        recorded_at_cutoff: cutoff,
        bank_reconciled: false,
        authoritative_consideration_halalah: "10000",
        performance_unit_allocations_halalah: "10000",
        unallocated_consideration_halalah: "0",
        recognized_to_date_halalah: "2500",
        remaining_unrecognized_consideration_halalah: "7500",
        revenue_posted_halalah: "2500",
        contract_asset_balance_halalah: "2500",
        contract_liability_balance_halalah: "0",
        contract_balance_difference_count: 0,
        arrangement_count: 1,
        held_evidence_count: 0,
        contract_balances: [],
        recognition_event_count: 0,
        recognition_events: [],
        held_evidence: [],
        superseded_or_stale_authority_count: 0,
        service_customer_difference_count: 0,
        credits_refunds_requiring_revenue_review_count: 0,
        inception_covered_count: 0,
        fi012_timing_difference_count: 0,
        truncated: false,
        arrangements: [],
      },
      error: null,
    };
  });
  const result = await getAccountingRevenueReconciliation({
    as_of_date: "2026-09-29", recorded_at_cutoff: cutoff, limit: 50,
  });
  assert.equal(result.state, "READY");
  assert.equal(result.bank_reconciled, false);
  assert.equal(state.calls.at(-1)?.name, "get_accounting_revenue_recognition_reconciliation");
  assert.equal(state.calls.at(-1)?.args.p_actor, actorId);
  assert.equal(state.calls.at(-1)?.args.p_as_of, "2026-09-29");
  assert.equal(state.calls.at(-1)?.args.p_cutoff, cutoff);
  assert.deepEqual(state.calls.filter(({ name }) => name === "get_accounting_capability").map(({ args }) => args.p_capability), [
    "accounting:view", "accounting:manage_revenue_recognition",
  ]);

  resetState(async () => ({ data: false, error: null }));
  await assert.rejects(() => getAccountingRevenueReconciliation({
    as_of_date: "2026-09-29", recorded_at_cutoff: cutoff, limit: 50,
  }), /Accounting capability required/);
  assert.equal(state.calls.some(({ name }) => name === "get_accounting_revenue_recognition_reconciliation"), false);
  resetState(async () => ({ data: true, error: null }));
  await assert.rejects(() => getAccountingRevenueReconciliation({
    as_of_date: "2026-02-30", recorded_at_cutoff: cutoff, limit: 501,
  }), AuthDependencyError);
});

test("W10G-R1 bank binding reads require view or reconcile authority and send the trusted actor", async () => {
  const cutoff = "2026-10-15T09:00:00+03:00";
  resetState(async (name, args) => {
    if (name === "get_accounting_capability") {
      return { data: args.p_capability === "accounting:view", error: null };
    }
    return { data: { state: "READY", bindings: [], as_of_date: "2026-10-15", recorded_at_cutoff: cutoff, truncated: false }, error: null };
  });
  assert.deepEqual(await listAccountingBankBindings({ as_of_date: "2026-10-15", recorded_at_cutoff: cutoff, limit: 50 }), {
    state: "READY", bindings: [], as_of_date: "2026-10-15", recorded_at_cutoff: cutoff, truncated: false,
  });
  assert.deepEqual(state.calls.at(-1), {
    name: "list_accounting_bank_bindings",
    args: { p_actor_user_id: actorId, p_as_of_date: "2026-10-15", p_recorded_at_cutoff: cutoff, p_limit: 50 },
  });

  resetState(async () => ({ data: false, error: null }));
  await assert.rejects(() => listAccountingBankBindings({
    as_of_date: "2026-10-15", recorded_at_cutoff: cutoff, limit: 50,
  }), /Accounting capability required/);
  assert.equal(state.calls.some(({ name }) => name === "list_accounting_bank_bindings"), false);
});

test("W10G-R1 history reads preserve exact halalah strings and reject unsafe numeric amounts", async () => {
  const cutoff = "2026-10-15T09:00:00+03:00";
  const bindingId = "00000000-0000-4000-8000-00000000b951";
  const history = {
    state: "READY",
    binding_id: bindingId,
    as_of_date: "2026-10-15",
    recorded_at_cutoff: cutoff,
    statement_batches: [{
      batch_id: "00000000-0000-4000-8000-00000000b952",
      version: 1,
      previous_version: null,
      binding_id: bindingId,
      binding_version: 1,
      source_document_ref: "statement-2026-10",
      evidence_sha256: "a".repeat(64),
      evidence_identity: "bank-statement-october",
      coverage_start: "2026-10-01",
      coverage_end: "2026-10-31",
      opening_balance_halalah: "9007199254740993",
      closing_balance_halalah: "9007199254740993",
      currency: "SAR",
      status: "RECORDED",
      recorded_by: actorId,
      recorded_at: cutoff,
      reason: "Read contract fixture",
    }],
    statement_batches_truncated: false,
    groups: [],
    groups_truncated: false,
  };
  resetState(async (name, args) => name === "get_accounting_capability"
    ? { data: args.p_capability === "accounting:reconcile_bank", error: null }
    : { data: history, error: null });
  const result = await getAccountingBankReconciliationHistory({
    binding_id: bindingId, as_of_date: "2026-10-15", recorded_at_cutoff: cutoff, limit: 50,
  });
  assert.equal(result.statement_batches[0]?.opening_balance_halalah, "9007199254740993");
  assert.equal(state.calls.at(-1)?.args.p_actor_user_id, actorId);
  assert.equal(state.calls.at(-1)?.args.p_binding_id, bindingId);

  resetState(async (name, args) => name === "get_accounting_capability"
    ? { data: args.p_capability === "accounting:view", error: null }
    : { data: { ...history, statement_batches: [{ ...history.statement_batches[0], opening_balance_halalah: 9007199254740993 }] }, error: null });
  await assert.rejects(() => getAccountingBankReconciliationHistory({
    binding_id: bindingId, as_of_date: "2026-10-15", recorded_at_cutoff: cutoff, limit: 50,
  }), (error: unknown) => error instanceof AuthDependencyError
    && error.message === "Accounting bank reconciliation history response was invalid");
});


test("AR bridge reconciliation uses the governed evidence RPC and preserves cutoff-bound version evidence", async () => {
  const cutoff = "2026-10-15T10:00:00Z";
  const eventId = "00000000-0000-4000-8000-00000000c002";
  const sourceRecordId = "00000000-0000-4000-8000-00000000c003";
  const journalId = "00000000-0000-4000-8000-00000000c004";
  const capturedAt = "2026-10-15T09:59:00Z";
  const event = {
    source_type: "INVOICE",
    source_record_id: sourceRecordId,
    source_record_key: "synthetic-invoice-1",
    economic_event_key: "synthetic-invoice-issue-1",
    reconciliation_status: "PREPARED",
    event_id: eventId,
    event_version: 3,
    classification: "UNCONDITIONAL_CONTRACT_LIABILITY",
    customer_id: "00000000-0000-4000-8000-00000000c006",
    service_id: null,
    invoice_id: null,
    amount_halalah: "9007199254740993",
    source_business_date: "2026-10-14",
    source_recorded_at: "2026-10-14T12:00:00Z",
    accounting_date: "2026-10-15",
    posted_accounting_date: null,
    posted_at: null,
    journal_id: journalId,
    held_code: null,
    expected_ar_delta_halalah: "9007199254740993",
    posted_ar_delta_halalah: "0",
    source_snapshot_sha256: "c".repeat(64),
    classification_reason: "Current classification evidence",
    classification_evidence_ref: "synthetic/current-evidence",
    classification_evidence_sha256: "d".repeat(64),
    classified_by: actorId,
    classified_at: capturedAt,
    prepared_journal_version: 4,
  };
  const reconciliation = {
    state: "READY",
    as_of_date: "2026-10-15",
    recorded_at_cutoff: cutoff,
    source_event_count: 1,
    posted_effect_count: 0,
    held_unresolved_count: 0,
    inception_covered_count: 0,
    missing_effect_count: 0,
    duplicate_conflict_count: 0,
    party_difference_count: 0,
    timing_difference_count: 0,
    truncated: false,
    events: [event],
    party_balances: [],
  };

  resetState(async (name, args) => {
    if (name === "get_accounting_capability") {
      return { data: args.p_capability === "accounting:manage_ar_bridge", error: null };
    }
    if (name === "get_accounting_ar_bridge_reconciliation_with_evidence") {
      return { data: reconciliation, error: null };
    }
    return { data: null, error: null };
  });

  const input = {
    as_of_date: "2026-10-15",
    recorded_at_cutoff: cutoff,
    limit: 20,
  };
  const result = await getAccountingArBridgeReconciliation(input);

  assert.equal(result.state, "READY");
  assert.equal(result.events[0]?.event_version, 3);
  assert.equal(result.events[0]?.classification_reason, "Current classification evidence");
  assert.equal(result.events[0]?.classification_evidence_ref, "synthetic/current-evidence");
  assert.equal(result.events[0]?.classification_evidence_sha256, "d".repeat(64));
  assert.equal(result.events[0]?.classified_by, actorId);
  assert.equal(result.events[0]?.classified_at, capturedAt);
  assert.equal(result.events[0]?.journal_id, journalId);
  assert.equal(result.events[0]?.prepared_journal_version, 4);
  assert.equal(result.events[0]?.amount_halalah, "9007199254740993");
  assert.deepEqual(state.calls.filter(({ name }) => name === "get_accounting_capability").map(({ args }) => args.p_capability), [
    "accounting:view",
    "accounting:manage_ar_bridge",
  ]);
  assert.deepEqual(state.calls.at(-1), {
    name: "get_accounting_ar_bridge_reconciliation_with_evidence",
    args: {
      p_actor_user_id: actorId,
      p_as_of_date: input.as_of_date,
      p_recorded_at_cutoff: input.recorded_at_cutoff,
      p_limit: input.limit,
    },
  });
  assert.deepEqual(state.targetQueries, []);

  const postedReconciliation = {
    ...reconciliation,
    events: [{
      ...event,
      reconciliation_status: "POSTED",
      posted_accounting_date: "2026-10-15",
      posted_at: cutoff,
    }],
  };
  resetState(async (name, args) => {
    if (name === "get_accounting_capability") {
      return { data: args.p_capability === "accounting:manage_ar_bridge", error: null };
    }
    if (name === "get_accounting_ar_bridge_reconciliation_with_evidence") {
      return { data: postedReconciliation, error: null };
    }
    return { data: null, error: null };
  });
  const postedResult = await getAccountingArBridgeReconciliation(input);
  assert.equal(postedResult.state, "READY");
  assert.equal(postedResult.events[0]?.reconciliation_status, "POSTED");
  assert.equal(postedResult.events[0]?.journal_id, journalId);
  assert.equal(postedResult.events[0]?.prepared_journal_version, 4);
  assert.deepEqual(state.targetQueries, []);

  resetState(async (name) => {
    if (name === "get_accounting_capability") return { data: true, error: null };
    if (name === "get_accounting_ar_bridge_reconciliation_with_evidence") {
      return {
        data: {
          ...reconciliation,
          events: [{ ...event, classification_evidence_sha256: "not-a-sha256" }],
        },
        error: null,
      };
    }
    return { data: null, error: null };
  });
  await assert.rejects(
    getAccountingArBridgeReconciliation(input),
    (error: unknown) => error instanceof AuthDependencyError,
  );
  assert.deepEqual(state.targetQueries, []);
});
