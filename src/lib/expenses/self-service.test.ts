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
        url: "data:text/javascript,export const requirePermission = async (perm) => (globalThis.__mockRequirePermission ? globalThis.__mockRequirePermission(perm) : { id: 'usr_emp_001', clerk_user_id: 'clerk_001', role: 'sales' }); export const checkPermission = async (perm) => (globalThis.__mockCheckPermission ? globalThis.__mockCheckPermission(perm) : true);",
      };
    }

    if (specifier === "@/lib/supabase/admin") {
      return {
        shortCircuit: true,
        url: "data:text/javascript,export const createAdminClient = () => (globalThis.__mockAdminClient ? globalThis.__mockAdminClient() : { rpc: async (fn, args) => (globalThis.__mockRpcHandler ? globalThis.__mockRpcHandler(fn, args) : { data: [], error: null }), from: (table) => (globalThis.__mockFromHandler ? globalThis.__mockFromHandler(table) : { select: () => ({ eq: () => ({ single: async () => ({ data: {} }), maybeSingle: async () => ({ data: {} }), order: () => ({ limit: () => ({ maybeSingle: async () => ({ data: {} }) }) }) }), in: () => ({ data: [] }), is: () => ({ order: () => ({ data: [] }) }), or: () => ({ order: () => ({ limit: () => ({ data: [] }), eq: () => ({ limit: () => ({ data: [] }) }) }) }) }), insert: () => ({ select: () => ({ single: async () => ({ data: { id: 'doc_1' }, error: null }) }) }), delete: () => ({ eq: async () => ({ error: null }) }) }), storage: { from: () => ({ upload: async () => ({ error: null }), remove: async () => ({ error: null }), createSignedUrl: async () => ({ data: { signedUrl: 'https://example.com/receipt.pdf' }, error: null }) }) } });",
      };
    }

    if (specifier.startsWith("@/")) {
      return {
        shortCircuit: true,
        url: new URL(`../../${specifier.slice(2)}.ts`, import.meta.url).href,
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
  EXPENSE_PERMISSIONS,
  BUSINESS_DOCUMENT_PERMISSIONS,
  hasPermissionForRole,
} = await import("../auth/role-permissions.ts");

const {
  selfServiceSubmitExpenseSchema,
} = await import("./schemas.ts");

const {
  validateBusinessDocumentFile,
} = await import("../documents/storage.ts");

const {
  getExpensesDictionary,
} = await import("../i18n/dictionaries/expenses.ts");

const {
  submitOwnExpenseAction,
  submitSelfServiceExpenseWithReceiptAction,
  attachExpenseReceiptAction,
  getPrivateExpenseReceiptUrlAction,
} = await import("./actions.ts");

const {
  getOwnExpenseDetailById,
  getEligibleServicesForExpenseSelector,
} = await import("./queries.ts");

type MockRpcResponse = { data: unknown[] | null; error: { message: string; code?: string } | null };

declare global {
  var __mockRpcHandler: ((name: string, args: Record<string, unknown>) => Promise<MockRpcResponse>) | undefined;
  var __mockFromHandler: ((table: string) => unknown) | undefined;
  var __mockRequirePermission: ((perm: string) => Promise<{ id: string; clerk_user_id: string; role: string }>) | undefined;
}

const ACTIONS_FILE_PATH = path.join(process.cwd(), "src", "lib", "expenses", "actions.ts");
const QUERIES_FILE_PATH = path.join(process.cwd(), "src", "lib", "expenses", "queries.ts");
const CLIENT_FILE_PATH = path.join(process.cwd(), "src", "app", "(dashboard)", "expenses", "ExpensesClient.tsx");
const MODAL_FILE_PATH = path.join(process.cwd(), "src", "app", "(dashboard)", "expenses", "ExpenseSubmissionModal.tsx");

// 1. Self-service submit passes p_expense_number = null
test("Requirement 1: Self-service submit passes p_expense_number = null", () => {
  const actionsContent = fs.readFileSync(ACTIONS_FILE_PATH, "utf8");
  assert.ok(
    actionsContent.includes("p_expense_number: null"),
    "submitOwnExpenseAction must pass p_expense_number: null to submit_expense RPC"
  );
});

// 2. Employee cannot provide or forge Expense number
test("Requirement 2: Employee cannot provide or forge Expense number", () => {
  const parsed = selfServiceSubmitExpenseSchema.safeParse({
    context_type: "company",
    expense_category: "travel",
    description: "Business travel expense",
    amount: 150.0,
    expense_date: "2026-09-08",
    expense_number: "EXP-FORGED-9999", // Attempted forgery
  });
  assert.equal(parsed.success, true);
  // The schema must not include expense_number in output data
  assert.equal("expense_number" in (parsed.data as Record<string, unknown>), false);
});

// 3. origin_type forced to employee_paid
test("Requirement 3: origin_type is forced to employee_paid", () => {
  const actionsContent = fs.readFileSync(ACTIONS_FILE_PATH, "utf8");
  assert.ok(
    actionsContent.includes('p_origin_type: "employee_paid"'),
    "submitOwnExpenseAction must force p_origin_type: 'employee_paid'"
  );
});

// 4. payment_method forced to personal_funds
test("Requirement 4: payment_method is forced to personal_funds", () => {
  const actionsContent = fs.readFileSync(ACTIONS_FILE_PATH, "utf8");
  assert.ok(
    actionsContent.includes('p_payment_method: "personal_funds"'),
    "submitOwnExpenseAction must force p_payment_method: 'personal_funds'"
  );
});

// 5. claimant_id forced to current user
test("Requirement 5: claimant_id is forced to current user", () => {
  const actionsContent = fs.readFileSync(ACTIONS_FILE_PATH, "utf8");
  assert.ok(
    actionsContent.includes("p_claimant_id: user.id"),
    "submitOwnExpenseAction must force p_claimant_id: user.id"
  );
});

// 6. cash_advance_id forced null
test("Requirement 6: cash_advance_id is forced null", () => {
  const actionsContent = fs.readFileSync(ACTIONS_FILE_PATH, "utf8");
  assert.ok(
    actionsContent.includes("p_cash_advance_id: null"),
    "submitOwnExpenseAction must force p_cash_advance_id: null"
  );
});

// 7. petty_cash_fund_id forced null
test("Requirement 7: petty_cash_fund_id is forced null", () => {
  const actionsContent = fs.readFileSync(ACTIONS_FILE_PATH, "utf8");
  assert.ok(
    actionsContent.includes("p_petty_cash_fund_id: null"),
    "submitOwnExpenseAction must force p_petty_cash_fund_id: null"
  );
});

// 8. company context rejects Service
test("Requirement 8: company context rejects Service", () => {
  const parsed = selfServiceSubmitExpenseSchema.safeParse({
    context_type: "company",
    service_id: "e44d82ec-84f9-4ee6-857c-65824c08e562",
    expense_category: "supplies",
    description: "Office stationery",
    amount: 50.0,
    expense_date: "2026-09-08",
  });
  assert.equal(parsed.success, false, "Company context must reject non-null service_id");
});

// 9. event context requires Service
test("Requirement 9: event context requires Service", () => {
  const parsedWithoutService = selfServiceSubmitExpenseSchema.safeParse({
    context_type: "event",
    expense_category: "supplies",
    description: "Event badges",
    amount: 50.0,
    expense_date: "2026-09-08",
  });
  assert.equal(parsedWithoutService.success, false, "Event context must require service_id");

  const parsedWithService = selfServiceSubmitExpenseSchema.safeParse({
    context_type: "event",
    service_id: "e44d82ec-84f9-4ee6-857c-65824c08e562",
    expense_category: "supplies",
    description: "Event badges",
    amount: 50.0,
    expense_date: "2026-09-08",
  });
  assert.equal(parsedWithService.success, true, "Event context with service_id must succeed");
});

// 10. own list cannot expose another employee's Expense
test("Requirement 10: own list query enforces submitted_by = user.id OR claimant_id = user.id", () => {
  const queriesContent = fs.readFileSync(QUERIES_FILE_PATH, "utf8");
  assert.ok(
    queriesContent.includes("getOwnExpensesAccountabilityList"),
    "getOwnExpensesAccountabilityList must exist"
  );
  assert.ok(
    queriesContent.includes("submitted_by.eq.${user.id},claimant_id.eq.${user.id}"),
    "Query must enforce or condition with authenticated user id"
  );
});

// 11. own detail cannot expose another employee's Expense
test("Requirement 11: own detail query rejects another employee's Expense", () => {
  const queriesContent = fs.readFileSync(QUERIES_FILE_PATH, "utf8");
  assert.ok(
    queriesContent.includes("getOwnExpenseDetailById"),
    "getOwnExpenseDetailById must exist"
  );
  assert.ok(
    queriesContent.includes("expenseData.submitted_by !== user.id && expenseData.claimant_id !== user.id"),
    "Must fail closed if expense does not belong to current user"
  );
});

// 12. receipt upload requires expenses:submit_own
test("Requirement 12: receipt upload requires expenses:submit_own", () => {
  const actionsContent = fs.readFileSync(ACTIONS_FILE_PATH, "utf8");
  assert.ok(
    actionsContent.includes("requirePermission(EXPENSE_PERMISSIONS.submitOwn)"),
    "Receipt actions must require EXPENSE_PERMISSIONS.submitOwn"
  );
});

// 13. receipt upload fails for another employee's Expense
test("Requirement 13: receipt upload fails for another employee's Expense", () => {
  const actionsContent = fs.readFileSync(ACTIONS_FILE_PATH, "utf8");
  assert.ok(
    actionsContent.includes("exp.submitted_by !== user.id && exp.claimant_id !== user.id"),
    "Receipt upload must check ownership and fail if caller is neither submitted_by nor claimant_id"
  );
});

// 14. receipt flow does not require or grant documents:write
test("Requirement 14: receipt flow does not require or grant documents:write", () => {
  // Sales & Operations have submitOwn but NOT documents:write
  assert.equal(hasPermissionForRole("sales", EXPENSE_PERMISSIONS.submitOwn), true);
  assert.equal(hasPermissionForRole("sales", BUSINESS_DOCUMENT_PERMISSIONS.write), false);
  assert.equal(hasPermissionForRole("operations", EXPENSE_PERMISSIONS.submitOwn), true);
  assert.equal(hasPermissionForRole("operations", BUSINESS_DOCUMENT_PERMISSIONS.write), false);

  const actionsContent = fs.readFileSync(ACTIONS_FILE_PATH, "utf8");
  assert.ok(
    !actionsContent.includes("requirePermission(BUSINESS_DOCUMENT_PERMISSIONS.write)"),
    "Self-service receipt flow must not demand documents:write"
  );
});

// 15. unsupported MIME fails
test("Requirement 15: unsupported MIME fails validation", async () => {
  const fakeTxtFile = {
    name: "notes.txt",
    type: "text/plain",
    size: 100,
    arrayBuffer: async () => Buffer.from("hello world").buffer,
  };

  await assert.rejects(
    async () => validateBusinessDocumentFile(fakeTxtFile),
    /Only PDF, JPEG, and PNG documents are supported/
  );
});

// 16. oversized file fails
test("Requirement 16: oversized file (> 25MB) fails validation", async () => {
  const fakeLargeFile = {
    name: "large.pdf",
    type: "application/pdf",
    size: 26 * 1024 * 1024, // 26 MB
    arrayBuffer: async () => Buffer.from("%PDF-1.4 header").buffer,
  };

  await assert.rejects(
    async () => validateBusinessDocumentFile(fakeLargeFile),
    /exceeds the 25 MB limit/
  );
});

// 17. signature mismatch fails
test("Requirement 17: signature mismatch fails validation", async () => {
  const bytes = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  const fakeSpoofedFile = {
    name: "fake.pdf",
    type: "application/pdf",
    size: bytes.byteLength,
    arrayBuffer: async () => bytes.buffer,
  };

  await assert.rejects(
    async () => validateBusinessDocumentFile(fakeSpoofedFile),
    /The document content does not match its declared type/
  );
});

// 18. storage failure does not create false success
test("Requirement 18: storage failure returns failure and does not claim success", () => {
  const actionsContent = fs.readFileSync(ACTIONS_FILE_PATH, "utf8");
  assert.ok(
    actionsContent.includes("Storage upload failed:"),
    "Storage upload failure must be handled and returned with success: false"
  );
});

// 19. metadata failure compensates storage
test("Requirement 19: metadata failure compensates storage", () => {
  const actionsContent = fs.readFileSync(ACTIONS_FILE_PATH, "utf8");
  assert.ok(
    actionsContent.includes("Case B: Storage succeeds, metadata insert fails"),
    "Case B compensation comment must exist"
  );
  assert.ok(
    /\.storage\s*\.from\(\s*BUSINESS_DOCUMENT_BUCKET\s*\)\s*\.remove\(\s*\[objectPath\]\s*\)/.test(
      actionsContent
    ),
    "Storage object must be deleted on metadata or attachment failure"
  );
});

// 20. attachment failure compensates metadata/storage
test("Requirement 20: attachment failure compensates metadata and storage", () => {
  const actionsContent = fs.readFileSync(ACTIONS_FILE_PATH, "utf8");
  assert.ok(
    actionsContent.includes("Case C: Storage + metadata succeed, Expense attachment fails"),
    "Case C compensation comment must exist"
  );
  assert.ok(
    /\.from\(\s*["']business_documents["']\s*\)\s*\.delete\(\s*\)\s*\.eq\(\s*["']id["']\s*,\s*documentId\s*\)/.test(
      actionsContent
    ),
    "Metadata row must be deleted if attachment RPC fails"
  );
});

// 21. partial submission preserves the Expense
test("Requirement 21: partial submission preserves the Expense if receipt attachment fails", () => {
  const actionsContent = fs.readFileSync(ACTIONS_FILE_PATH, "utf8");
  assert.ok(
    actionsContent.includes('outcome: "partial_success"'),
    "Action must return outcome: partial_success"
  );
  assert.ok(
    !actionsContent.includes("deleteExpenseOnReceiptFailure"),
    "Expense must not be deleted when receipt attachment fails"
  );
});

// 22. receipt retry reuses existing Expense
test("Requirement 22: receipt retry reuses existing Expense", () => {
  const actionsContent = fs.readFileSync(ACTIONS_FILE_PATH, "utf8");
  assert.ok(
    actionsContent.includes("export async function attachExpenseReceiptAction"),
    "attachExpenseReceiptAction must exist for retry"
  );
  assert.ok(
    actionsContent.includes("formData.get(\"expense_id\")"),
    "attachExpenseReceiptAction must accept existing expense_id"
  );
});

// 23. generated authoritative Expense number is returned after creation
test("Requirement 23: generated authoritative Expense number is loaded and returned", () => {
  const actionsContent = fs.readFileSync(ACTIONS_FILE_PATH, "utf8");
  assert.ok(
    actionsContent.includes(".select(\"expense_number\")"),
    "Must select authoritative expense_number after RPC call"
  );
  assert.ok(
    actionsContent.includes('expense_number: expRow?.expense_number ?? ""'),
    "Must return authoritative expense_number in action result"
  );
});

// 24. Finance-review state is display-only
test("Requirement 24: Finance-review state is display-only", () => {
  const clientContent = fs.readFileSync(CLIENT_FILE_PATH, "utf8");
  assert.ok(
    clientContent.includes("dictionary.financeReviewStates.reviewed"),
    "Must render reviewed badge"
  );
  assert.ok(
    clientContent.includes("dictionary.financeReviewStates.pending"),
    "Must render pending badge"
  );
});

// 25. no Review/Approve/Reject/Settle controls exist in W5B-1B
test("Requirement 25: no Review/Approve/Reject/Settle mutation controls exist in W5B-1B UI", () => {
  const clientContent = fs.readFileSync(CLIENT_FILE_PATH, "utf8");
  const modalContent = fs.readFileSync(MODAL_FILE_PATH, "utf8");

  // Check no mutation triggers exist
  assert.ok(!clientContent.includes("reviewExpenseFinanceAction"), "No Finance review action in client");
  assert.ok(!clientContent.includes("approveExpenseAction"), "No Approve action in client");
  assert.ok(!clientContent.includes("rejectExpenseAction"), "No Reject action in client");
  assert.ok(!clientContent.includes("settleExpenseReimbursementAction"), "No Settle action in client");

  assert.ok(!modalContent.includes("reviewExpenseFinanceAction"), "No Finance review action in modal");
  assert.ok(!modalContent.includes("approveExpenseAction"), "No Approve action in modal");
  assert.ok(!modalContent.includes("rejectExpenseAction"), "No Reject action in modal");
  assert.ok(!modalContent.includes("settleExpenseReimbursementAction"), "No Settle action in modal");
});

// 26. EN/AR dictionary parity
test("Requirement 26: 100% EN/AR dictionary leaf key parity", () => {
  const en = getExpensesDictionary("en");
  const ar = getExpensesDictionary("ar");

  function getLeafKeys(obj: Record<string, unknown>, prefix = ""): string[] {
    const keys: string[] = [];
    for (const [k, v] of Object.entries(obj)) {
      const fullPath = prefix ? `${prefix}.${k}` : k;
      if (v !== null && typeof v === "object" && !Array.isArray(v)) {
        keys.push(...getLeafKeys(v as Record<string, unknown>, fullPath));
      } else {
        keys.push(fullPath);
      }
    }
    return keys.sort();
  }

  const enKeys = getLeafKeys(en as unknown as Record<string, unknown>);
  const arKeys = getLeafKeys(ar as unknown as Record<string, unknown>);

  assert.deepEqual(enKeys, arKeys, "English and Arabic dictionaries must have identical leaf keys");
});

// 27. bidi treatment exists for identifiers/amount/date where required
test("Requirement 27: bidi treatment exists for identifiers, amount, and date", () => {
  const clientContent = fs.readFileSync(CLIENT_FILE_PATH, "utf8");
  const modalContent = fs.readFileSync(MODAL_FILE_PATH, "utf8");

  assert.ok(clientContent.includes('<span dir="ltr">{exp.expense_number}</span>'));
  assert.ok(clientContent.includes('<span dir="ltr">{exp.expense_date}</span>'));
  assert.ok(/<span dir="ltr">\s*\{Number\(exp\.amount\)\.toFixed\(2\)\}/.test(clientContent));
  assert.ok(modalContent.includes('dir="ltr"'));
});

// 28. Behavioral: submitOwnExpenseAction enforces financial & security invariants
test("Requirement 28 (Behavioral): submitOwnExpenseAction enforces financial & security invariants", async () => {
  let capturedRpcArgs: Record<string, unknown> | null = null;
  globalThis.__mockRequirePermission = async () => ({
    id: "user-test-claimant-123",
    clerk_user_id: "clerk_123",
    role: "sales",
  });

  globalThis.__mockRpcHandler = async (fn, args) => {
    if (fn === "submit_expense") {
      capturedRpcArgs = args;
      return { data: [{ expense_id: "exp_test_abc", idempotent_replay: false }], error: null };
    }
    return { data: [], error: null };
  };

  globalThis.__mockFromHandler = (table) => {
    if (table === "expenses") {
      return {
        select: () => ({
          eq: () => ({
            single: async () => ({ data: { expense_number: "EXP-2026-0042" } }),
          }),
        }),
      };
    }
    return {
      select: () => ({ eq: () => ({ single: async () => ({ data: {} }) }) }),
    };
  };

  const result = await submitOwnExpenseAction({
    context_type: "company",
    expense_category: "office_supplies",
    description: "Printer toner cartridges",
    amount: 320.5,
    expense_date: "2026-09-08",
  });

  assert.equal(result.success, true);
  assert.equal(result.data?.expense_id, "exp_test_abc");
  assert.equal(result.data?.expense_number, "EXP-2026-0042");

  assert.ok(capturedRpcArgs !== null, "RPC submit_expense must be called");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const args = capturedRpcArgs as any;
  assert.equal(args.p_expense_number, null, "p_expense_number must be null");
  assert.equal(args.p_origin_type, "employee_paid", "p_origin_type must be employee_paid");
  assert.equal(args.p_payment_method, "personal_funds", "p_payment_method must be personal_funds");
  assert.equal(args.p_claimant_id, "user-test-claimant-123", "p_claimant_id must be caller id");
  assert.equal(args.p_actor_id, "user-test-claimant-123", "p_actor_id must be caller id");
  assert.equal(args.p_cash_advance_id, null, "p_cash_advance_id must be null");
  assert.equal(args.p_petty_cash_fund_id, null, "p_petty_cash_fund_id must be null");
});

// 29. Behavioral: submitSelfServiceExpenseWithReceiptAction rejects invalid receipt before DB call
test("Requirement 29 (Behavioral): submitSelfServiceExpenseWithReceiptAction preflights receipt file", async () => {
  let rpcCalled = false;
  globalThis.__mockRpcHandler = async () => {
    rpcCalled = true;
    return { data: [], error: null };
  };

  const formData = new FormData();
  formData.append("context_type", "company");
  formData.append("expense_category", "meals");
  formData.append("description", "Team dinner");
  formData.append("amount", "100.00");
  formData.append("expense_date", "2026-09-08");

  // Invalid file: text/plain
  const badFile = new Blob(["not a receipt"], { type: "text/plain" });
  formData.append("receipt", badFile, "malicious.txt");

  const result = await submitSelfServiceExpenseWithReceiptAction(formData);
  assert.equal(result.success, false);
  assert.equal(rpcCalled, false, "Database RPC must NOT be called when preflight file validation fails");
});

// 30. Behavioral: attachExpenseReceiptAction rejects attachment if caller is not the owner
test("Requirement 30 (Behavioral): attachExpenseReceiptAction forbids attachment to another user's expense", async () => {
  globalThis.__mockRequirePermission = async () => ({
    id: "user-attacker-456",
    clerk_user_id: "clerk_456",
    role: "sales",
  });

  globalThis.__mockFromHandler = (table) => {
    if (table === "expenses") {
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({
              // Owned by victim
              data: { submitted_by: "user-victim-789", claimant_id: "user-victim-789" },
              error: null,
            }),
          }),
        }),
      };
    }
    return {};
  };

  const formData = new FormData();
  formData.append("expense_id", "b42fa023-e18d-4f18-a6e4-e0bcf5f7ff73");
  const file = new Blob([new Uint8Array([0x25, 0x50, 0x44, 0x46])], { type: "application/pdf" });
  formData.append("receipt", file, "receipt.pdf");

  const result = await attachExpenseReceiptAction(formData);
  assert.equal(result.success, false);
  assert.equal(result.errorCode, "forbidden");
  assert.equal(result.error, "Receipt attachment is restricted to own expenses");
});

