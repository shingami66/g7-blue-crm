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

    if (specifier === "@/lib/supabase/admin") {
      return {
        shortCircuit: true,
        url: "data:text/javascript,export const createAdminClient = () => ({ rpc: async () => ({ data: [], error: null }) });",
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
  submitExpenseSchema,
  rejectExpenseSchema,
  cancelExpenseSchema,
  recordEvidenceExceptionSchema,
  disposeEvidenceExceptionSchema,
  recordPettyCashTransactionSchema,
} = await import("./schemas.ts");

const { updateExpenseAction } = await import("./actions.ts");

const ACTIONS_FILE = path.join(process.cwd(), "src", "lib", "expenses", "actions.ts");
const QUERIES_FILE = path.join(process.cwd(), "src", "lib", "expenses", "queries.ts");

const VALID_UUID_1 = "11111111-1111-4111-8111-111111111111";
const VALID_UUID_2 = "22222222-2222-4222-8222-222222222222";
const VALID_UUID_3 = "33333333-3333-4333-8333-333333333333";
const VALID_UUID_4 = "44444444-4444-4444-8444-444444444444";
const VALID_UUID_5 = "55555555-5555-4555-8555-555555555555";

test("W5A Module Boundary: actions.ts and queries.ts enforce server-only boundary", () => {
  const actionsContent = fs.readFileSync(ACTIONS_FILE, "utf8");
  const queriesContent = fs.readFileSync(QUERIES_FILE, "utf8");

  assert.ok(
    actionsContent.includes('import "server-only";'),
    "actions.ts must declare import 'server-only'",
  );
  assert.ok(
    queriesContent.includes('import "server-only";'),
    "queries.ts must declare import 'server-only'",
  );
});

test("W5A Validation: Context rules on expense submission", () => {
  const base = {
    expense_number: "EXP-20260907-001",
    expense_category: "Office Supplies",
    description: "Paper and ink",
    amount: 150.0,
    expense_date: "2026-09-07",
    origin_type: "company_direct" as const,
    payment_method: "company_funds" as const,
    request_id: VALID_UUID_1,
  };

  // Valid Company Context
  const validCompany = submitExpenseSchema.safeParse({
    ...base,
    context_type: "company",
  });
  assert.ok(validCompany.success, "Company context without service_id must succeed");

  // Invalid Company Context with service_id
  const invalidCompany = submitExpenseSchema.safeParse({
    ...base,
    context_type: "company",
    service_id: VALID_UUID_2,
  });
  assert.equal(invalidCompany.success, false);
  assert.ok(
    invalidCompany.error.issues.some((i) =>
      i.message.includes("must not specify a service_id"),
    ),
  );

  // Valid Event Context with service_id
  const validEvent = submitExpenseSchema.safeParse({
    ...base,
    context_type: "event",
    service_id: VALID_UUID_2,
  });
  assert.ok(validEvent.success, "Event context with service_id must succeed");

  // Invalid Event Context without service_id
  const invalidEvent = submitExpenseSchema.safeParse({
    ...base,
    context_type: "event",
  });
  assert.equal(invalidEvent.success, false);
  assert.ok(
    invalidEvent.error.issues.some((i) =>
      i.message.includes("must specify a service_id"),
    ),
  );
});

test("W5A Validation: Origin claimant rules on expense submission", () => {
  const base = {
    expense_number: "EXP-20260907-002",
    context_type: "company" as const,
    expense_category: "Travel",
    description: "Taxi ride",
    amount: 45.0,
    expense_date: "2026-09-07",
    request_id: VALID_UUID_1,
  };

  // Invalid: company_direct with claimant
  const invalidCompanyDirect = submitExpenseSchema.safeParse({
    ...base,
    origin_type: "company_direct",
    payment_method: "company_funds",
    claimant_id: VALID_UUID_3,
  });
  assert.equal(invalidCompanyDirect.success, false);
  assert.ok(
    invalidCompanyDirect.error.issues.some((i) =>
      i.message.includes("must not have a claimant_id"),
    ),
  );

  // Invalid: employee_paid without claimant
  const invalidEmployeePaid = submitExpenseSchema.safeParse({
    ...base,
    origin_type: "employee_paid",
    payment_method: "personal_funds",
  });
  assert.equal(invalidEmployeePaid.success, false);
  assert.ok(
    invalidEmployeePaid.error.issues.some((i) =>
      i.message.includes("must specify a claimant_id"),
    ),
  );

  // Valid: employee_paid with claimant
  const validEmployeePaid = submitExpenseSchema.safeParse({
    ...base,
    origin_type: "employee_paid",
    payment_method: "personal_funds",
    claimant_id: VALID_UUID_3,
  });
  assert.ok(validEmployeePaid.success);
});

test("W5A Validation: Funding-path exclusivity on expense submission", () => {
  const base = {
    expense_number: "EXP-20260907-003",
    context_type: "company" as const,
    expense_category: "Catering",
    description: "Team lunch",
    amount: 250.0,
    expense_date: "2026-09-07",
    request_id: VALID_UUID_1,
  };

  // Employee paid with company funds -> fails
  const empCompanyFunds = submitExpenseSchema.safeParse({
    ...base,
    origin_type: "employee_paid",
    claimant_id: VALID_UUID_3,
    payment_method: "company_funds",
  });
  assert.equal(empCompanyFunds.success, false);

  // Employee paid with cash advance linkage -> fails
  const empAdvance = submitExpenseSchema.safeParse({
    ...base,
    origin_type: "employee_paid",
    claimant_id: VALID_UUID_3,
    payment_method: "personal_funds",
    cash_advance_id: VALID_UUID_4,
  });
  assert.equal(empAdvance.success, false);

  // Company direct with personal funds -> fails
  const compPersonal = submitExpenseSchema.safeParse({
    ...base,
    origin_type: "company_direct",
    payment_method: "personal_funds",
  });
  assert.equal(compPersonal.success, false);

  // Company direct with cash_advance requires cash_advance_id
  const compAdvMissing = submitExpenseSchema.safeParse({
    ...base,
    origin_type: "company_direct",
    payment_method: "cash_advance",
  });
  assert.equal(compAdvMissing.success, false);

  // Company direct with cash_advance and valid id -> passes
  const compAdvValid = submitExpenseSchema.safeParse({
    ...base,
    origin_type: "company_direct",
    payment_method: "cash_advance",
    cash_advance_id: VALID_UUID_4,
  });
  assert.ok(compAdvValid.success);

  // Company direct with petty_cash and valid fund id -> passes
  const compPettyValid = submitExpenseSchema.safeParse({
    ...base,
    origin_type: "company_direct",
    payment_method: "petty_cash",
    petty_cash_fund_id: VALID_UUID_5,
  });
  assert.ok(compPettyValid.success);
});

test("W5A Validation: Rejection and cancellation reasons require minimum length", () => {
  const rejectBad = rejectExpenseSchema.safeParse({
    expense_id: VALID_UUID_1,
    rejection_reason: "no",
    request_id: VALID_UUID_2,
  });
  assert.equal(rejectBad.success, false);
  assert.ok(
    rejectBad.error.issues.some((i) => i.message.includes("at least 5 characters")),
  );

  const cancelBad = cancelExpenseSchema.safeParse({
    expense_id: VALID_UUID_1,
    cancellation_reason: "bad",
    request_id: VALID_UUID_2,
  });
  assert.equal(cancelBad.success, false);
  assert.ok(
    cancelBad.error.issues.some((i) => i.message.includes("at least 5 characters")),
  );

  const cancelGood = cancelExpenseSchema.safeParse({
    expense_id: VALID_UUID_1,
    cancellation_reason: "Duplicate submission by error",
    request_id: VALID_UUID_2,
  });
  assert.ok(cancelGood.success);
});

test("W5A Validation: Evidence exception invariants", () => {
  const tooShort = recordEvidenceExceptionSchema.safeParse({
    expense_id: VALID_UUID_1,
    reason: "Lost it",
    accountable_owner_id: VALID_UUID_3,
    review_before: "2026-10-01",
    request_id: VALID_UUID_2,
  });
  assert.equal(tooShort.success, false);
  assert.ok(
    tooShort.error.issues.some((i) => i.message.includes("at least 10 characters")),
  );

  const validException = recordEvidenceExceptionSchema.safeParse({
    expense_id: VALID_UUID_1,
    reason: "Original tax invoice lost in transit; duplicate requested from supplier",
    accountable_owner_id: VALID_UUID_3,
    review_before: "2026-10-01",
    request_id: VALID_UUID_2,
  });
  assert.ok(validException.success);

  const validDisposition = disposeEvidenceExceptionSchema.safeParse({
    exception_id: VALID_UUID_4,
    disposition: "accepted",
    disposition_notes: "Approved by finance director after audit verification",
    request_id: VALID_UUID_2,
  });
  assert.ok(validDisposition.success);
});

test("W5A Validation: Petty cash transaction expense linkage rules", () => {
  // Non-disbursement linking to expense must fail
  const invalidReplenishment = recordPettyCashTransactionSchema.safeParse({
    fund_id: VALID_UUID_5,
    transaction_type: "replenishment",
    amount: 500.0,
    expense_id: VALID_UUID_1,
    request_id: VALID_UUID_2,
  });
  assert.equal(invalidReplenishment.success, false);
  assert.ok(
    invalidReplenishment.error.issues.some((i) =>
      i.message.includes("Only disbursements may be linked to an expense"),
    ),
  );

  // Disbursement linking to expense is valid
  const validDisbursement = recordPettyCashTransactionSchema.safeParse({
    fund_id: VALID_UUID_5,
    transaction_type: "disbursement",
    amount: 75.0,
    expense_id: VALID_UUID_1,
    request_id: VALID_UUID_2,
  });
  assert.ok(validDisbursement.success);
});

test("W5A Governance: Post-authoritative direct mutation fails closed (Option B)", async () => {
  const result = await updateExpenseAction();
  assert.equal(result.success, false);
  assert.equal(result.errorCode, "post_authoritative_mutation_forbidden");
  assert.ok((result.error ?? "").includes("fail closed in W5A"));
});
