import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test, { mock } from "node:test";

type ResolveResult = { url: string; shortCircuit?: true };
type ResolveContext = { parentURL?: string };
type ActionState = {
  rpc: (name: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: { code?: string } | null }>;
  calls: Array<{ name: string; args: Record<string, unknown> }>;
  permission: string | null;
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

let state: ActionState = {
  rpc: async () => ({ data: null, error: null }),
  calls: [],
  permission: null,
};

mock.module("@/lib/auth/permissions", {
  namedExports: {
    requirePermission: async (permission: string) => {
      state.permission = permission;
      return { id: "8cefe8c1-7914-4b3b-915d-24d6fcdfc76f", role: "viewer", is_active: true };
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
    }),
  },
});

const { saveAccountingAccount, saveAccountingPeriod, setAccountingCapability, updateAccountingProfile, saveAccountingPostingRule, prepareAccountingJournal, postAccountingJournal, reverseAccountingJournal } = await import("./actions.ts");
const { AuthDependencyError } = await import("../auth/errors.ts");

const actorId = "8cefe8c1-7914-4b3b-915d-24d6fcdfc76f";
const targetId = "9f09e715-9698-4804-a72b-331ebc776b8d";

function resetState(rpc: ActionState["rpc"]) {
  state = { rpc, calls: [], permission: null };
}

const assignment = {
  target_user_id: targetId,
  capability: "accounting:view",
  effect: "ALLOW",
  expires_at: null,
  expected_revision: 0,
  reason: "Approved by the Controller",
  evidence_ref: null,
  request_id: "6f5b2999-ea2b-4c2e-8928-93220196a910",
};

test("authority server action derives its actor from requirePermission and returns RPC revision", async () => {
  resetState(async () => ({
    data: [{ error_code: null, capability_event_id: "a226e8ef-0c08-4e5e-8b0a-c232cdb91903", revision: 1, idempotent_replay: false }],
    error: null,
  }));

  assert.deepEqual(await setAccountingCapability(assignment), {
    ok: true,
    value: { capability_event_id: "a226e8ef-0c08-4e5e-8b0a-c232cdb91903", revision: 1 },
    idempotentReplay: false,
  });
  assert.equal(state.permission, "accounting:manage_authority");
  assert.deepEqual(state.calls[0], {
    name: "set_accounting_capability",
    args: {
      p_actor_user_id: actorId,
      p_target_user_id: targetId,
      p_capability: "accounting:view",
      p_effect: "ALLOW",
      p_expires_at: null,
      p_expected_revision: 0,
      p_reason: "Approved by the Controller",
      p_evidence_ref: null,
      p_request_id: assignment.request_id,
    },
  });
  assert.equal("p_actor_role" in state.calls[0].args, false);
});

test("self assignment and browser actor injection are rejected before RPC", async () => {
  resetState(async () => ({ data: [], error: null }));
  assert.deepEqual(await setAccountingCapability({ ...assignment, target_user_id: actorId }), {
    ok: false,
    code: "invalid_input",
  });
  assert.deepEqual(await setAccountingCapability({ ...assignment, actor_user_id: targetId }), {
    ok: false,
    code: "invalid_input",
  });
  assert.equal(state.calls.length, 0);
});

test("safe SQL result codes are preserved while database internals are hidden", async () => {
  resetState(async () => ({
    data: [{ error_code: "request_payload_conflict", capability_event_id: null, revision: null, idempotent_replay: false }],
    error: null,
  }));
  assert.deepEqual(await setAccountingCapability(assignment), {
    ok: false,
    code: "request_payload_conflict",
  });

  resetState(async () => ({
    data: [{ error_code: "capability_disabled", capability_event_id: null, revision: null, idempotent_replay: false }],
    error: null,
  }));
  assert.deepEqual(await setAccountingCapability({ ...assignment, capability: "accounting:manage_chart", effect: "DENY" }), {
    ok: false,
    code: "capability_disabled",
  });

  resetState(async () => ({ data: null, error: { code: "57P01" } }));
  await assert.rejects(() => setAccountingCapability(assignment), (error: unknown) => {
    assert.ok(error instanceof AuthDependencyError);
    assert.equal(error.message.includes("57P01"), false);
    return true;
  });
});