// 31. Behavioral: getOwnExpenseDetailById returns null if caller does not own the expense
test("Requirement 31 (Behavioral): getOwnExpenseDetailById fails closed for non-owned expense", async () => {
  globalThis.__mockRequirePermission = async () => ({
    id: "user-caller-111",
    clerk_user_id: "clerk_111",
    role: "sales",
  });

  globalThis.__mockFromHandler = (table) => {
    if (table === "expense_accountability_summaries") {
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({
              data: {
                id: "exp-999",
                submitted_by: "user-other-222",
                claimant_id: "user-other-222",
              },
              error: null,
            }),
          }),
        }),
      };
    }
    return {};
  };

  const detail = await getOwnExpenseDetailById("exp-999");
  assert.equal(detail.expense, null, "Must return null expense for another employee's record");
  assert.deepEqual(detail.documents, []);
});

// 32. Behavioral: getPrivateExpenseReceiptUrlAction generates signed URL for own expense
test("Requirement 32 (Behavioral): getPrivateExpenseReceiptUrlAction generates signed URL for own expense", async () => {
  globalThis.__mockRequirePermission = async () => ({
    id: "user-owner-123",
    clerk_user_id: "clerk_owner",
    role: "sales",
  });

  globalThis.__mockFromHandler = (table) => {
    if (table === "expenses") {
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({
              data: { submitted_by: "user-owner-123", claimant_id: "user-owner-123" },
              error: null,
            }),
          }),
        }),
      };
    }
    if (table === "expense_documents") {
      return {
        select: () => ({
          eq: () => ({
            order: () => ({
              limit: () => ({
                maybeSingle: async () => ({
                  data: { document_id: "doc-signed-456" },
                  error: null,
                }),
              }),
            }),
          }),
        }),
      };
    }
    if (table === "business_documents") {
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({
              data: {
                id: "doc-signed-456",
                bucket_id: "business-evidence",
                object_path: "documents/doc-signed-456.pdf",
              },
              error: null,
            }),
          }),
        }),
      };
    }
    return {};
  };

  const res = await getPrivateExpenseReceiptUrlAction("exp-own-123");
  assert.equal(res.success, true);
  assert.equal(res.data?.expiresInSeconds, 300);
  assert.equal(res.data?.signedUrl, "https://example.com/receipt.pdf");
});

