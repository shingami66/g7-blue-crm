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
  ROLE_PERMISSIONS,
  CASH_ADVANCE_PERMISSIONS,
  EXPENSE_PERMISSIONS,
  hasPermissionForRole,
} = await import("../auth/role-permissions.ts");
const {
  navigationDictionaryEn,
  navigationDictionaryAr,
} = await import("../i18n/dictionaries/navigation.ts");
const {
  cashAdvancesDictionaryEn,
  cashAdvancesDictionaryAr,
  getCashAdvancesDictionary,
  getCashAdvanceStatusLabel,
  getCashAdvanceContextTypeLabel,
} = await import("../i18n/dictionaries/cash-advances.ts");
const { requestOwnCashAdvanceSchema } = await import("./schemas.ts");

// ============================================================================
// AUTHORITY (Tests 1 - 8)
// ============================================================================

test("1. Authority: Viewer cannot access workspace", () => {
  const readOwn = hasPermissionForRole("viewer", CASH_ADVANCE_PERMISSIONS.readOwn);
  const readBroad = hasPermissionForRole("viewer", CASH_ADVANCE_PERMISSIONS.read);
  const submitOwn = hasPermissionForRole("viewer", CASH_ADVANCE_PERMISSIONS.submitOwn);

  assert.equal(readOwn, false, "Viewer must not have cash_advances:readOwn");
  assert.equal(readBroad, false, "Viewer must not have cash_advances:read");
  assert.equal(submitOwn, false, "Viewer must not have cash_advances:submitOwn");
});

test("2. Authority: Sales can read own and submit own", () => {
  assert.equal(hasPermissionForRole("sales", CASH_ADVANCE_PERMISSIONS.readOwn), true);
  assert.equal(hasPermissionForRole("sales", CASH_ADVANCE_PERMISSIONS.submitOwn), true);
  assert.equal(hasPermissionForRole("sales", CASH_ADVANCE_PERMISSIONS.read), false);
});

test("3. Authority: Operations can read own and submit own", () => {
  assert.equal(hasPermissionForRole("operations", CASH_ADVANCE_PERMISSIONS.readOwn), true);
  assert.equal(hasPermissionForRole("operations", CASH_ADVANCE_PERMISSIONS.submitOwn), true);
  assert.equal(hasPermissionForRole("operations", CASH_ADVANCE_PERMISSIONS.read), false);
});

test("4. Authority: Manager can read own and broad", () => {
  assert.equal(hasPermissionForRole("manager", CASH_ADVANCE_PERMISSIONS.readOwn), true);
  assert.equal(hasPermissionForRole("manager", CASH_ADVANCE_PERMISSIONS.submitOwn), true);
  assert.equal(hasPermissionForRole("manager", CASH_ADVANCE_PERMISSIONS.read), true);
  assert.equal(hasPermissionForRole("manager", CASH_ADVANCE_PERMISSIONS.approve), true);
  assert.equal(hasPermissionForRole("manager", CASH_ADVANCE_PERMISSIONS.issue), false);
  assert.equal(hasPermissionForRole("manager", CASH_ADVANCE_PERMISSIONS.settle), false);
});

test("5. Authority: Accountant can read own and broad", () => {
  assert.equal(hasPermissionForRole("accountant", CASH_ADVANCE_PERMISSIONS.readOwn), true);
  assert.equal(hasPermissionForRole("accountant", CASH_ADVANCE_PERMISSIONS.submitOwn), true);
  assert.equal(hasPermissionForRole("accountant", CASH_ADVANCE_PERMISSIONS.read), true);
  assert.equal(hasPermissionForRole("accountant", CASH_ADVANCE_PERMISSIONS.issue), true);
  assert.equal(hasPermissionForRole("accountant", CASH_ADVANCE_PERMISSIONS.settle), true);
  assert.equal(hasPermissionForRole("accountant", CASH_ADVANCE_PERMISSIONS.approve), false);
});

test("6. Authority: Sales cannot activate broad query", () => {
  assert.equal(hasPermissionForRole("sales", CASH_ADVANCE_PERMISSIONS.read), false);
});

test("7. Authority: Operations cannot activate broad query", () => {
  assert.equal(hasPermissionForRole("operations", CASH_ADVANCE_PERMISSIONS.read), false);
});

test("8. Authority: own detail query enforces recipient_id isolation", () => {
  const queriesSource = fs.readFileSync(
    path.join(process.cwd(), "src/lib/expenses/queries.ts"),
    "utf8",
  );
  assert.ok(
    queriesSource.includes(".eq(\"recipient_id\", user.id)"),
    "getOwnCashAdvanceDetailById must force recipient_id = user.id",
  );
});

