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
        url: "data:text/javascript,export const requirePermission = async (perm) => ({ id: '11111111-1111-4111-8111-111111111111', clerk_user_id: 'clerk_test_user', role: 'sales' }); export const checkPermission = async () => true;",
      };
    }

    if (specifier === "@/lib/supabase/admin") {
      return {
        shortCircuit: true,
        url: "data:text/javascript,export const createAdminClient = () => ({ rpc: async () => ({ data: [], error: null }), from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => null, order: () => ({ limit: () => ({ data: [], error: null }) }) }) }) }) });",
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
  CASH_ADVANCE_PERMISSIONS,
  EXPENSE_PERMISSIONS,
  PETTY_CASH_PERMISSIONS,
  ROLE_PERMISSIONS,
  hasPermissionForRole,
} = await import("../auth/role-permissions.ts");

const { requestOwnCashAdvanceSchema } = await import("./schemas.ts");

const MIGRATION_PATH = path.join(
  process.cwd(),
  "supabase",
  "migrations",
  "20260909100000_w5b2_cash_advance_numbering_and_integrity.sql",
);
const APPROVAL_REPAIR_MIGRATION_PATH = path.join(
  process.cwd(),
  "supabase",
  "migrations",
  "20260911100000_w5b2c_cash_advance_approval_authority_repair.sql",
);
const ACTIONS_PATH = path.join(process.cwd(), "src", "lib", "expenses", "actions.ts");
const QUERIES_PATH = path.join(process.cwd(), "src", "lib", "expenses", "queries.ts");

const VALID_UUID_1 = "11111111-1111-4111-8111-111111111111";
const VALID_UUID_2 = "22222222-2222-4222-8222-222222222222";

// ============================================================================
// AUTHORITY TESTS (1-12)
// ============================================================================

test("1. Authority: Sales role has cash_advances:read_own", () => {
  assert.equal(hasPermissionForRole("sales", CASH_ADVANCE_PERMISSIONS.readOwn), true);
});

test("2. Authority: Sales role has cash_advances:submit_own", () => {
  assert.equal(hasPermissionForRole("sales", CASH_ADVANCE_PERMISSIONS.submitOwn), true);
});

test("3. Authority: Sales role lacks broad cash_advances:read", () => {
  assert.equal(hasPermissionForRole("sales", CASH_ADVANCE_PERMISSIONS.read), false);
});

test("4. Authority: Sales role lacks approve, issue, and settle permissions", () => {
  assert.equal(hasPermissionForRole("sales", CASH_ADVANCE_PERMISSIONS.approve), false);
  assert.equal(hasPermissionForRole("sales", CASH_ADVANCE_PERMISSIONS.issue), false);
  assert.equal(hasPermissionForRole("sales", CASH_ADVANCE_PERMISSIONS.settle), false);
});

test("5. Authority: Operations role has readOwn and submitOwn", () => {
  assert.equal(hasPermissionForRole("operations", CASH_ADVANCE_PERMISSIONS.readOwn), true);
  assert.equal(hasPermissionForRole("operations", CASH_ADVANCE_PERMISSIONS.submitOwn), true);
});

test("6. Authority: Operations role lacks broad financial authority (read, approve, issue, settle)", () => {
  assert.equal(hasPermissionForRole("operations", CASH_ADVANCE_PERMISSIONS.read), false);
  assert.equal(hasPermissionForRole("operations", CASH_ADVANCE_PERMISSIONS.approve), false);
  assert.equal(hasPermissionForRole("operations", CASH_ADVANCE_PERMISSIONS.issue), false);
  assert.equal(hasPermissionForRole("operations", CASH_ADVANCE_PERMISSIONS.settle), false);
});

test("7. Authority: Manager role has readOwn, submitOwn, and broad read but no Cash Advance approval", () => {
  assert.equal(hasPermissionForRole("manager", CASH_ADVANCE_PERMISSIONS.readOwn), true);
  assert.equal(hasPermissionForRole("manager", CASH_ADVANCE_PERMISSIONS.submitOwn), true);
  assert.equal(hasPermissionForRole("manager", CASH_ADVANCE_PERMISSIONS.read), true);
  assert.equal(hasPermissionForRole("manager", CASH_ADVANCE_PERMISSIONS.approve), false);
});

test("8. Authority: Manager role lacks issue and settle", () => {
  assert.equal(hasPermissionForRole("manager", CASH_ADVANCE_PERMISSIONS.issue), false);
  assert.equal(hasPermissionForRole("manager", CASH_ADVANCE_PERMISSIONS.settle), false);
});

test("9. Authority: Accountant role has readOwn, submitOwn, broad read, issue, and settle", () => {
  assert.equal(hasPermissionForRole("accountant", CASH_ADVANCE_PERMISSIONS.readOwn), true);
  assert.equal(hasPermissionForRole("accountant", CASH_ADVANCE_PERMISSIONS.submitOwn), true);
  assert.equal(hasPermissionForRole("accountant", CASH_ADVANCE_PERMISSIONS.read), true);
  assert.equal(hasPermissionForRole("accountant", CASH_ADVANCE_PERMISSIONS.issue), true);
  assert.equal(hasPermissionForRole("accountant", CASH_ADVANCE_PERMISSIONS.settle), true);
});

test("10. Authority: Accountant role has Cash Advance approve authority", () => {
  assert.equal(hasPermissionForRole("accountant", CASH_ADVANCE_PERMISSIONS.approve), true);
});

test("11. Authority: Viewer role has zero Cash Advance permissions", () => {
  assert.equal(hasPermissionForRole("viewer", CASH_ADVANCE_PERMISSIONS.readOwn), false);
  assert.equal(hasPermissionForRole("viewer", CASH_ADVANCE_PERMISSIONS.submitOwn), false);
  assert.equal(hasPermissionForRole("viewer", CASH_ADVANCE_PERMISSIONS.read), false);
  assert.equal(hasPermissionForRole("viewer", CASH_ADVANCE_PERMISSIONS.approve), false);
  assert.equal(hasPermissionForRole("viewer", CASH_ADVANCE_PERMISSIONS.issue), false);
  assert.equal(hasPermissionForRole("viewer", CASH_ADVANCE_PERMISSIONS.settle), false);
});

test("12. Authority: Admin wildcard continues to authorize all Cash Advance permissions", () => {
  assert.equal(hasPermissionForRole("admin", CASH_ADVANCE_PERMISSIONS.readOwn), true);
  assert.equal(hasPermissionForRole("admin", CASH_ADVANCE_PERMISSIONS.submitOwn), true);
  assert.equal(hasPermissionForRole("admin", CASH_ADVANCE_PERMISSIONS.read), true);
  assert.equal(hasPermissionForRole("admin", CASH_ADVANCE_PERMISSIONS.approve), true);
  assert.equal(hasPermissionForRole("admin", CASH_ADVANCE_PERMISSIONS.issue), true);
  assert.equal(hasPermissionForRole("admin", CASH_ADVANCE_PERMISSIONS.settle), true);
  assert.equal(hasPermissionForRole("admin", CASH_ADVANCE_PERMISSIONS.create), true);
});

// ============================================================================
// OWN READ TESTS (13-16)
// ============================================================================

test("13. Own Read: getOwnCashAdvancesList requires readOwn and forces recipient_id = current user.id", () => {
  const code = fs.readFileSync(QUERIES_PATH, "utf8");
  assert.ok(
    code.includes("export async function getOwnCashAdvancesList"),
    "getOwnCashAdvancesList must be exported in queries.ts",
  );
  assert.ok(
    code.includes("requirePermission(CASH_ADVANCE_PERMISSIONS.readOwn)"),
    "getOwnCashAdvancesList must require readOwn permission",
  );
  assert.ok(
    code.includes('.eq("recipient_id", user.id)'),
    "getOwnCashAdvancesList must server-authoritatively filter by recipient_id = user.id",
  );
});

test("14. Own Read: getOwnCashAdvancesList signature cannot be overridden with external recipientId", () => {
  const code = fs.readFileSync(QUERIES_PATH, "utf8");
  const funcSlice = code.slice(code.indexOf("getOwnCashAdvancesList"));
  const sig = funcSlice.slice(0, funcSlice.indexOf("{"));
  assert.equal(
    sig.includes("recipientId"),
    false,
    "getOwnCashAdvancesList must not accept recipientId in its parameter signature",
  );
});

test("15. Own Read: getOwnCashAdvanceDetailById queries with recipient_id = user.id", () => {
  const code = fs.readFileSync(QUERIES_PATH, "utf8");
  assert.ok(
    code.includes("export async function getOwnCashAdvanceDetailById"),
    "getOwnCashAdvanceDetailById must be exported in queries.ts",
  );
  assert.ok(
    code.includes('.eq("recipient_id", user.id)'),
    "getOwnCashAdvanceDetailById must filter by recipient_id = user.id",
  );
});

test("16. Own Read: getOwnCashAdvanceDetailById returns null/empty if record not owned", () => {
  const code = fs.readFileSync(QUERIES_PATH, "utf8");
  const funcStart = code.indexOf("getOwnCashAdvanceDetailById");
  const funcBody = code.slice(funcStart, funcStart + 1500);
  assert.ok(
    funcBody.includes("if (!advanceData)") &&
    funcBody.includes("return { advance: null, allocations: [], returns: [] }"),
    "getOwnCashAdvanceDetailById must return empty/not-found result when advance is not found for current user",
  );
});

// ============================================================================
// OWN REQUEST TESTS (17-23)
// ============================================================================

test("17. Own Request: requestOwnCashAdvanceAction forces p_recipient_id = user.id and p_advance_number = null", () => {
  const code = fs.readFileSync(ACTIONS_PATH, "utf8");
  assert.ok(
    code.includes("export async function requestOwnCashAdvanceAction"),
    "requestOwnCashAdvanceAction must be exported in actions.ts",
  );
  assert.ok(
    code.includes("requirePermission(CASH_ADVANCE_PERMISSIONS.submitOwn)"),
    "requestOwnCashAdvanceAction must require submitOwn permission",
  );
  assert.ok(
    code.includes("p_recipient_id: user.id"),
    "requestOwnCashAdvanceAction must authoritatively set p_recipient_id to user.id",
  );
  assert.ok(
    code.includes("p_advance_number: null"),
    "requestOwnCashAdvanceAction must pass p_advance_number: null for database generation",
  );
});

test("18. Own Request: requestOwnCashAdvanceSchema rejects/ignores recipient_id from client input", () => {
  const parsed = requestOwnCashAdvanceSchema.safeParse({
    context_type: "company",
    purpose: "Operational emergency office supplies",
    amount_issued: 250.0,
    request_id: VALID_UUID_1,
    recipient_id: VALID_UUID_2, // Malicious attempt to specify another recipient
  });
  assert.equal(parsed.success, true);
  // Zod strip behavior ensures recipient_id is not in validated output
  assert.equal((parsed.data as Record<string, unknown>).recipient_id, undefined);
});

test("19. Own Request: requestOwnCashAdvanceSchema rejects/ignores advance_number from client input", () => {
  const parsed = requestOwnCashAdvanceSchema.safeParse({
    context_type: "company",
    purpose: "Operational emergency office supplies",
    amount_issued: 250.0,
    request_id: VALID_UUID_1,
    advance_number: "ADV-9999-9999", // Malicious attempt to choose advance number
  });
  assert.equal(parsed.success, true);
  assert.equal((parsed.data as Record<string, unknown>).advance_number, undefined);
});

test("20. Own Request: requestOwnCashAdvanceSchema requires amount_issued to be positive", () => {
  const invalid = requestOwnCashAdvanceSchema.safeParse({
    context_type: "company",
    purpose: "Valid purpose for expense",
    amount_issued: -50.0,
    request_id: VALID_UUID_1,
  });
  assert.equal(invalid.success, false);

  const valid = requestOwnCashAdvanceSchema.safeParse({
    context_type: "company",
    purpose: "Valid purpose for expense",
    amount_issued: 500.0,
    request_id: VALID_UUID_1,
  });
  assert.equal(valid.success, true);
  assert.equal(valid.data.amount_issued, 500.0);
});

test("21. Own Request: requestOwnCashAdvanceSchema company context rejects service_id", () => {
  const invalid = requestOwnCashAdvanceSchema.safeParse({
    context_type: "company",
    service_id: VALID_UUID_2,
    purpose: "Company operational supplies",
    amount_issued: 100.0,
    request_id: VALID_UUID_1,
  });
  assert.equal(invalid.success, false);
  assert.ok(
    invalid.error?.issues.some((i) =>
      i.message.includes("Company context advance must not specify a service_id"),
    ),
  );
});

test("22. Own Request: requestOwnCashAdvanceSchema event context requires valid service_id", () => {
  const missingService = requestOwnCashAdvanceSchema.safeParse({
    context_type: "event",
    purpose: "Event production petty supplies",
    amount_issued: 300.0,
    request_id: VALID_UUID_1,
  });
  assert.equal(missingService.success, false);
  assert.ok(
    missingService.error?.issues.some((i) =>
      i.message.includes("Event context advance must specify a service_id"),
    ),
  );

  const withService = requestOwnCashAdvanceSchema.safeParse({
    context_type: "event",
    service_id: VALID_UUID_2,
    purpose: "Event production petty supplies",
    amount_issued: 300.0,
    request_id: VALID_UUID_1,
  });
  assert.equal(withService.success, true);
  assert.equal(withService.data.service_id, VALID_UUID_2);
});

test("23. Own Request: requestOwnCashAdvanceSchema retains request_id UUID validation", () => {
  const badRequestId = requestOwnCashAdvanceSchema.safeParse({
    context_type: "company",
    purpose: "Company operational supplies",
    amount_issued: 150.0,
    request_id: "not-a-uuid",
  });
  assert.equal(badRequestId.success, false);
});

// ============================================================================
// NUMBERING MIGRATION TESTS (24-31)
// ============================================================================

test("24. Numbering: Migration preserves every existing sequence type in check constraint", () => {
  const sql = fs.readFileSync(MIGRATION_PATH, "utf8");
  const requiredTypes = [
    "quotation",
    "invoice",
    "payment",
    "project",
    "service",
    "customer",
    "supplier_booking",
    "expense",
  ];
  for (const t of requiredTypes) {
    assert.ok(
      sql.includes(`'${t}'`),
      `Migration must preserve existing number sequence type '${t}'`,
    );
  }
});

test("25. Numbering: Migration adds cash_advance to number_sequences type check", () => {
  const sql = fs.readFileSync(MIGRATION_PATH, "utf8");
  assert.ok(
    sql.includes("'cash_advance'"),
    "Migration must include 'cash_advance' in number_sequences check constraint",
  );
});

test("26. Numbering: Migration sets prefix to ADV for cash_advance", () => {
  const sql = fs.readFileSync(MIGRATION_PATH, "utf8");
  assert.ok(
    sql.includes("WHEN doc_type = 'cash_advance'     THEN 'ADV'") ||
    sql.includes("WHEN doc_type = 'cash_advance' THEN 'ADV'"),
    "generate_document_number must assign prefix 'ADV' to 'cash_advance'",
  );
});

test("27. Numbering: Migration defines format ADV-YYYY-0001 for cash_advance", () => {
  const sql = fs.readFileSync(MIGRATION_PATH, "utf8");
  assert.ok(
    sql.includes("ADV-YYYY-0001"),
    "generate_document_number example format must be 'ADV-YYYY-0001'",
  );
  assert.ok(
    sql.includes("lpad(seq_record.sequence::text, 4, '0')"),
    "generate_document_number must pad sequence with 4 digits",
  );
});

test("28. Numbering: request_cash_advance generates document number when p_advance_number is NULL or blank", () => {
  const sql = fs.readFileSync(MIGRATION_PATH, "utf8");
  assert.ok(
    sql.includes("v_effective_advance_number := NULLIF(btrim(p_advance_number), '');"),
    "request_cash_advance must treat blank advance_number as NULL",
  );
  assert.ok(
    sql.includes("public.generate_document_number('cash_advance')"),
    "request_cash_advance must call generate_document_number('cash_advance') when number is null",
  );
});

test("29. Numbering: request_cash_advance preserves duplicate protection on explicit number", () => {
  const sql = fs.readFileSync(MIGRATION_PATH, "utf8");
  assert.ok(
    sql.includes("EXCEPTION WHEN unique_violation THEN"),
    "request_cash_advance must trap unique_violation",
  );
  assert.ok(
    sql.includes("'advance_number_already_exists'"),
    "request_cash_advance must return 'advance_number_already_exists' on conflict",
  );
});

test("30. Numbering: Migration preserves Expense prefix EXP and format EXP-YYYY-0001", () => {
  const sql = fs.readFileSync(MIGRATION_PATH, "utf8");
  assert.ok(
    sql.includes("WHEN doc_type = 'expense'   THEN 'EXP'") ||
    sql.includes("WHEN doc_type = 'expense' THEN 'EXP'"),
    "generate_document_number must preserve prefix 'EXP' for expense",
  );
  assert.ok(
    sql.includes("'EXP-YYYY-0001'"),
    "generate_document_number must preserve 'EXP-YYYY-0001' format",
  );
});

test("31. Numbering: Migration preserves all prior document prefixes (QT, INV, PAY, PRJ, SVC, CUST, SBK)", () => {
  const sql = fs.readFileSync(MIGRATION_PATH, "utf8");
  const expectedPrefixes = ["QT", "INV", "PAY", "PRJ", "SVC", "CUST", "SBK"];
  for (const prefix of expectedPrefixes) {
    assert.ok(
      sql.includes(`'${prefix}'`),
      `generate_document_number must preserve prefix '${prefix}'`,
    );
  }
});

// ============================================================================
// SERVICE / EVENT INTEGRITY TESTS (32-36)
// ============================================================================

test("32. Service Integrity: settle_cash_advance_spend loads context_type and service_id for both Advance and Expense", () => {
  const sql = fs.readFileSync(MIGRATION_PATH, "utf8");
  assert.ok(
    sql.includes("v_advance_context text;") && sql.includes("v_advance_service_id uuid;"),
    "settle_cash_advance_spend must declare advance context variables",
  );
  assert.ok(
    sql.includes("v_expense_context text;") && sql.includes("v_expense_service_id uuid;"),
    "settle_cash_advance_spend must declare expense context variables",
  );
});

test("33. Service Integrity: settle_cash_advance_spend fails closed if advance.context_type != expense.context_type", () => {
  const sql = fs.readFileSync(MIGRATION_PATH, "utf8");
  assert.ok(
    sql.includes("IF v_advance_context != v_expense_context THEN"),
    "settle_cash_advance_spend must verify advance_context == expense_context",
  );
  assert.ok(
    sql.includes("'service_context_mismatch'"),
    "settle_cash_advance_spend must return 'service_context_mismatch' error code",
  );
});

test("34. Service Integrity: settle_cash_advance_spend fails closed if Event advance service_id != expense service_id", () => {
  const sql = fs.readFileSync(MIGRATION_PATH, "utf8");
  assert.ok(
    sql.includes("v_advance_service_id IS DISTINCT FROM v_expense_service_id"),
    "settle_cash_advance_spend must enforce identical service_id for event context",
  );
});

test("35. Service Integrity: settle_cash_advance_spend fails closed if Company advance has non-null service_id on either side", () => {
  const sql = fs.readFileSync(MIGRATION_PATH, "utf8");
  assert.ok(
    sql.includes("ELSIF v_advance_context = 'company' THEN"),
    "settle_cash_advance_spend must evaluate company context branch",
  );
  assert.ok(
    sql.includes("v_advance_service_id IS NOT NULL OR v_expense_service_id IS NOT NULL"),
    "settle_cash_advance_spend must reject any service_id present on company context",
  );
});

test("36. Service Integrity: settle_cash_advance_spend retains all double-bounded checks and zero-balance auto-settlement", () => {
  const sql = fs.readFileSync(MIGRATION_PATH, "utf8");
  assert.ok(
    sql.includes("p_amount > v_remaining_balance"),
    "settle_cash_advance_spend must check remaining_balance ceiling",
  );
  assert.ok(
    sql.includes("v_already_allocated + p_amount > v_expense_amount"),
    "settle_cash_advance_spend must check expense amount ceiling",
  );
  assert.ok(
    sql.includes("amount_spent_settled = amount_spent_settled + p_amount"),
    "settle_cash_advance_spend must update amount_spent_settled",
  );
  assert.ok(
    sql.includes("(amount_spent_settled + p_amount + amount_returned) = amount_issued THEN 'settled'"),
    "settle_cash_advance_spend must automatically transition to 'settled' when remaining balance reaches zero",
  );
});

// ============================================================================
// REGRESSION & SECURITY TESTS (37-44)
// ============================================================================

test("37. Approval repair: replaces the legacy table self-approval check with a role-aware trigger", () => {
  const sql = fs.readFileSync(APPROVAL_REPAIR_MIGRATION_PATH, "utf8");
  assert.ok(
    sql.includes("DROP CONSTRAINT IF EXISTS chk_advance_no_self_approval"),
    "The corrective migration must supersede the legacy table-level self-approval check",
  );
  assert.ok(
    sql.includes("CREATE OR REPLACE FUNCTION public.enforce_cash_advance_approval_authority()"),
    "The corrective migration must add a role-aware database guard",
  );
  assert.ok(
    sql.includes("current_setting('g7.cash_advance_actor_role', true)"),
    "The database guard must read the transaction-local actor role",
  );
});

test("38. Approval repair: Admin and Accountant are the only self-approval exception roles", () => {
  const sql = fs.readFileSync(APPROVAL_REPAIR_MIGRATION_PATH, "utf8");
  assert.ok(
    sql.includes("COALESCE(p_actor_role, '') NOT IN ('admin', 'accountant')"),
    "The RPC must preserve self-approval rejection for every other actor role",
  );
  assert.ok(
    sql.includes("COALESCE(v_actor_role, '') NOT IN ('admin', 'accountant')"),
    "The trigger must preserve self-approval rejection for every other actor role",
  );
  assert.ok(sql.includes("v_requested_by = v_actor_uuid"));
  assert.ok(sql.includes("v_recipient_id = v_actor_uuid"));
});

test("39. Approval repair: Accountant role has Cash Advance approve authority", () => {
  assert.equal(hasPermissionForRole("accountant", CASH_ADVANCE_PERMISSIONS.approve), true);
});

test("40. Approval repair: Manager has no Cash Advance decision authority and retains no issue/settle authority", () => {
  assert.equal(hasPermissionForRole("manager", CASH_ADVANCE_PERMISSIONS.approve), false);
  assert.equal(hasPermissionForRole("manager", CASH_ADVANCE_PERMISSIONS.issue), false);
  assert.equal(hasPermissionForRole("manager", CASH_ADVANCE_PERMISSIONS.settle), false);
});

test("41. Approval repair: Sales, Operations, and Viewer remain outside Cash Advance decision authority", () => {
  for (const role of ["sales", "operations", "viewer"] as const) {
    assert.equal(hasPermissionForRole(role, CASH_ADVANCE_PERMISSIONS.approve), false);
  }
});

test("42. Approval repair: Admin and Accountant self-approval remains submitted-state-only", () => {
  const sql = fs.readFileSync(APPROVAL_REPAIR_MIGRATION_PATH, "utf8");
  assert.ok(sql.includes("IF v_status != 'submitted' THEN"));
  assert.ok(sql.includes("SET status = 'approved'"));
});

test("43. Approval repair: replay, conflict, row-lock, audit, and grant contracts remain intact", () => {
  const sql = fs.readFileSync(APPROVAL_REPAIR_MIGRATION_PATH, "utf8");
  for (const required of [
    "pg_advisory_xact_lock",
    "cash_advance_approve_request_conflict",
    "idempotent_replay",
    "FOR UPDATE",
    "cash_advance_approved",
    "REVOKE ALL ON FUNCTION public.approve_cash_advance(uuid, uuid, text, text)",
    "GRANT EXECUTE ON FUNCTION public.approve_cash_advance(uuid, uuid, text, text) TO service_role",
  ]) {
    assert.ok(sql.includes(required), `Approval repair must preserve ${required}`);
  }
});

test("44. Approval repair: migration scope does not redefine unrelated financial RPCs", () => {
  const sql = fs.readFileSync(APPROVAL_REPAIR_MIGRATION_PATH, "utf8");
  for (const unrelatedRpc of [
    "CREATE OR REPLACE FUNCTION public.submit_expense",
    "CREATE OR REPLACE FUNCTION public.record_cash_advance_return",
    "CREATE OR REPLACE FUNCTION public.settle_cash_advance_spend",
    "CREATE OR REPLACE FUNCTION public.issue_cash_advance",
  ]) {
    assert.equal(sql.includes(unrelatedRpc), false, `Migration must not redefine ${unrelatedRpc}`);
  }
});

test("45. Regression/Security: Existing Employee Expense Self-Service authority is preserved unchanged", () => {
  assert.equal(hasPermissionForRole("sales", EXPENSE_PERMISSIONS.readOwn), true);
  assert.equal(hasPermissionForRole("sales", EXPENSE_PERMISSIONS.submitOwn), true);
  assert.equal(hasPermissionForRole("operations", EXPENSE_PERMISSIONS.readOwn), true);
  assert.equal(hasPermissionForRole("operations", EXPENSE_PERMISSIONS.submitOwn), true);
  assert.equal(hasPermissionForRole("manager", EXPENSE_PERMISSIONS.readOwn), true);
  assert.equal(hasPermissionForRole("manager", EXPENSE_PERMISSIONS.submitOwn), true);
  assert.equal(hasPermissionForRole("accountant", EXPENSE_PERMISSIONS.readOwn), true);
  assert.equal(hasPermissionForRole("accountant", EXPENSE_PERMISSIONS.submitOwn), true);
});

test("46. Regression/Security: Petty Cash permissions remain narrowly governed", () => {
  assert.equal(hasPermissionForRole("sales", PETTY_CASH_PERMISSIONS.read), false);
  assert.equal(hasPermissionForRole("operations", PETTY_CASH_PERMISSIONS.read), false);
  assert.equal(hasPermissionForRole("manager", PETTY_CASH_PERMISSIONS.read), true);
  assert.equal(hasPermissionForRole("manager", PETTY_CASH_PERMISSIONS.manage), false);
  assert.equal(hasPermissionForRole("manager", PETTY_CASH_PERMISSIONS.transact), false);
  assert.equal(hasPermissionForRole("accountant", PETTY_CASH_PERMISSIONS.read), true);
  assert.equal(hasPermissionForRole("accountant", PETTY_CASH_PERMISSIONS.manage), true);
  assert.equal(hasPermissionForRole("accountant", PETTY_CASH_PERMISSIONS.transact), true);
  assert.equal(hasPermissionForRole("admin", PETTY_CASH_PERMISSIONS.read), true);
});

test("47. Regression/Security: No AP or general accounting permissions were introduced", () => {
  const allPermissions = Object.values(ROLE_PERMISSIONS).flat();
  assert.equal(allPermissions.some((p) => p.startsWith("ap:")), false);
  assert.equal(allPermissions.some((p) => p.startsWith("bills:")), false);
  assert.equal(allPermissions.some((p) => p.startsWith("ledger:")), false);
});

test("48. Regression/Security: Only advances UI route invokes requestOwnCashAdvanceAction", () => {
  const dashboardDir = path.join(process.cwd(), "src", "app", "(dashboard)");
  const files = fs.readdirSync(dashboardDir, { recursive: true }) as string[];
  for (const f of files) {
    if (f.endsWith(".tsx") || f.endsWith(".ts")) {
      const normalizedPath = f.replace(/\\/g, "/");
      const isAdvancesFile = normalizedPath.startsWith("advances/");
      const content = fs.readFileSync(path.join(dashboardDir, f), "utf8");
      if (!isAdvancesFile) {
        assert.equal(
          content.includes("requestOwnCashAdvanceAction"),
          false,
          `UI route file ${f} outside advances must not invoke requestOwnCashAdvanceAction`,
        );
      }
    }
  }
});