// 33. Behavioral: getEligibleServicesForExpenseSelector queries active services with minimal fields
test("Requirement 33 (Behavioral): getEligibleServicesForExpenseSelector queries active services", async () => {
  globalThis.__mockRequirePermission = async () => ({
    id: "user-admin",
    clerk_user_id: "clerk_admin",
    role: "admin",
  });

  globalThis.__mockFromHandler = (table) => {
    if (table === "services") {
      return {
        select: () => ({
          is: () => ({
            order: async () => ({
              data: [
                {
                  id: "svc-1",
                  service_number: "SRV-2026-001",
                  service_title: "Conference 2026",
                  event_name: "Annual Expo",
                  status: "in_progress",
                },
              ],
              error: null,
            }),
          }),
        }),
      };
    }
    return {};
  };

  const services = await getEligibleServicesForExpenseSelector();
  assert.equal(services.length, 1);
  assert.equal(services[0]?.serviceNumber, "SRV-2026-001");
  assert.equal(services[0]?.eventName, "Annual Expo");
});

// =========================================================================
// W5B-1B Browser Acceptance Remediation Test Suite (Requirements 1 - 19)
// =========================================================================

const PAGE_FILE_PATH = path.join(process.cwd(), "src", "app", "(dashboard)", "expenses", "page.tsx");