// ============================================================================
// REQUEST FORM UX & CONTRACT (Tests 9 - 19)
// ============================================================================

test("9. Request: submit button / action requires submitOwn permission", () => {
  const advancesClientSource = fs.readFileSync(
    path.join(process.cwd(), "src/app/(dashboard)/advances/AdvancesClient.tsx"),
    "utf8",
  );
  assert.ok(
    advancesClientSource.includes("canSubmitOwn &&"),
    "Request Cash Advance button must be guarded by canSubmitOwn",
  );
});

test("10. Request: form has no recipient field", () => {
  const modalSource = fs.readFileSync(
    path.join(process.cwd(), "src/app/(dashboard)/advances/CashAdvanceRequestModal.tsx"),
    "utf8",
  );
  assert.equal(
    modalSource.includes('name="recipient"'),
    false,
    "Request form must not contain a recipient input",
  );
  assert.equal(
    modalSource.includes("recipient_id"),
    false,
    "Request form must not contain recipient_id input",
  );
});

test("11. Request: form has no advance-number field", () => {
  const modalSource = fs.readFileSync(
    path.join(process.cwd(), "src/app/(dashboard)/advances/CashAdvanceRequestModal.tsx"),
    "utf8",
  );
  assert.equal(
    modalSource.includes('name="advance_number"'),
    false,
    "Request form must not contain an advance_number input",
  );
  assert.equal(
    modalSource.includes("advance_number:"),
    false,
    "Request form must not send advance_number",
  );
});

test("12. Request: form has no actor field", () => {
  const modalSource = fs.readFileSync(
    path.join(process.cwd(), "src/app/(dashboard)/advances/CashAdvanceRequestModal.tsx"),
    "utf8",
  );
  assert.equal(
    modalSource.includes("actor_id"),
    false,
    "Request form must not send actor_id",
  );
  assert.equal(
    modalSource.includes("actor_role"),
    false,
    "Request form must not send actor_role",
  );
});

test("13. Request: uses amount_issued strictly positive", () => {
  const invalidZero = requestOwnCashAdvanceSchema.safeParse({
    context_type: "company",
    purpose: "Operational expenses for branch",
    amount_issued: 0,
    request_id: "00000000-0000-4000-8000-000000000001",
  });
  assert.equal(invalidZero.success, false);

  const invalidNegative = requestOwnCashAdvanceSchema.safeParse({
    context_type: "company",
    purpose: "Operational expenses for branch",
    amount_issued: -50,
    request_id: "00000000-0000-4000-8000-000000000001",
  });
  assert.equal(invalidNegative.success, false);

  const valid = requestOwnCashAdvanceSchema.safeParse({
    context_type: "company",
    purpose: "Operational expenses for branch",
    amount_issued: 1500.5,
    request_id: "00000000-0000-4000-8000-000000000001",
  });
  assert.equal(valid.success, true);
});

test("14. Request: company context sends null service_id", () => {
  const invalidWithService = requestOwnCashAdvanceSchema.safeParse({
    context_type: "company",
    service_id: "00000000-0000-4000-8000-000000000002",
    purpose: "Company general operations",
    amount_issued: 1000,
    request_id: "00000000-0000-4000-8000-000000000001",
  });
  assert.equal(invalidWithService.success, false);

  const validNullService = requestOwnCashAdvanceSchema.safeParse({
    context_type: "company",
    service_id: null,
    purpose: "Company general operations",
    amount_issued: 1000,
    request_id: "00000000-0000-4000-8000-000000000001",
  });
  assert.equal(validNullService.success, true);
});

test("15. Request: event context requires service_id", () => {
  const invalidWithoutService = requestOwnCashAdvanceSchema.safeParse({
    context_type: "event",
    service_id: null,
    purpose: "Event production expenses",
    amount_issued: 2500,
    request_id: "00000000-0000-4000-8000-000000000001",
  });
  assert.equal(invalidWithoutService.success, false);

  const validWithService = requestOwnCashAdvanceSchema.safeParse({
    context_type: "event",
    service_id: "00000000-0000-4000-8000-000000000002",
    purpose: "Event production expenses",
    amount_issued: 2500,
    request_id: "00000000-0000-4000-8000-000000000001",
  });
  assert.equal(validWithService.success, true);
});

