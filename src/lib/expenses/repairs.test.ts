import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

type ResolveResult = { url: string; shortCircuit?: true };
type ResolveContext = { parentURL?: string };
type ResolveHook = (
  specifier: string,
  context: ResolveContext,
  nextResolve: (specifier: string, context: ResolveContext) => ResolveResult,
) => ResolveResult;

const require = createRequire(import.meta.url);
const sourceRootUrl = new URL("../../", import.meta.url).href;
const { registerHooks } = require("node:module") as {
  registerHooks: (hooks: { resolve: ResolveHook }) => void;
};

// Configurable test hooks
type MockRpcResponse = { data: unknown[] | null; error: { message: string; code?: string } | null };
type MockActor = { id: string; role: string };

declare global {
  var __mockRpcHandler: ((name: string, args: Record<string, unknown>) => Promise<MockRpcResponse>) | undefined;
  var __mockActorHandler: (() => MockActor) | undefined;
  var __mockFinanceReviewState: { status: string; finance_reviewed_at: string | null } | undefined;
}

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "server-only") {
      return {
        shortCircuit: true,
        url: "data:text/javascript,export default {}",
      };
    }

    if (specifier === "@clerk/nextjs/server") {
      return {
        shortCircuit: true,
        url: "data:text/javascript,export const auth = async () => ({ userId: 'clerk_test_user' });",
      };
    }

    if (specifier === "@/lib/auth/permissions") {
      return {
        shortCircuit: true,
        url: "data:text/javascript,export const requirePermission = async () => (globalThis.__mockActorHandler ? globalThis.__mockActorHandler() : { id: '33333333-3333-4333-8333-333333333333', role: 'manager' });",
      };
    }

    if (specifier === "@/lib/supabase/admin") {
      return {
        shortCircuit: true,
        url: "data:text/javascript,export const createAdminClient = () => ({ rpc: async (name, args) => (globalThis.__mockRpcHandler ? globalThis.__mockRpcHandler(name, args) : { data: [], error: null }), from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: globalThis.__mockFinanceReviewState ?? { status: 'submitted', finance_reviewed_at: '2026-09-09T00:00:00.000Z' }, error: null }) }) }) }) });",
      };
    }

    if (specifier.startsWith("@/")) {
      const rel = specifier.slice(2);
      const abs = path.join(process.cwd(), "src", rel);
      if (fs.existsSync(abs + ".ts")) {
        return {
          shortCircuit: true,
          url: new URL(`file:///${abs.replace(/\\/g, "/")}.ts`).href,
        };
      }
      return {
        shortCircuit: true,
        url: new URL(`../../${rel}.ts`, import.meta.url).href,
      };
    }

    if (
      specifier.startsWith(".") &&
      !specifier.endsWith(".ts") &&
      context.parentURL?.startsWith(sourceRootUrl)
    ) {
      return nextResolve(`${specifier}.ts`, context);
    }

    return nextResolve(specifier, context);
  },
});

const {
  approveExpenseAction,
  approveCashAdvanceAction,
  rejectExpenseAction,
  settleExpenseReimbursementAction,
  settleCashAdvanceSpendAction,
  attachExpenseDocumentAction,
} = await import("./actions.ts");

const USER_A_SUBMITTER = "aaaaaaaa-1111-4111-8111-111111111111";
const USER_B_BENEFICIARY = "bbbbbbbb-2222-4222-8222-222222222222";
const USER_C_APPROVER = "cccccccc-3333-4333-8333-333333333333";

const EXPENSE_ID = "eeeeeeee-4444-4444-8444-444444444444";
const ADVANCE_ID = "aaaaaaaa-5555-4555-8555-555555555555";
const DOCUMENT_ID = "dddddddd-6666-4666-8666-666666666666";
const REQUEST_ID_1 = "11111111-7777-4777-8777-111111111111";
const REQUEST_ID_2 = "22222222-8888-4888-8888-222222222222";

// ============================================================================
// FINDING 2 REGRESSION TESTS: BENEFICIARY SELF-APPROVAL / SOD
// ============================================================================

test("Finding 2 - Case A: user A submits employee-paid expense for claimant B; claimant B attempts approval -> authoritative approval rejects", async () => {
  // Set actor to claimant B
  globalThis.__mockActorHandler = () => ({
    id: USER_B_BENEFICIARY,
    role: "manager",
  });

  // Authoritative RPC simulates claimant self-approval rejection
  globalThis.__mockRpcHandler = async (name, args) => {
    assert.equal(name, "approve_expense");
    assert.equal(args.p_expense_id, EXPENSE_ID);
    assert.equal(args.p_actor_id, USER_B_BENEFICIARY);
    return {
      data: [{
        error_code: "expense_claimant_self_approval_forbidden",
        expense_id: EXPENSE_ID,
        idempotent_replay: false,
      }],
      error: null,
    };
  };

  const result = await approveExpenseAction({
    expense_id: EXPENSE_ID,
    request_id: REQUEST_ID_1,
  });

  assert.equal(result.success, false);
  assert.equal(result.errorCode, "expense_claimant_self_approval_forbidden");
});