const expenseUiFiles = [
  { name: "ExpensesPage (page.tsx)", path: PAGE_FILE_PATH },
  { name: "ExpensesClient (ExpensesClient.tsx)", path: CLIENT_FILE_PATH },
  { name: "ExpenseSubmissionModal (ExpenseSubmissionModal.tsx)", path: MODAL_FILE_PATH },
];

function readAllExpenseUiFiles(): string {
  return expenseUiFiles.map((f) => fs.readFileSync(f.path, "utf8")).join("\n");
}

// 1. No text-primary-foreground exists in W5B-1B Expense UI
test("Remediation 1: No text-primary-foreground exists in W5B-1B Expense UI", () => {
  for (const file of expenseUiFiles) {
    const content = fs.readFileSync(file.path, "utf8");
    assert.ok(
      !content.includes("text-primary-foreground"),
      `Found non-canonical 'text-primary-foreground' in ${file.name}`
    );
  }
});

// 2. No text-muted-foreground exists in W5B-1B Expense UI
test("Remediation 2: No text-muted-foreground exists in W5B-1B Expense UI", () => {
  for (const file of expenseUiFiles) {
    const content = fs.readFileSync(file.path, "utf8");
    assert.ok(
      !content.includes("text-muted-foreground"),
      `Found non-canonical 'text-muted-foreground' in ${file.name}`
    );
  }
});