test("16. Request: UUID request_id generated by UI/runtime", () => {
  const modalSource = fs.readFileSync(
    path.join(process.cwd(), "src/app/(dashboard)/advances/CashAdvanceRequestModal.tsx"),
    "utf8",
  );
  assert.ok(
    modalSource.includes("crypto.randomUUID()"),
    "Modal must generate a UUID request_id via crypto.randomUUID()",
  );
  assert.equal(
    modalSource.includes("00000000-0000-4000-8000-000000000000"),
    false,
    "Modal must not contain constant zero UUID fallback",
  );
});

test("17. Request: action invoked is requestOwnCashAdvanceAction", () => {
  const modalSource = fs.readFileSync(
    path.join(process.cwd(), "src/app/(dashboard)/advances/CashAdvanceRequestModal.tsx"),
    "utf8",
  );
  assert.ok(
    modalSource.includes("requestOwnCashAdvanceAction"),
    "Modal must invoke requestOwnCashAdvanceAction",
  );
});

test("18. Request: success triggers router.refresh() for authoritative data", () => {
  const modalSource = fs.readFileSync(
    path.join(process.cwd(), "src/app/(dashboard)/advances/CashAdvanceRequestModal.tsx"),
    "utf8",
  );
  assert.ok(
    modalSource.includes("router.refresh()"),
    "Modal must call router.refresh() on success",
  );
});

test("19. Request: no client ADV number prediction or synthesis", () => {
  const modalSource = fs.readFileSync(
    path.join(process.cwd(), "src/app/(dashboard)/advances/CashAdvanceRequestModal.tsx"),
    "utf8",
  );
  assert.equal(
    modalSource.includes('"ADV-"'),
    false,
    "Modal must not synthesize ADV- prefixed numbers client-side",
  );
  assert.equal(
    modalSource.includes("`ADV-"),
    false,
    "Modal must not template ADV- prefixed numbers client-side",
  );
});

// ============================================================================
// LIST WORKSPACE (Tests 20 - 25)
// ============================================================================

test("20. List: mobile cards exist for narrow viewports", () => {
  const clientSource = fs.readFileSync(
    path.join(process.cwd(), "src/app/(dashboard)/advances/AdvancesClient.tsx"),
    "utf8",
  );
  assert.ok(
    clientSource.includes("md:hidden"),
    "AdvancesClient must provide a dedicated mobile layout",
  );
});

test("21. List: desktop table exists for wider viewports", () => {
  const clientSource = fs.readFileSync(
    path.join(process.cwd(), "src/app/(dashboard)/advances/AdvancesClient.tsx"),
    "utf8",
  );
  assert.ok(
    clientSource.includes("hidden md:block"),
    "AdvancesClient must provide a dedicated desktop table",
  );
  assert.ok(clientSource.includes("<table"), "Must render table element on desktop");
});

test("22. List: issued, spent, returned, remaining are present", () => {
  const clientSource = fs.readFileSync(
    path.join(process.cwd(), "src/app/(dashboard)/advances/AdvancesClient.tsx"),
    "utf8",
  );
  assert.ok(clientSource.includes("adv.amount_issued"), "Must render amount_issued");
  assert.ok(
    clientSource.includes("adv.amount_spent_settled"),
    "Must render amount_spent_settled",
  );
  assert.ok(clientSource.includes("adv.amount_returned"), "Must render amount_returned");
  assert.ok(
    clientSource.includes("adv.remaining_balance"),
    "Must render remaining_balance",
  );
});

test("23. List: ADV identifier is LTR-safe", () => {
  const clientSource = fs.readFileSync(
    path.join(process.cwd(), "src/app/(dashboard)/advances/AdvancesClient.tsx"),
    "utf8",
  );
  assert.ok(
    clientSource.includes('dir="ltr"') && clientSource.includes("adv.advance_number"),
    "Advance number must be wrapped in dir=\"ltr\"",
  );
});

test("24. List: SAR financial values are LTR/tabular-safe", () => {
  const clientSource = fs.readFileSync(
    path.join(process.cwd(), "src/app/(dashboard)/advances/AdvancesClient.tsx"),
    "utf8",
  );
  assert.ok(
    clientSource.includes("font-mono") && clientSource.includes('dir="ltr"'),
    "Financial amounts must use font-mono and dir=\"ltr\"",
  );
});