test("profile action rejects unsupported production and tax states and maps company mismatch", async () => {
  const profile = {
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
    accounting_start_date: "2026-01-01",
    cutover_boundary_date: "2026-12-31",
    legal_fiscal_evidence_pending: true,
    legal_fiscal_evidence_ref: null,
    vat_mode: "not_registered",
    zatca_state: "INACTIVE",
    fatoora_state: "INACTIVE",
    activation_state: "DEV_PROVISIONAL",
  };
  const request = {
    expected_version: 1,
    profile,
    reason: "Controller-approved provisional profile",
    evidence_ref: null,
    request_id: "d8a7561e-5571-41f6-a4fc-0843bd05dd38",
  };

  resetState(async () => ({ data: [], error: null }));
  assert.deepEqual(
    await updateAccountingProfile({ ...request, profile: { ...profile, activation_state: "PRODUCTION_ACTIVE" } }),
    { ok: false, code: "invalid_input" },
  );
  assert.deepEqual(
    await updateAccountingProfile({ ...request, profile: { ...profile, vat_mode: "registered" } }),
    { ok: false, code: "invalid_input" },
  );
  assert.equal(state.calls.length, 0);

  resetState(async () => ({
    data: [{ error_code: "company_settings_mismatch", profile_id: null, version: null, idempotent_replay: false }],
    error: null,
  }));
  assert.deepEqual(await updateAccountingProfile(request), {
    ok: false,
    code: "company_settings_mismatch",
  });
  assert.equal(state.permission, "accounting:manage_profile");
  assert.equal(state.calls[0].args.p_actor_user_id, actorId);
});


test("chart and period actions use only trusted actor IDs and their explicit accounting capabilities", async () => {
  const account = {
    account_code: "TEMP-001",
    name_en: "Synthetic heading",
    name_ar: "رأس اصطناعي",
    account_type: "ASSET",
    category: "synthetic",
    normal_balance: "DEBIT",
    account_kind: "NON_POSTING",
    parent_account_id: null,
    is_active: true,
    is_protected: false,
    control_classification: "NONE",
  };
  resetState(async () => ({
    data: [{ error_code: null, account_id: "00000000-0000-4000-8000-00000000a571", version: 1, idempotent_replay: false }],
    error: null,
  }));
  assert.deepEqual(await saveAccountingAccount({
    account_id: null,
    expected_version: 0,
    account,
    reason: "Synthetic account",
    evidence_ref: null,
    request_id: "00000000-0000-4000-8000-00000000a572",
  }), {
    ok: true,
    value: { account_id: "00000000-0000-4000-8000-00000000a571", version: 1 },
    idempotentReplay: false,
  });
  assert.equal(state.permission, "accounting:manage_chart");
  assert.equal(state.calls[0].name, "save_accounting_account");
  assert.equal(state.calls[0].args.p_actor_user_id, actorId);
  assert.deepEqual(state.calls[0].args.p_account, account);
  assert.equal("p_actor_role" in state.calls[0].args, false);

  resetState(async () => ({
    data: [{ error_code: null, period_id: "00000000-0000-4000-8000-00000000a573", version: 1, idempotent_replay: false }],
    error: null,
  }));
  assert.deepEqual(await saveAccountingPeriod({
    period_id: null,
    expected_version: 0,
    period: { start_date: "2026-10-03", end_date: "2026-10-19", status: "OPEN" },
    reason: "Synthetic period",
    evidence_ref: null,
    request_id: "00000000-0000-4000-8000-00000000a574",
  }), {
    ok: true,
    value: { period_id: "00000000-0000-4000-8000-00000000a573", version: 1 },
    idempotentReplay: false,
  });
  assert.equal(state.permission, "accounting:manage_periods");
  assert.equal(state.calls[0].name, "save_accounting_period");
  assert.equal(state.calls[0].args.p_actor_user_id, actorId);
  assert.equal("p_actor_role" in state.calls[0].args, false);
});