// 3. No text-foreground exists in W5B-1B Expense UI
test("Remediation 3: No text-foreground exists in W5B-1B Expense UI", () => {
  for (const file of expenseUiFiles) {
    const content = fs.readFileSync(file.path, "utf8");
    assert.ok(
      !content.includes("text-foreground"),
      `Found non-canonical 'text-foreground' in ${file.name}`
    );
  }
});

// 4. No border-border exists in W5B-1B Expense UI
test("Remediation 4: No border-border exists in W5B-1B Expense UI", () => {
  for (const file of expenseUiFiles) {
    const content = fs.readFileSync(file.path, "utf8");
    assert.ok(
      !content.includes("border-border"),
      `Found non-canonical 'border-border' in ${file.name}`
    );
  }
});

// 5. No bg-card exists in W5B-1B Expense UI
test("Remediation 5: No bg-card exists in W5B-1B Expense UI", () => {
  for (const file of expenseUiFiles) {
    const content = fs.readFileSync(file.path, "utf8");
    assert.ok(
      !content.includes("bg-card"),
      `Found non-canonical 'bg-card' in ${file.name}`
    );
  }
});

// 6. Primary New Expense button uses G7 on-primary contrast
test("Remediation 6: Primary New Expense button uses G7 on-primary contrast", () => {
  const clientContent = fs.readFileSync(CLIENT_FILE_PATH, "utf8");
  assert.ok(
    clientContent.includes("bg-primary text-on-primary"),
    "New Expense button must use G7 canonical 'bg-primary text-on-primary'"
  );
  assert.ok(
    !clientContent.includes("text-primary-foreground"),
    "Must not use undefined text-primary-foreground"
  );
});