test("25. List: status filter works without authority widening", () => {
  const clientSource = fs.readFileSync(
    path.join(process.cwd(), "src/app/(dashboard)/advances/AdvancesClient.tsx"),
    "utf8",
  );
  assert.ok(clientSource.includes("statusFilter"), "Must maintain statusFilter state");
  assert.ok(
    clientSource.includes('item.status === statusFilter'),
    "Must filter by status correctly",
  );
});

// ============================================================================
// DETAIL WORKSPACE (Tests 26 - 31)
// ============================================================================

test("26. Detail: own route uses own query where no broad read", () => {
  const pageSource = fs.readFileSync(
    path.join(process.cwd(), "src/app/(dashboard)/advances/[id]/page.tsx"),
    "utf8",
  );
  assert.ok(
    pageSource.includes("getOwnCashAdvanceDetailById(id)"),
    "Must invoke getOwnCashAdvanceDetailById when canReadBroad is false",
  );
});

test("27. Detail: broad role may use broad detail", () => {
  const pageSource = fs.readFileSync(
    path.join(process.cwd(), "src/app/(dashboard)/advances/[id]/page.tsx"),
    "utf8",
  );
  assert.ok(
    pageSource.includes("getCashAdvanceDetailById(id)"),
    "Must invoke getCashAdvanceDetailById when canReadBroad is true",
  );
});

test("28. Detail: accountability totals displayed from authoritative fields", () => {
  const detailClientSource = fs.readFileSync(
    path.join(
      process.cwd(),
      "src/app/(dashboard)/advances/[id]/AdvanceDetailClient.tsx",
    ),
    "utf8",
  );
  assert.ok(
    detailClientSource.includes("advance.amount_issued"),
    "Must display authoritative amount_issued",
  );
  assert.ok(
    detailClientSource.includes("advance.amount_spent_settled"),
    "Must display authoritative amount_spent_settled",
  );
  assert.ok(
    detailClientSource.includes("advance.amount_returned"),
    "Must display authoritative amount_returned",
  );
  assert.ok(
    detailClientSource.includes("advance.remaining_balance"),
    "Must display authoritative remaining_balance",
  );
});

test("29. Detail: allocation history is read-only", () => {
  const detailClientSource = fs.readFileSync(
    path.join(
      process.cwd(),
      "src/app/(dashboard)/advances/[id]/AdvanceDetailClient.tsx",
    ),
    "utf8",
  );
  assert.ok(
    detailClientSource.includes("allocations.map"),
    "Must render allocations list",
  );
  assert.equal(
    detailClientSource.includes("deleteAllocation") ||
      detailClientSource.includes("removeAllocation"),
    false,
    "Must not have mutation controls for allocations",
  );
});

test("30. Detail: return history is read-only", () => {
  const detailClientSource = fs.readFileSync(
    path.join(
      process.cwd(),
      "src/app/(dashboard)/advances/[id]/AdvanceDetailClient.tsx",
    ),
    "utf8",
  );
  assert.ok(
    detailClientSource.includes("returns.map"),
    "Must render returns list",
  );
  assert.equal(
    detailClientSource.includes("recordReturn") ||
      detailClientSource.includes("addReturn"),
    false,
    "Must not have return mutation controls",
  );
});

test("31. Detail: zero operational mutation buttons present in W5B-2B", () => {
  const detailClientSource = fs.readFileSync(
    path.join(
      process.cwd(),
      "src/app/(dashboard)/advances/[id]/AdvanceDetailClient.tsx",
    ),
    "utf8",
  );
  // Verify no action buttons for Approve, Reject, Issue, Cancel, Settle, or Return
  assert.equal(
    detailClientSource.includes("approveCashAdvanceAction"),
    false,
    "Must not invoke approveCashAdvanceAction",
  );
  assert.equal(
    detailClientSource.includes("rejectCashAdvanceAction"),
    false,
    "Must not invoke rejectCashAdvanceAction",
  );
  assert.equal(
    detailClientSource.includes("issueCashAdvanceAction"),
    false,
    "Must not invoke issueCashAdvanceAction",
  );
  assert.equal(
    detailClientSource.includes("cancelCashAdvanceAction"),
    false,
    "Must not invoke cancelCashAdvanceAction",
  );
  assert.equal(
    detailClientSource.includes("settleCashAdvanceAction"),
    false,
    "Must not invoke settleCashAdvanceAction",
  );
  assert.equal(
    detailClientSource.includes("recordCashAdvanceReturnAction"),
    false,
    "Must not invoke recordCashAdvanceReturnAction",
  );
});

// ============================================================================
// NAVIGATION & DISCOVERABILITY (Tests 32 - 36)
// ============================================================================