test("Finding 2 - Submitter Separation: user A submits expense; user A attempts approval -> authoritative approval rejects", async () => {
  // Set actor to submitter A
  globalThis.__mockActorHandler = () => ({
    id: USER_A_SUBMITTER,
    role: "manager",
  });

  // Authoritative RPC simulates submitter self-approval rejection
  globalThis.__mockRpcHandler = async (name, args) => {
    assert.equal(name, "approve_expense");
    assert.equal(args.p_actor_id, USER_A_SUBMITTER);
    return {
      data: [{
        error_code: "expense_self_approval_forbidden",
        expense_id: EXPENSE_ID,
        idempotent_replay: false,
      }],
      error: null,
    };
  };

  const result = await approveExpenseAction({
    expense_id: EXPENSE_ID,
    request_id: REQUEST_ID_1,
  });

  assert.equal(result.success, false);
  assert.equal(result.errorCode, "expense_self_approval_forbidden");
});

test("Finding 2 - Case B: user A requests cash advance for recipient B; recipient B attempts approval -> authoritative approval rejects", async () => {
  // Set actor to recipient B
  globalThis.__mockActorHandler = () => ({
    id: USER_B_BENEFICIARY,
    role: "manager",
  });

  // Authoritative RPC simulates recipient self-approval rejection
  globalThis.__mockRpcHandler = async (name, args) => {
    assert.equal(name, "approve_cash_advance");
    assert.equal(args.p_advance_id, ADVANCE_ID);
    assert.equal(args.p_actor_id, USER_B_BENEFICIARY);
    return {
      data: [{
        error_code: "advance_recipient_self_approval_forbidden",
        advance_id: ADVANCE_ID,
        idempotent_replay: false,
      }],
      error: null,
    };
  };

  const result = await approveCashAdvanceAction({
    advance_id: ADVANCE_ID,
    request_id: REQUEST_ID_1,
  });

  assert.equal(result.success, false);
  assert.equal(result.errorCode, "advance_recipient_self_approval_forbidden");
});

test("Finding 2 - Requester Separation: user A requests advance; user A attempts approval -> authoritative approval rejects", async () => {
  // Set actor to requester A
  globalThis.__mockActorHandler = () => ({
    id: USER_A_SUBMITTER,
    role: "manager",
  });

  // Authoritative RPC simulates requester self-approval rejection
  globalThis.__mockRpcHandler = async (name, args) => {
    assert.equal(name, "approve_cash_advance");
    assert.equal(args.p_actor_id, USER_A_SUBMITTER);
    return {
      data: [{
        error_code: "advance_self_approval_forbidden",
        advance_id: ADVANCE_ID,
        idempotent_replay: false,
      }],
      error: null,
    };
  };

  const result = await approveCashAdvanceAction({
    advance_id: ADVANCE_ID,
    request_id: REQUEST_ID_1,
  });

  assert.equal(result.success, false);
  assert.equal(result.errorCode, "advance_self_approval_forbidden");
});

test("Finding 2 - Case C: unrelated authorized approver C passes the SoD identity check", async () => {
  // Set actor to unrelated approver C
  globalThis.__mockActorHandler = () => ({
    id: USER_C_APPROVER,
    role: "manager",
  });

  // Authoritative RPC accepts unrelated approver
  globalThis.__mockRpcHandler = async (name, args) => {
    assert.equal(args.p_actor_id, USER_C_APPROVER);
    if (name === "approve_expense") {
      return {
        data: [{
          error_code: null,
          expense_id: EXPENSE_ID,
          idempotent_replay: false,
        }],
        error: null,
      };
    }
    if (name === "approve_cash_advance") {
      return {
        data: [{
          error_code: null,
          advance_id: ADVANCE_ID,
          idempotent_replay: false,
        }],
        error: null,
      };
    }
    throw new Error(`Unexpected RPC: ${name}`);
  };

  // Test Expense Approval by C
  const expenseResult = await approveExpenseAction({
    expense_id: EXPENSE_ID,
    request_id: REQUEST_ID_1,
  });
  assert.equal(expenseResult.success, true);
  assert.equal(expenseResult.data?.expense_id, EXPENSE_ID);
  assert.equal(expenseResult.idempotentReplay, false);

  // Test Advance Approval by C
  const advanceResult = await approveCashAdvanceAction({
    advance_id: ADVANCE_ID,
    request_id: REQUEST_ID_2,
  });
  assert.equal(advanceResult.success, true);
  assert.equal(advanceResult.data?.advance_id, ADVANCE_ID);
  assert.equal(advanceResult.idempotentReplay, false);
});