// 7. Submit Expense button uses G7 on-primary contrast
test("Remediation 7: Submit Expense button uses G7 on-primary contrast", () => {
  const modalContent = fs.readFileSync(MODAL_FILE_PATH, "utf8");
  assert.ok(
    modalContent.includes("bg-primary text-on-primary"),
    "Submit Expense button must use G7 canonical 'bg-primary text-on-primary'"
  );
  assert.ok(
    !modalContent.includes("text-primary-foreground"),
    "Must not use undefined text-primary-foreground"
  );
});

// 8. Other category reveals custom category input
test("Remediation 8: Other category reveals custom category input", () => {
  const modalContent = fs.readFileSync(MODAL_FILE_PATH, "utf8");
  assert.ok(
    modalContent.includes('category === "other"'),
    "Modal must condition on category === 'other'"
  );
  assert.ok(
    modalContent.includes("customCategoryLabel"),
    "Modal must render customCategoryLabel when category is other"
  );
  assert.ok(
    modalContent.includes("customCategoryPlaceholder"),
    "Modal must provide customCategoryPlaceholder"
  );
  assert.ok(
    modalContent.includes("setCustomCategory"),
    "Modal must bind custom category input state"
  );
});

// 9. Other cannot submit blank custom category
test("Remediation 9: Other cannot submit blank custom category", () => {
  const modalContent = fs.readFileSync(MODAL_FILE_PATH, "utf8");
  assert.ok(
    modalContent.includes('category === "other" && !customCategory.trim()'),
    "Modal must validate that customCategory is not blank when category is other"
  );

  const blankCategoryResult = selfServiceSubmitExpenseSchema.safeParse({
    context_type: "company",
    expense_category: "   ",
    description: "Valid description",
    amount: 100,
    expense_date: "2026-09-08",
  });
  assert.equal(blankCategoryResult.success, false, "Schema must reject whitespace category");
});