test("32. Navigation: redundant Expenses -> Advances header cross-link is removed", () => {
  const expensesClientSource = fs.readFileSync(
    path.join(process.cwd(), "src/app/(dashboard)/expenses/ExpensesClient.tsx"),
    "utf8",
  );
  assert.equal(
    expensesClientSource.includes('href="/advances"'),
    false,
    "ExpensesClient must not contain redundant cross-link to /advances",
  );
  assert.equal(
    expensesClientSource.includes("PendingLink"),
    false,
    "ExpensesClient no longer requires PendingLink after cross-link removal",
  );
});

test("33. Navigation: Cash Advances label exists in EN dictionary", () => {
  assert.equal(navigationDictionaryEn.modules.advances, "Cash Advances");
  assert.equal(cashAdvancesDictionaryEn.header.title, "Cash Advances");
  assert.equal(getCashAdvanceStatusLabel("en", "submitted"), "Awaiting approval");
  assert.equal(getCashAdvanceContextTypeLabel("en", "company"), "Company");
});

test("34. Navigation: Cash Advances label exists in AR dictionary", () => {
  assert.equal(navigationDictionaryAr.modules.advances, "العهد النقدية");
  assert.equal(cashAdvancesDictionaryAr.header.title, "العهد النقدية");
  assert.equal(getCashAdvancesDictionary("ar").locale, "ar");
  assert.equal(getCashAdvanceStatusLabel("ar", "submitted"), "بانتظار الموافقة");
  assert.equal(getCashAdvanceContextTypeLabel("ar", "company"), "عام للشركة");
});

test("35. Navigation: PendingLink semantics preserved across workspace", () => {
  const advancesClientSource = fs.readFileSync(
    path.join(process.cwd(), "src/app/(dashboard)/advances/AdvancesClient.tsx"),
    "utf8",
  );
  const detailClientSource = fs.readFileSync(
    path.join(
      process.cwd(),
      "src/app/(dashboard)/advances/[id]/AdvanceDetailClient.tsx",
    ),
    "utf8",
  );

  assert.ok(
    advancesClientSource.includes("<PendingLink"),
    "AdvancesClient must use PendingLink for navigation",
  );
  assert.ok(
    detailClientSource.includes("<PendingLink"),
    "AdvanceDetailClient must use PendingLink for back navigation",
  );
});

test("36. Navigation: Petty Cash navigation remains absent", () => {
  const navKeys = Object.keys(navigationDictionaryEn.modules);
  assert.equal(
    navKeys.includes("pettyCash"),
    false,
    "pettyCash must not be in active navigation dictionary modules",
  );
});

// ============================================================================
// REGRESSION & COMPATIBILITY (Tests 37 - 44)
// ============================================================================

test("37. Regression: /expenses route remains functional with force-dynamic", () => {
  const expensesPageSource = fs.readFileSync(
    path.join(process.cwd(), "src/app/(dashboard)/expenses/page.tsx"),
    "utf8",
  );
  assert.ok(
    expensesPageSource.includes('export const dynamic = "force-dynamic"'),
    "expenses page must remain force-dynamic",
  );
});

test("38. Regression: ExpenseSubmissionModal semantics unchanged", () => {
  const modalSource = fs.readFileSync(
    path.join(process.cwd(), "src/app/(dashboard)/expenses/ExpenseSubmissionModal.tsx"),
    "utf8",
  );
  assert.ok(
    modalSource.includes("submitSelfServiceExpenseWithReceiptAction"),
    "Expense submission must continue using submitSelfServiceExpenseWithReceiptAction",
  );
});

test("39. Regression: No database migration added in W5B-2B", () => {
  const migrationsDir = path.join(process.cwd(), "supabase/migrations");
  const files = fs.readdirSync(migrationsDir);
  // Verify that the newest migration in migrations folder is still 20260909100000_w5b2_cash_advance_numbering_and_integrity.sql
  const migrationFiles = files.filter((f) => f.endsWith(".sql")).sort();
  const lastMigration = migrationFiles[migrationFiles.length - 1];
  assert.equal(
    lastMigration,
    "20260909100000_w5b2_cash_advance_numbering_and_integrity.sql",
    "No new database migration must be added in W5B-2B",
  );
});

test("40. Regression: Cash Advance lifecycle permissions unchanged", () => {
  assert.deepEqual(CASH_ADVANCE_PERMISSIONS, {
    read: "cash_advances:read",
    readOwn: "cash_advances:read_own",
    create: "cash_advances:create",
    submitOwn: "cash_advances:submit_own",
    approve: "cash_advances:approve",
    issue: "cash_advances:issue",
    settle: "cash_advances:settle",
  });
});

