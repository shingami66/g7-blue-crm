import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ACTIONS_PATH = join(process.cwd(), "src/lib/payments/actions.ts");
const MODAL_PATH = join(process.cwd(), "src/app/(dashboard)/invoices/RecordPaymentModal.tsx");
const CONTROLLER_PATH = join(process.cwd(), "src/lib/payments/submission-controller.ts");
const AMOUNT_PATH = join(process.cwd(), "src/lib/payments/amount.ts");
const INVOICE_DETAIL_PATH = join(process.cwd(), "src/app/(dashboard)/invoices/[id]/page.tsx");
const RECORD_ACTION_PATH = join(process.cwd(), "src/app/(dashboard)/invoices/[id]/RecordPaymentAction.tsx");
const PAYMENTS_CLIENT_PATH = join(process.cwd(), "src/app/(dashboard)/payments/PaymentsClient.tsx");

test("Action structurally calls record_invoice_payment with seven named arguments including p_request_id", () => {
  const actionsContent = readFileSync(ACTIONS_PATH, "utf-8");
  assert.match(actionsContent, /supabase\.rpc\("record_invoice_payment",\s*params\)/);
  assert.match(actionsContent, /p_invoice_id:/);
  assert.match(actionsContent, /p_amount:/);
  assert.match(actionsContent, /p_date:/);
  assert.match(actionsContent, /p_method:/);
  assert.match(actionsContent, /p_reference:/);
  assert.match(actionsContent, /p_user_id:/);
  assert.match(actionsContent, /p_request_id:\s*input\.requestId/);
});

test("Payment precision is enforced before client submission and server RPC", () => {
  const amountContent = readFileSync(AMOUNT_PATH, "utf-8");
  const modalContent = readFileSync(MODAL_PATH, "utf-8");
  const controllerContent = readFileSync(CONTROLLER_PATH, "utf-8");
  const actionsContent = readFileSync(ACTIONS_PATH, "utf-8");

  assert.match(amountContent, /Number\.isFinite\(value\)/);
  assert.match(amountContent, /value\s*>\s*0/);
  assert.match(amountContent, /\{1,2\}/);
  assert.match(modalContent, /parseExactPositiveSarAmountText\(amount\)/);
  assert.ok(
    modalContent.indexOf("parseExactPositiveSarAmountText(amount)") <
      modalContent.indexOf("controllerRef.current.begin"),
  );
  assert.match(modalContent, /requestId:\s*reqId,\s*amount,\s*date,/);
  assert.match(controllerContent, /isExactPositiveSarAmount\(intent\.amount\)/);
  assert.ok(
    controllerContent.indexOf("isExactPositiveSarAmount(intent.amount)") <
      controllerContent.indexOf("getNormalizedIntentString(intent)"),
  );
  assert.ok(
    actionsContent.indexOf("recordPaymentSchema.safeParse(input)") <
      actionsContent.indexOf('supabase.rpc("record_invoice_payment"'),
  );
});