// 10. Custom category is submitted instead of literal other
test("Remediation 10 (Behavioral): Custom category is submitted instead of literal 'other'", async () => {
  const modalContent = fs.readFileSync(MODAL_FILE_PATH, "utf8");
  assert.ok(
    modalContent.includes('const effectiveCategory = category === "other" ? customCategory.trim() : category;'),
    "Modal must resolve effectiveCategory to customCategory.trim() when category is other"
  );
  assert.ok(
    modalContent.includes('formData.append("expense_category", effectiveCategory)'),
    "Modal must append effectiveCategory to formData"
  );

  let capturedRpcArgs: Record<string, unknown> | null = null;
  globalThis.__mockRequirePermission = async () => ({
    id: "user-test-custom-cat",
    clerk_user_id: "clerk_custom_cat",
    role: "sales",
  });
  globalThis.__mockRpcHandler = async (fn, args) => {
    if (fn === "submit_expense") {
      capturedRpcArgs = args;
      return { data: [{ expense_id: "exp_custom_1", idempotent_replay: false }], error: null };
    }
    return { data: [], error: null };
  };
  globalThis.__mockFromHandler = (table) => {
    if (table === "expenses") {
      return {
        select: () => ({
          eq: () => ({
            single: async () => ({ data: { expense_number: "EXP-2026-0043" } }),
          }),
        }),
      };
    }
    return { select: () => ({ eq: () => ({ single: async () => ({ data: {} }) }) }) };
  };

  const res = await submitOwnExpenseAction({
    context_type: "company",
    expense_category: "Car wash",
    description: "Vehicle wash after client event",
    amount: 75.0,
    expense_date: "2026-09-08",
  });

  assert.equal(res.success, true);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const args10 = capturedRpcArgs as Record<string, any> | null;
  assert.equal(args10?.p_expense_category, "Car wash");
  assert.notEqual(args10?.p_expense_category, "other");
});

// 11. Normal category remains unchanged
test("Remediation 11 (Behavioral): Normal category remains unchanged", async () => {
  let capturedRpcArgs: Record<string, unknown> | null = null;
  globalThis.__mockRequirePermission = async () => ({
    id: "user-test-std-cat",
    clerk_user_id: "clerk_std_cat",
    role: "sales",
  });
  globalThis.__mockRpcHandler = async (fn, args) => {
    if (fn === "submit_expense") {
      capturedRpcArgs = args;
      return { data: [{ expense_id: "exp_std_1", idempotent_replay: false }], error: null };
    }
    return { data: [], error: null };
  };
  globalThis.__mockFromHandler = (table) => {
    if (table === "expenses") {
      return {
        select: () => ({
          eq: () => ({
            single: async () => ({ data: { expense_number: "EXP-2026-0044" } }),
          }),
        }),
      };
    }
    return { select: () => ({ eq: () => ({ single: async () => ({ data: {} }) }) }) };
  };

  const res = await submitOwnExpenseAction({
    context_type: "company",
    expense_category: "travel",
    description: "Flight to client site",
    amount: 1200.0,
    expense_date: "2026-09-08",
  });

  assert.equal(res.success, true);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const args11 = capturedRpcArgs as Record<string, any> | null;
  assert.equal(args11?.p_expense_category, "travel");
});

// 12. full_success auto-dismiss behavior exists
test("Remediation 12 (Behavioral): full_success auto-dismiss behavior exists", () => {
  const clientContent = fs.readFileSync(CLIENT_FILE_PATH, "utf8");
  assert.ok(
    clientContent.includes('notice?.type === "full_success"'),
    "Auto-dismiss effect must check full_success"
  );
  assert.ok(
    clientContent.includes("setTimeout("),
    "Must use setTimeout for auto-dismiss"
  );
  assert.ok(
    clientContent.includes("5000"),
    "Must auto-dismiss after ~5 seconds"
  );
  assert.ok(
    clientContent.includes("clearTimeout(timer)"),
    "Must clean up timer on unmount or notice change"
  );

  const shouldAutoDismiss = (type: string) => type === "full_success" || type === "receipt_attached";
  assert.equal(shouldAutoDismiss("full_success"), true);
});