test("41. Regression: No Petty Cash implementation in UI", () => {
  assert.ok(EXPENSE_PERMISSIONS.submitOwn, "Expense permissions must be intact");
  const dashboardDir = path.join(process.cwd(), "src/app/(dashboard)");
  const files = fs.readdirSync(dashboardDir, { recursive: true }) as string[];
  const pettyCashFiles = files.filter(
    (f) => f.toLowerCase().includes("petty-cash") || f.toLowerCase().includes("pettycash"),
  );
  assert.equal(
    pettyCashFiles.length,
    0,
    "No petty cash UI route files must exist in this slice",
  );
});

test("42. Regression: No AP / accounting work introduced", () => {
  const allPermissions = Object.values(ROLE_PERMISSIONS).flat();
  assert.equal(allPermissions.some((p) => p.startsWith("ap:")), false);
  assert.equal(allPermissions.some((p) => p.startsWith("bills:")), false);
  assert.equal(allPermissions.some((p) => p.startsWith("ledger:")), false);
});

test("43. Regression: No initial system/environment loader changes", () => {
  const rootLayoutSource = fs.readFileSync(
    path.join(process.cwd(), "src/app/layout.tsx"),
    "utf8",
  );
  assert.ok(
    rootLayoutSource.includes("ClerkProvider"),
    "Root layout structure must be preserved",
  );
  const dashboardLayoutSource = fs.readFileSync(
    path.join(process.cwd(), "src/app/(dashboard)/layout.tsx"),
    "utf8",
  );
  assert.ok(
    dashboardLayoutSource.includes("LocaleProvider"),
    "Dashboard layout structure must be preserved",
  );
});

test("44. Regression: No direct authenticated-role SQL invocation introduced in UI", () => {
  const advancesDir = path.join(process.cwd(), "src/app/(dashboard)/advances");
  const files = fs.readdirSync(advancesDir, { recursive: true }) as string[];
  for (const f of files) {
    if (f.endsWith(".tsx") || f.endsWith(".ts")) {
      const content = fs.readFileSync(path.join(advancesDir, f), "utf8");
      assert.equal(
        content.includes(".rpc("),
        false,
        `UI file ${f} must not call .rpc() directly; must use server actions or queries`,
      );
    }
  }
});

// ============================================================================
// CORRECTIVE REPAIR: ERROR HARDENING & IDEMPOTENCY (Tests 45 - 54)
// ============================================================================

test("45. Repair: raw server Error.message is not surfaced to AdvancesClient", () => {
  const pageSource = fs.readFileSync(
    path.join(process.cwd(), "src/app/(dashboard)/advances/page.tsx"),
    "utf8",
  );
  assert.equal(
    pageSource.includes("err.message"),
    false,
    "advances/page.tsx must not pass err.message to loadError",
  );
  assert.ok(
    pageSource.includes('loadError = "load_failed"') ||
      pageSource.includes("loadError = 'load_failed'"),
    "advances/page.tsx must assign stable code 'load_failed'",
  );
});

test("46. Repair: user-facing load error is generic/localized", () => {
  const clientSource = fs.readFileSync(
    path.join(process.cwd(), "src/app/(dashboard)/advances/AdvancesClient.tsx"),
    "utf8",
  );
  assert.ok(
    clientSource.includes("dictionary.states.loadErrorMessage"),
    "AdvancesClient must render dictionary.states.loadErrorMessage on load error",
  );
  assert.equal(
    clientSource.includes("{loadError}"),
    false,
    "AdvancesClient must not render loadError variable directly",
  );
  assert.equal(
    clientSource.includes("{dictionary.states.noticePrefix} {loadError}"),
    false,
    "AdvancesClient must not prefix and display raw loadError",
  );
  assert.ok(cashAdvancesDictionaryEn.states.loadErrorMessage.length > 0);
  assert.ok(cashAdvancesDictionaryAr.states.loadErrorMessage.length > 0);
});