test("W10B mutations derive actors, require each explicit capability, and call its RPC", async () => {
  const ruleId = "00000000-0000-4000-8000-00000000b920";
  const journalId = "00000000-0000-4000-8000-00000000b921";
  const originalId = "00000000-0000-4000-8000-00000000b922";
  const periodId = "00000000-0000-4000-8000-00000000b923";
  const rule = {
    rule_code: "SYNTHETIC_MANUAL",
    name_en: "Synthetic manual rule",
    name_ar: "قاعدة اصطناعية",
    is_active: true,
    mappings: [
      { mapping_key: "debit", account_id: "00000000-0000-4000-8000-00000000b924", account_version: 1, allowed_side: "DEBIT", service_requirement: "FORBIDDEN" },
      { mapping_key: "credit", account_id: "00000000-0000-4000-8000-00000000b925", account_version: 1, allowed_side: "CREDIT", service_requirement: "OPTIONAL" },
    ],
  };
  const journal = {
    accounting_date: "2301-01-15",
    period_id: periodId,
    period_version: 1,
    posting_rule_id: ruleId,
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
  const common = { reason: "Synthetic journal action", evidence_ref: null, request_id: "00000000-0000-4000-8000-00000000b926" };

  resetState(async () => ({
    data: [{ error_code: null, posting_rule_id: ruleId, version: 1, idempotent_replay: false }],
    error: null,
  }));
  assert.deepEqual(await saveAccountingPostingRule({
    posting_rule_id: null, expected_version: 0, rule, ...common,
  }), { ok: true, value: { posting_rule_id: ruleId, version: 1 }, idempotentReplay: false });
  assert.equal(state.permission, "accounting:manage_chart");
  assert.equal(state.calls[0].name, "save_accounting_posting_rule");
  assert.equal(state.calls[0].args.p_actor_user_id, actorId);
  assert.equal("p_actor_role" in state.calls[0].args, false);

  resetState(async () => ({
    data: [{ error_code: null, journal_id: journalId, version: 1, status: "DRAFT", idempotent_replay: false }],
    error: null,
  }));
  assert.deepEqual(await prepareAccountingJournal({
    journal_id: null, expected_version: 0, journal, ...common,
  }), { ok: true, value: { journal_id: journalId, version: 1, status: "DRAFT" }, idempotentReplay: false });
  assert.equal(state.permission, "accounting:prepare_journal");
  assert.equal(state.calls[0].name, "prepare_accounting_journal");
  assert.equal(state.calls[0].args.p_actor_user_id, actorId);

  resetState(async () => ({
    data: [{ error_code: null, journal_id: journalId, version: 2, status: "POSTED", idempotent_replay: false }],
    error: null,
  }));
  assert.deepEqual(await postAccountingJournal({
    journal_id: journalId, expected_version: 1, request_id: "00000000-0000-4000-8000-00000000b927",
  }), { ok: true, value: { journal_id: journalId, version: 2, status: "POSTED" }, idempotentReplay: false });
  assert.equal(state.permission, "accounting:post_journal");
  assert.equal(state.calls[0].name, "post_accounting_journal");
  resetState(async () => ({
    data: [{ error_code: "revision_conflict", journal_id: journalId, version: 2, status: "POSTED", idempotent_replay: false }],
    error: null,
  }));
  const retryRequestId = "00000000-0000-4000-8000-00000000b92a";
  assert.deepEqual(await postAccountingJournal({
    journal_id: journalId, expected_version: 1, request_id: retryRequestId,
  }), { ok: false, code: "revision_conflict" });
  assert.equal(state.calls[0].args.p_request_id, retryRequestId);
  assert.equal(state.calls[0].args.p_actor_user_id, actorId);

  resetState(async () => ({
    data: [{ error_code: null, journal_id: "00000000-0000-4000-8000-00000000b928", version: 2, original_journal_id: originalId, idempotent_replay: false }],
    error: null,
  }));
  assert.deepEqual(await reverseAccountingJournal({
    original_journal_id: originalId,
    period_id: periodId,
    accounting_date: "2301-01-16",
    reason: "Synthetic reversal",
    evidence_ref: null,
    request_id: "00000000-0000-4000-8000-00000000b929",
  }), {
    ok: true,
    value: { journal_id: "00000000-0000-4000-8000-00000000b928", version: 2, original_journal_id: originalId },
    idempotentReplay: false,
  });
  assert.equal(state.permission, "accounting:reverse_journal");
  assert.equal(state.calls[0].name, "reverse_accounting_journal");
  assert.equal(state.calls[0].args.p_actor_user_id, actorId);
});

test("chart and period actions reject invalid revisions and non-OPEN period input before RPC", async () => {
  resetState(async () => ({ data: [], error: null }));
  assert.deepEqual(await saveAccountingAccount({
    account_id: null,
    expected_version: 2,
    account: {},
    reason: "Invalid",
    evidence_ref: null,
    request_id: "00000000-0000-4000-8000-00000000a581",
  }), { ok: false, code: "invalid_input" });
  assert.deepEqual(await saveAccountingPeriod({
    period_id: null,
    expected_version: 0,
    period: { start_date: "2026-10-03", end_date: "2026-10-19", status: "CLOSED" },
    reason: "Invalid",
    evidence_ref: null,
    request_id: "00000000-0000-4000-8000-00000000a582",
  }), { ok: false, code: "invalid_input" });
  assert.equal(state.calls.length, 0);
});