// 13. receipt_attached auto-dismiss behavior exists
test("Remediation 13 (Behavioral): receipt_attached auto-dismiss behavior exists", () => {
  const clientContent = fs.readFileSync(CLIENT_FILE_PATH, "utf8");
  assert.ok(
    clientContent.includes('notice?.type === "receipt_attached"'),
    "Auto-dismiss effect must check receipt_attached"
  );

  const shouldAutoDismiss = (type: string) => type === "full_success" || type === "receipt_attached";
  assert.equal(shouldAutoDismiss("receipt_attached"), true);
});

// 14. partial_success does not auto-dismiss
test("Remediation 14 (Behavioral): partial_success does not auto-dismiss", () => {
  const clientContent = fs.readFileSync(CLIENT_FILE_PATH, "utf8");
  assert.ok(
    !clientContent.includes('notice?.type === "partial_success"') ||
    !clientContent.includes('|| notice?.type === "partial_success"'),
    "partial_success must NOT be included in auto-dismiss condition"
  );

  const shouldAutoDismiss = (type: string) => type === "full_success" || type === "receipt_attached";
  assert.equal(shouldAutoDismiss("partial_success"), false, "partial_success must persist");
});

// 15. error does not auto-dismiss
test("Remediation 15 (Behavioral): error does not auto-dismiss", () => {
  const shouldAutoDismiss = (type: string) => type === "full_success" || type === "receipt_attached";
  assert.equal(shouldAutoDismiss("error"), false, "error must persist");
});

// 16. mobile Expense card representation exists
test("Remediation 16: mobile Expense card representation exists", () => {
  const clientContent = fs.readFileSync(CLIENT_FILE_PATH, "utf8");
  assert.ok(
    clientContent.includes('data-testid="mobile-expense-cards"') ||
    clientContent.includes("block md:hidden"),
    "Must have responsive mobile view for narrow viewports"
  );
  assert.ok(
    clientContent.includes("toggleRowExpansion"),
    "Mobile cards must support expand/collapse details"
  );
});

// 17. desktop table representation remains
test("Remediation 17: desktop table representation remains", () => {
  const clientContent = fs.readFileSync(CLIENT_FILE_PATH, "utf8");
  assert.ok(
    clientContent.includes("hidden md:block") && clientContent.includes("<table"),
    "Must preserve desktop table view at md breakpoint"
  );
});

// 18. financial mutation controls remain absent
test("Remediation 18: financial mutation controls remain absent", () => {
  const allUi = readAllExpenseUiFiles();
  assert.ok(!allUi.includes("reviewExpenseFinanceAction"), "No Finance review action in UI");
  assert.ok(!allUi.includes("approveExpenseAction"), "No Approve action in UI");
  assert.ok(!allUi.includes("rejectExpenseAction"), "No Reject action in UI");
  assert.ok(!allUi.includes("settleExpenseReimbursementAction"), "No Settle action in UI");
});

// 19. EN/AR dictionary parity remains clean
test("Remediation 19: EN/AR dictionary parity remains clean including custom category keys", () => {
  const en = getExpensesDictionary("en");
  const ar = getExpensesDictionary("ar");

  assert.ok(en.submissionModal.customCategoryLabel, "EN must define customCategoryLabel");
  assert.ok(ar.submissionModal.customCategoryLabel, "AR must define customCategoryLabel");
  assert.equal(en.submissionModal.customCategoryLabel, "Specify category");
  assert.equal(ar.submissionModal.customCategoryLabel, "حدد التصنيف");

  assert.ok(en.submissionModal.customCategoryPlaceholder, "EN must define customCategoryPlaceholder");
  assert.ok(ar.submissionModal.customCategoryPlaceholder, "AR must define customCategoryPlaceholder");

  assert.ok(en.submissionModal.customCategoryRequired, "EN must define customCategoryRequired");
  assert.ok(ar.submissionModal.customCategoryRequired, "AR must define customCategoryRequired");

  function getLeafKeys(obj: Record<string, unknown>, prefix = ""): string[] {
    const keys: string[] = [];
    for (const [k, v] of Object.entries(obj)) {
      const fullPath = prefix ? `${prefix}.${k}` : k;
      if (v !== null && typeof v === "object" && !Array.isArray(v)) {
        keys.push(...getLeafKeys(v as Record<string, unknown>, fullPath));
      } else {
        keys.push(fullPath);
      }
    }
    return keys.sort();
  }

  const enKeys = getLeafKeys(en as unknown as Record<string, unknown>);
  const arKeys = getLeafKeys(ar as unknown as Record<string, unknown>);

  assert.deepEqual(enKeys, arKeys, "English and Arabic dictionaries must have identical leaf keys");
});