test("47. Repair: no SQL/Supabase/database error string is rendered", () => {
  const clientSource = fs.readFileSync(
    path.join(process.cwd(), "src/app/(dashboard)/advances/AdvancesClient.tsx"),
    "utf8",
  );
  const detailSource = fs.readFileSync(
    path.join(
      process.cwd(),
      "src/app/(dashboard)/advances/[id]/AdvanceDetailClient.tsx",
    ),
    "utf8",
  );
  const pageSource = fs.readFileSync(
    path.join(process.cwd(), "src/app/(dashboard)/advances/page.tsx"),
    "utf8",
  );

  for (const src of [clientSource, detailSource, pageSource]) {
    assert.equal(src.includes("PostgrestError"), false);
    assert.equal(src.includes("postgres"), false);
    assert.equal(src.includes("supabase.co"), false);
    assert.equal(src.includes('relation "'), false);
  }
});

test("48. Repair: fixed all-zero UUID fallback no longer exists", () => {
  const modalSource = fs.readFileSync(
    path.join(process.cwd(), "src/app/(dashboard)/advances/CashAdvanceRequestModal.tsx"),
    "utf8",
  );
  assert.equal(
    modalSource.includes("00000000-0000-4000-8000-000000000000"),
    false,
    "CashAdvanceRequestModal must not contain constant zero UUID fallback",
  );
});

test("49. Repair: request submission never proceeds with a constant fallback request_id", () => {
  const modalSource = fs.readFileSync(
    path.join(process.cwd(), "src/app/(dashboard)/advances/CashAdvanceRequestModal.tsx"),
    "utf8",
  );
  assert.ok(
    modalSource.includes("crypto.randomUUID"),
    "Must verify crypto.randomUUID",
  );
  assert.ok(
    modalSource.includes("dictionary.requestModal.errors.genericError"),
    "Must fail closed with generic error if crypto.randomUUID unavailable",
  );
  assert.equal(modalSource.includes("Date.now()"), false);
  assert.equal(modalSource.includes("Math.random()"), false);
});

test("50. Repair: successful request behavior remains unchanged", () => {
  const modalSource = fs.readFileSync(
    path.join(process.cwd(), "src/app/(dashboard)/advances/CashAdvanceRequestModal.tsx"),
    "utf8",
  );
  assert.ok(modalSource.includes("requestOwnCashAdvanceAction(payload)"));
  assert.ok(modalSource.includes("router.refresh()"));
  assert.ok(modalSource.includes("resetForm()"));
  assert.ok(modalSource.includes("onSuccessNotice("));
});

test("51. Repair: idempotent replay remains success", () => {
  const modalSource = fs.readFileSync(
    path.join(process.cwd(), "src/app/(dashboard)/advances/CashAdvanceRequestModal.tsx"),
    "utf8",
  );
  assert.ok(
    modalSource.includes("result.idempotentReplay"),
    "Modal must recognize idempotent replay as success",
  );
});

test("52. Repair: no lifecycle mutation buttons introduced", () => {
  const clientSource = fs.readFileSync(
    path.join(process.cwd(), "src/app/(dashboard)/advances/AdvancesClient.tsx"),
    "utf8",
  );
  const detailSource = fs.readFileSync(
    path.join(
      process.cwd(),
      "src/app/(dashboard)/advances/[id]/AdvanceDetailClient.tsx",
    ),
    "utf8",
  );
  for (const src of [clientSource, detailSource]) {
    assert.equal(src.includes("approveCashAdvanceAction"), false);
    assert.equal(src.includes("rejectCashAdvanceAction"), false);
    assert.equal(src.includes("issueCashAdvanceAction"), false);
    assert.equal(src.includes("settleCashAdvanceAction"), false);
    assert.equal(src.includes("cancelCashAdvanceAction"), false);
  }
});

test("53. Sidebar correctly maps /advances to expensesAndCosting section (W5B-2B Owner Acceptance)", () => {
  const sidebarSource = fs.readFileSync(
    path.join(process.cwd(), "src/components/layout/Sidebar.tsx"),
    "utf8",
  );
  // /advances must now be present as an approved nav child (Owner Acceptance activated Sidebar)
  assert.equal(
    sidebarSource.includes('href: "/advances"'),
    true,
    "Sidebar must have /advances nav child under expensesAndCosting section",
  );
  // /advances route must map to expensesAndCosting in getSectionForPathname
  assert.ok(
    sidebarSource.includes('"/advances"') &&
    sidebarSource.includes("expensesAndCosting"),
    "getSectionForPathname must map /advances to expensesAndCosting",
  );
  // Unrelated lifecycle actions must not be present in Sidebar
  assert.equal(sidebarSource.includes("approveCashAdvanceAction"), false);
  assert.equal(sidebarSource.includes("issueCashAdvanceAction"), false);
});