// ============================================================================
// FINDING 1 REGRESSION TESTS: IDEMPOTENCY PAYLOAD-CONFLICT ENFORCEMENT
// ============================================================================

test("Finding 1: Identical replay succeeds safely with idempotentReplay = true", async () => {
  globalThis.__mockActorHandler = () => ({ id: USER_C_APPROVER, role: "manager" });

  globalThis.__mockRpcHandler = async (name, args) => {
    assert.equal(name, "approve_expense");
    assert.equal(args.p_request_id, REQUEST_ID_1);
    return {
      data: [{
        error_code: null,
        expense_id: EXPENSE_ID,
        idempotent_replay: true,
      }],
      error: null,
    };
  };

  const result = await approveExpenseAction({
    expense_id: EXPENSE_ID,
    request_id: REQUEST_ID_1,
  });

  assert.equal(result.success, true);
  assert.equal(result.data?.expense_id, EXPENSE_ID);
  assert.equal(result.idempotentReplay, true);
});

test("Finding 1: Conflicting amount fails closed with stable request-conflict error", async () => {
  globalThis.__mockActorHandler = () => ({ id: USER_C_APPROVER, role: "manager" });

  // Settle expense reimbursement with conflicting amount on replayed request_id
  globalThis.__mockRpcHandler = async (name, args) => {
    assert.equal(name, "settle_expense_reimbursement");
    assert.equal(args.p_request_id, REQUEST_ID_1);
    return {
      data: [{
        error_code: "expense_reimbursement_request_conflict",
        settlement_id: null,
        idempotent_replay: false,
      }],
      error: null,
    };
  };

  const result = await settleExpenseReimbursementAction({
    expense_id: EXPENSE_ID,
    settlement_number: "SETTLE-001",
    amount: 250.0,
    settlement_method: "bank_transfer",
    payment_reference: "TRX-9999",
    notes: "Conflicting amount replay test",
    request_id: REQUEST_ID_1,
  });

  assert.equal(result.success, false);
  assert.equal(result.errorCode, "expense_reimbursement_request_conflict");
});

test("Finding 1: Conflicting target entity fails closed with stable request-conflict error", async () => {
  globalThis.__mockActorHandler = () => ({ id: USER_C_APPROVER, role: "manager" });

  // Settle advance spend with conflicting expense_id on replayed request_id
  globalThis.__mockRpcHandler = async (name, args) => {
    assert.equal(name, "settle_cash_advance_spend");
    assert.equal(args.p_request_id, REQUEST_ID_1);
    return {
      data: [{
        error_code: "cash_advance_settlement_request_conflict",
        allocation_id: null,
        idempotent_replay: false,
      }],
      error: null,
    };
  };

  const result = await settleCashAdvanceSpendAction({
    advance_id: ADVANCE_ID,
    expense_id: EXPENSE_ID,
    amount: 100.0,
    request_id: REQUEST_ID_1,
  });

  assert.equal(result.success, false);
  assert.equal(result.errorCode, "cash_advance_settlement_request_conflict");
});

test("Finding 1: Conflicting document id on attach fails closed with stable request-conflict error", async () => {
  globalThis.__mockActorHandler = () => ({ id: USER_C_APPROVER, role: "manager" });

  globalThis.__mockRpcHandler = async (name, args) => {
    assert.equal(name, "attach_expense_document");
    assert.equal(args.p_request_id, REQUEST_ID_1);
    return {
      data: [{
        error_code: "attach_document_request_conflict",
        expense_id: EXPENSE_ID,
        document_id: DOCUMENT_ID,
        idempotent_replay: false,
      }],
      error: null,
    };
  };

  const result = await attachExpenseDocumentAction({
    expense_id: EXPENSE_ID,
    document_id: DOCUMENT_ID,
    request_id: REQUEST_ID_1,
  });

  assert.equal(result.success, false);
  assert.equal(result.errorCode, "attach_document_request_conflict");
});

test("Finding 1: Conflicting lifecycle payload fails closed with stable request-conflict error", async () => {
  globalThis.__mockActorHandler = () => ({ id: USER_C_APPROVER, role: "manager" });

  // Reject expense with conflicting reason on replayed request_id
  globalThis.__mockRpcHandler = async (name, args) => {
    assert.equal(name, "reject_expense");
    assert.equal(args.p_request_id, REQUEST_ID_1);
    return {
      data: [{
        error_code: "expense_reject_request_conflict",
        expense_id: EXPENSE_ID,
        idempotent_replay: false,
      }],
      error: null,
    };
  };

  const result = await rejectExpenseAction({
    expense_id: EXPENSE_ID,
    rejection_reason: "Different rejection reason than originally recorded",
    request_id: REQUEST_ID_1,
  });

  assert.equal(result.success, false);
  assert.equal(result.errorCode, "expense_reject_request_conflict");
});