test("Legacy six-argument call shape is absent", () => {
  const actionsContent = readFileSync(ACTIONS_PATH, "utf-8");
  const rpcCalls = actionsContent.match(/supabase\.rpc\("record_invoice_payment"/g) || [];
  assert.strictEqual(rpcCalls.length, 1, "Should only have one RPC call");
});

test("Error mapping and safe fallbacks are structurally present in the orchestrator", () => {
  const controllerContent = readFileSync(CONTROLLER_PATH, "utf-8");
  assert.match(controllerContent, /if\s*\(error\)\s*\{\s*console\.error[\s\S]*?return\s*\{\s*success:\s*false,\s*error:\s*"payment_record_failed"\s*\};\s*\}/);
  assert.match(controllerContent, /error_code/);
});

test("Component request ID lifecycle reuses the PaymentSubmissionController", () => {
  const modalContent = readFileSync(MODAL_PATH, "utf-8");
  assert.match(modalContent, /const\s+controllerRef\s*=\s*useRef\(new\s+PaymentSubmissionController\(\(\)\s*=>\s*crypto\.randomUUID\(\)\)\)/);
  assert.match(modalContent, /const\s*\{\s*accepted,\s*requestId/);
  assert.match(modalContent, /controllerRef\.current\.settleSuccess\(intent\)/);
  assert.match(modalContent, /controllerRef\.current\.settleFailure\(intent\)/);
  assert.match(modalContent, /controllerRef\.current\.reset\(/);
});

test("Invoice Detail wiring and gating", () => {
  const pageContent = readFileSync(INVOICE_DETAIL_PATH, "utf-8");
  
  assert.match(pageContent, /import\s+\{\s*RecordPaymentAction\s*\}\s+from\s+['"].\/RecordPaymentAction['"]/);
  assert.match(pageContent, /<RecordPaymentAction/);
  assert.match(pageContent, /await\s+checkPermission\(['"]payments:write['"]\)/);
  assert.match(pageContent, /!\s*\[\s*['"]draft['"]\s*,\s*['"]cancelled['"]\s*,\s*['"]voided['"]\s*\]\.includes\(invoice\.status\)/);
  assert.match(pageContent, /\(\s*invoice\.balance_due\s*\?\?\s*0\s*\)\s*>\s*0/);
  assert.match(pageContent, /canRecordPayment\s*&&\s*\(\s*<div.*>\s*<RecordPaymentAction/);
  assert.match(pageContent, /invoiceId=\{invoice\.id\}/);
  assert.match(pageContent, /invoiceNumber=\{invoice\.invoice_number\s*\|\|\s*invoice\.id\}/);
  assert.match(pageContent, /balanceDue=\{invoice\.balance_due\s*\?\?\s*0\}/);
  assert.doesNotMatch(pageContent, /supabase\.rpc\(/);
  
  const actionContent = readFileSync(RECORD_ACTION_PATH, "utf-8");
  assert.match(actionContent, /<RecordPaymentModal/);
  assert.doesNotMatch(actionContent, /supabase\.rpc\(/);
  assert.match(actionContent, /type=["']button["']/);
  assert.match(actionContent, /e\.preventDefault\(\)/);
  assert.match(actionContent, /e\.stopPropagation\(\)/);
  assert.doesNotMatch(actionContent, /recordPaymentAction/);
});

test("RecordPaymentModal explicit confirmation wiring", () => {
  const modalContent = readFileSync(MODAL_PATH, "utf-8");
  assert.match(modalContent, /type=["']button["'][^>]*onClick=\{handleConfirmPayment\}/);
  assert.match(modalContent, /const handleConfirmPayment\s*=\s*\([^)]*\)\s*=>/);
  assert.match(modalContent, /<form[^>]*onSubmit=\{handleSubmit\}/);
  assert.doesNotMatch(modalContent, /type=["']submit["']/);
  assert.match(modalContent, /const handleSubmit\s*=\s*\([^)]*\)\s*=>\s*\{\s*e\.preventDefault\(\);\s*e\.stopPropagation\(\);\s*\};/);
});

// UI test requirements assertions
test("No eslint-disable or other suppression exists in the edited UI files", () => {
  const modalContent = readFileSync(MODAL_PATH, "utf-8");
  const clientContent = readFileSync(PAYMENTS_CLIENT_PATH, "utf-8");
  const actionContent = readFileSync(RECORD_ACTION_PATH, "utf-8");
  
  assert.doesNotMatch(modalContent, /eslint-disable/);
  assert.doesNotMatch(clientContent, /eslint-disable/);
  assert.doesNotMatch(actionContent, /eslint-disable/);
});

test("No isMounted/useEffect arming workaround remains in RecordPaymentModal", () => {
  const modalContent = readFileSync(MODAL_PATH, "utf-8");
  assert.doesNotMatch(modalContent, /isMounted/);
  assert.doesNotMatch(modalContent, /useEffect/);
  assert.doesNotMatch(modalContent, /setTimeout/);
  assert.doesNotMatch(modalContent, /requestAnimationFrame/);
});

test("Payments table has exactly one local overflow-x-auto wrapper", () => {
  const clientContent = readFileSync(PAYMENTS_CLIENT_PATH, "utf-8");
  const overflowXMatches = clientContent.match(/overflow-x-auto/g) || [];
  assert.strictEqual(overflowXMatches.length, 1, "Should have exactly one overflow-x-auto wrapper");
});

test("PaginationFooter remains outside and above the table overflow wrapper", () => {
  const clientContent = readFileSync(PAYMENTS_CLIENT_PATH, "utf-8");
  const scrollContainerIndex = clientContent.indexOf("overflow-x-auto");
  const paginationIndex = clientContent.indexOf("<PaginationFooter");
  assert.ok(scrollContainerIndex !== -1, "Should find overflow-x-auto wrapper");
  assert.ok(paginationIndex !== -1, "Should find PaginationFooter usage");
  assert.ok(paginationIndex < scrollContainerIndex, "PaginationFooter should appear before the table overflow wrapper");
});

test("The original flex-growing table/page region is preserved", () => {
  const clientContent = readFileSync(PAYMENTS_CLIENT_PATH, "utf-8");
  assert.match(clientContent, /className=["'][^"']*flex-1 overflow-auto[^"']*["']/);
});

test("min-w-max is absent", () => {
  const clientContent = readFileSync(PAYMENTS_CLIENT_PATH, "utf-8");
  assert.doesNotMatch(clientContent, /min-w-max/);
});

test("Local scrollLeft resets on page change", () => {
  const clientContent = readFileSync(PAYMENTS_CLIENT_PATH, "utf-8");
  assert.match(clientContent, /scrollRef\.current\.scrollLeft\s*=\s*0/);
});

test("Essential cells remain nowrap", () => {
  const clientContent = readFileSync(PAYMENTS_CLIENT_PATH, "utf-8");
  const nowrapMatches = clientContent.match(/whitespace-nowrap/g) || [];
  assert.ok(nowrapMatches.length >= 6, "Expected at least 6 whitespace-nowrap classes");
});

test("Reference remains truncated in a controlled manner", () => {
  const clientContent = readFileSync(PAYMENTS_CLIENT_PATH, "utf-8");
  assert.match(clientContent, /max-w-\[\d+px\]/);
  assert.match(clientContent, /truncate/);
});