test("54. Repair: no migration files changed", () => {
  const migrationsDir = path.join(process.cwd(), "supabase/migrations");
  const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith(".sql")).sort();
  assert.equal(
    files[files.length - 1],
    "20260909100000_w5b2_cash_advance_numbering_and_integrity.sql",
    "No new migration must be added in W5B-2B repair",
  );
});

test("55. Layout Shell: AdvancesClient does NOT duplicate max-w-7xl shell and restores pre-01b5 visual baseline", () => {
  const clientSource = fs.readFileSync(
    path.join(process.cwd(), "src/app/(dashboard)/advances/AdvancesClient.tsx"),
    "utf8",
  );
  assert.equal(
    clientSource.includes("max-w-7xl"),
    false,
    "AdvancesClient must not duplicate max-w-7xl shell",
  );
  assert.equal(
    clientSource.includes("p-4 sm:p-6 md:p-8"),
    false,
    "AdvancesClient must not have duplicate page padding",
  );
  assert.ok(
    clientSource.includes('<div className="space-y-6">'),
    "AdvancesClient must use canonical space-y-6 root",
  );
  assert.equal(
    clientSource.includes("border-b border-outline-variant pb-5"),
    false,
    "AdvancesClient header must not have extra border-b divider",
  );
  assert.equal(
    clientSource.includes("dictionary.header.sectionBadge"),
    false,
    "AdvancesClient header must not render sectionBadge",
  );
  assert.equal(
    clientSource.includes("dictionary.header.stageBadge"),
    false,
    "AdvancesClient header must not render stageBadge",
  );
  assert.ok(
    clientSource.includes("gap-2.5"),
    "AdvancesClient header h1 must restore gap-2.5",
  );
  assert.ok(
    clientSource.includes("text-xs font-semibold shadow-xs"),
    "AdvancesClient header button must restore text-xs shadow-xs",
  );
});

test("56. Layout Shell: AdvanceDetailClient does NOT contain duplicate outer shell", () => {
  const detailSource = fs.readFileSync(
    path.join(process.cwd(), "src/app/(dashboard)/advances/[id]/AdvanceDetailClient.tsx"),
    "utf8",
  );
  assert.equal(
    detailSource.includes("max-w-7xl"),
    false,
    "AdvanceDetailClient must not contain duplicate max-w-7xl outer shell",
  );
  assert.equal(
    detailSource.includes("p-4 sm:p-6 md:p-8"),
    false,
    "AdvanceDetailClient must not contain duplicate outer shell padding",
  );
  assert.ok(
    detailSource.includes('<div className="space-y-6 max-w-5xl mx-auto">'),
    "AdvanceDetailClient must retain space-y-6 max-w-5xl mx-auto root structure",
  );
});

test("57. Dictionary: dead sectionBadge and stageBadge fields are cleaned up from CashAdvancesDictionary", () => {
  const dictSource = fs.readFileSync(
    path.join(process.cwd(), "src/lib/i18n/dictionaries/cash-advances.ts"),
    "utf8",
  );
  assert.equal(
    dictSource.includes("sectionBadge"),
    false,
    "CashAdvancesDictionary must not contain dead sectionBadge field",
  );
  assert.equal(
    dictSource.includes("stageBadge"),
    false,
    "CashAdvancesDictionary must not contain dead stageBadge field",
  );
});

test("58. Canonical Shell: dashboard layout owns max-w-[1440px] and ExpensesClient does NOT duplicate max-w-7xl shell", () => {
  const layoutSource = fs.readFileSync(
    path.join(process.cwd(), "src/app/(dashboard)/layout.tsx"),
    "utf8",
  );
  assert.ok(
    layoutSource.includes("dashboard-main relative mx-auto w-full min-w-0 max-w-[1440px] flex-1 p-4 md:p-6"),
    "Dashboard layout must own canonical max-w-[1440px] page shell with p-4 md:p-6",
  );
  const expensesSource = fs.readFileSync(
    path.join(process.cwd(), "src/app/(dashboard)/expenses/ExpensesClient.tsx"),
    "utf8",
  );
  assert.equal(
    expensesSource.includes("max-w-7xl"),
    false,
    "ExpensesClient must not duplicate max-w-7xl shell",
  );
  assert.equal(
    expensesSource.includes("p-4 sm:p-6 md:p-8"),
    false,
    "ExpensesClient must not have duplicate page padding",
  );
  assert.ok(
    expensesSource.includes('<div className="space-y-6">'),
    "ExpensesClient must use minimal space-y-6 root",
  );
});