test("Finance review gate: direct approval and rejection calls fail closed before the lifecycle RPC", async () => {
  globalThis.__mockActorHandler = () => ({ id: USER_C_APPROVER, role: "manager" });
  globalThis.__mockFinanceReviewState = { status: "submitted", finance_reviewed_at: null };
  let rpcCalled = false;
  globalThis.__mockRpcHandler = async () => {
    rpcCalled = true;
    return { data: [], error: null };
  };

  const approveResult = await approveExpenseAction({
    expense_id: EXPENSE_ID,
    request_id: REQUEST_ID_2,
  });
  const rejectResult = await rejectExpenseAction({
    expense_id: EXPENSE_ID,
    rejection_reason: "Not supported",
    request_id: REQUEST_ID_2,
  });

  assert.equal(approveResult.success, false);
  assert.equal(approveResult.errorCode, "finance_review_required");
  assert.equal(rejectResult.success, false);
  assert.equal(rejectResult.errorCode, "finance_review_required");
  assert.equal(rpcCalled, false);
  globalThis.__mockFinanceReviewState = undefined;
});

// ============================================================================
// SIMULATED AUTHORITATIVE SQL STATE-MACHINE REGRESSION
// ============================================================================

test("Simulated PostgreSQL State-Machine: Authoritative RPC idempotency & conflict invariants", () => {
  // In-memory simulation of the exact table structures and RPC semantics
  type AuditRow = {
    entity_id: string;
    operation: string;
    request_id: string;
    payload: Record<string, unknown>;
  };
  type SettlementRow = {
    id: string;
    cash_advance_id: string;
    expense_id: string;
    amount: number;
    request_id: string;
  };

  const auditLogs: AuditRow[] = [];
  const settlements: SettlementRow[] = [];

  function simulateSettleCashAdvanceSpend(
    advanceId: string,
    expenseId: string,
    amount: number,
    requestId: string,
  ): { errorCode: string | null; id: string | null; idempotentReplay: boolean } {
    // Exact SQL logic from 6.14:
    const existing = settlements.find((s) => s.request_id === requestId);
    if (existing) {
      if (
        existing.cash_advance_id !== advanceId ||
        existing.expense_id !== expenseId ||
        existing.amount !== amount
      ) {
        return {
          errorCode: "cash_advance_settlement_request_conflict",
          id: existing.id,
          idempotentReplay: false,
        };
      }
      return { errorCode: null, id: existing.id, idempotentReplay: true };
    }

    const newId = `settle-${settlements.length + 1}`;
    settlements.push({
      id: newId,
      cash_advance_id: advanceId,
      expense_id: expenseId,
      amount,
      request_id: requestId,
    });

    auditLogs.push({
      entity_id: newId,
      operation: "settle_cash_advance_spend",
      request_id: requestId,
      payload: { cash_advance_id: advanceId, expense_id: expenseId, amount },
    });

    return { errorCode: null, id: newId, idempotentReplay: false };
  }

  // 1. First execution creates row
  const first = simulateSettleCashAdvanceSpend(ADVANCE_ID, EXPENSE_ID, 150.0, REQUEST_ID_1);
  assert.equal(first.errorCode, null);
  assert.equal(first.idempotentReplay, false);
  assert.equal(settlements.length, 1);

  // 2. Identical replay: returns original result, causes NO second mutation
  const replay = simulateSettleCashAdvanceSpend(ADVANCE_ID, EXPENSE_ID, 150.0, REQUEST_ID_1);
  assert.equal(replay.errorCode, null);
  assert.equal(replay.id, first.id);
  assert.equal(replay.idempotentReplay, true);
  assert.equal(settlements.length, 1, "Must NOT create duplicate immutable settlement row");

  // 3. Conflicting amount replay: fails closed with cash_advance_settlement_request_conflict
  const conflictAmount = simulateSettleCashAdvanceSpend(ADVANCE_ID, EXPENSE_ID, 200.0, REQUEST_ID_1);
  assert.equal(conflictAmount.errorCode, "cash_advance_settlement_request_conflict");
  assert.equal(conflictAmount.idempotentReplay, false);
  assert.equal(settlements.length, 1, "Must NOT mutate second entity or create duplicate row");

  // 4. Conflicting target entity replay: fails closed
  const conflictEntity = simulateSettleCashAdvanceSpend(ADVANCE_ID, "eeeeeeee-9999-4999-8999-999999999999", 150.0, REQUEST_ID_1);
  assert.equal(conflictEntity.errorCode, "cash_advance_settlement_request_conflict");
  assert.equal(conflictEntity.idempotentReplay, false);
  assert.equal(settlements.length, 1, "Must NOT mutate second entity or create duplicate row");
});
