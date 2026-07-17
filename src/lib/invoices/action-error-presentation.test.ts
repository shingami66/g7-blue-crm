import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { getServicesDictionary } from "../i18n/dictionaries/services.ts";
import {
  presentDepositInvoiceActionError,
  presentFinalInvoiceActionError,
  type DepositInvoiceActionErrorMessages,
  type FinalInvoiceActionErrorMessages,
} from "./action-error-presentation.ts";

const REPO_ROOT = join(import.meta.dirname, "../../..");
const DEPOSIT = join(
  REPO_ROOT,
  "src/app/(dashboard)/services/[id]/CreateDepositInvoiceAction.tsx",
);
const FINAL = join(
  REPO_ROOT,
  "src/app/(dashboard)/services/[id]/CreateFinalInvoiceAction.tsx",
);

const DEPOSIT_CODES = [
  "invalid_invoice_input",
  "deposit_amount_required",
  "deposit_amount_exceeds_quotation_total",
  "deposit_amount_exceeds_remaining",
  "deposit_invoice_already_exists",
  "quotation_not_found",
  "quotation_not_approved",
  "quotation_service_mismatch",
  "company_settings_unavailable",
  "invoice_snapshot_unavailable",
  "invoice_exposure_unavailable",
  "service_lifecycle_unavailable",
  "service_not_eligible_for_deposit",
  "invoice_creation_failed",
  "invoice_insert_failed",
  "Unauthorized",
  "Forbidden",
] as const;

const FINAL_CODES = [
  "invalid_invoice_input",
  "final_invoice_already_exists",
  "quotation_not_found",
  "quotation_not_approved",
  "quotation_service_mismatch",
  "company_settings_unavailable",
  "invoice_snapshot_unavailable",
  "service_lifecycle_unavailable",
  "service_not_eligible_for_final",
  "invoice_creation_failed",
  "invoice_insert_failed",
  "Unauthorized",
  "Forbidden",
] as const;

function depositMessages(
  locale: "en" | "ar" = "en",
): DepositInvoiceActionErrorMessages {
  return getServicesDictionary(locale).billing.depositAction.errors;
}

function finalMessages(
  locale: "en" | "ar" = "en",
): FinalInvoiceActionErrorMessages {
  return getServicesDictionary(locale).billing.finalAction.errors;
}

function assertNoLeakage(message: string, raw: unknown): void {
  if (typeof raw === "string" && raw.length > 0) {
    assert.equal(message.includes(raw), false);
  }
  if (raw !== null && typeof raw === "object") {
    const serialized = JSON.stringify(raw);
    if (serialized) {
      assert.equal(message.includes(serialized), false);
    }
  }
  assert.equal(message.includes("{code}"), false);
  assert.equal(message.includes("Error code:"), false);
  assert.equal(message.includes("رمز الخطأ"), false);
}

test("every known Deposit code maps to its intended safe message", () => {
  const messages = depositMessages("en");
  const expectedByCode: Record<(typeof DEPOSIT_CODES)[number], string> = {
    invalid_invoice_input: messages.invalidInvoiceInput,
    deposit_amount_required: messages.depositAmountRequired,
    deposit_amount_exceeds_quotation_total:
      messages.depositAmountExceedsQuotationTotal,
    deposit_amount_exceeds_remaining: messages.depositAmountExceedsRemaining,
    deposit_invoice_already_exists: messages.depositInvoiceAlreadyExists,
    quotation_not_found: messages.quotationNotFound,
    quotation_not_approved: messages.quotationNotApproved,
    quotation_service_mismatch: messages.quotationServiceMismatch,
    company_settings_unavailable: messages.companySettingsUnavailable,
    invoice_snapshot_unavailable: messages.invoiceSnapshotUnavailable,
    invoice_exposure_unavailable: messages.invoiceExposureUnavailable,
    service_lifecycle_unavailable: messages.serviceLifecycleUnavailable,
    service_not_eligible_for_deposit: messages.serviceNotEligibleForDeposit,
    invoice_creation_failed: messages.invoiceCreationFailed,
    invoice_insert_failed: messages.invoiceCreationFailed,
    Unauthorized: messages.unauthorized,
    Forbidden: messages.forbidden,
  };

  for (const code of DEPOSIT_CODES) {
    const presented = presentDepositInvoiceActionError(code, messages);
    assert.equal(presented, expectedByCode[code]);
    assert.notEqual(presented, messages.fallback);
    assertNoLeakage(presented, code);
  }
});

test("every known Final code maps to its intended safe message", () => {
  const messages = finalMessages("en");
  const expectedByCode: Record<(typeof FINAL_CODES)[number], string> = {
    invalid_invoice_input: messages.invalidInvoiceInput,
    final_invoice_already_exists: messages.finalInvoiceAlreadyExists,
    quotation_not_found: messages.quotationNotFound,
    quotation_not_approved: messages.quotationNotApproved,
    quotation_service_mismatch: messages.quotationServiceMismatch,
    company_settings_unavailable: messages.companySettingsUnavailable,
    invoice_snapshot_unavailable: messages.invoiceSnapshotUnavailable,
    service_lifecycle_unavailable: messages.serviceLifecycleUnavailable,
    service_not_eligible_for_final: messages.serviceNotEligibleForFinal,
    invoice_creation_failed: messages.invoiceCreationFailed,
    invoice_insert_failed: messages.invoiceCreationFailed,
    Unauthorized: messages.unauthorized,
    Forbidden: messages.forbidden,
  };

  for (const code of FINAL_CODES) {
    const presented = presentFinalInvoiceActionError(code, messages);
    assert.equal(presented, expectedByCode[code]);
    assert.notEqual(presented, messages.fallback);
    assertNoLeakage(presented, code);
  }
});

test("unknown codes return the generic fallback without leakage", () => {
  const deposit = depositMessages("en");
  const final = finalMessages("en");
  const unknowns = [
    "billing_scope_inactive",
    "invoice_number_unavailable",
    "prior_invoice_lookup_failed",
    "not_a_real_code",
    "deposit_amount_required ",
    " Unauthorized",
  ];

  for (const raw of unknowns) {
    const depositPresented = presentDepositInvoiceActionError(raw, deposit);
    const finalPresented = presentFinalInvoiceActionError(raw, final);
    assert.equal(depositPresented, deposit.fallback);
    assert.equal(finalPresented, final.fallback);
    assertNoLeakage(depositPresented, raw);
    assertNoLeakage(finalPresented, raw);
  }
});

test("database-like and stack-like inputs return fallback without leakage", () => {
  const deposit = depositMessages("en");
  const final = finalMessages("ar");
  const hostileInputs: unknown[] = [
    'duplicate key value violates unique constraint "invoices_pkey"',
    "relation invoices does not exist",
    "permission denied for table invoices",
    "role app_user does not exist",
    "Error: something broke\n    at createInvoiceAction (actions.ts:500:11)",
    "TypeError: Cannot read properties of undefined (reading 'id')",
    '{"error":"secret","stack":"at Object.<anonymous>"}',
    "SQLSTATE 23505",
  ];

  for (const raw of hostileInputs) {
    const depositPresented = presentDepositInvoiceActionError(raw, deposit);
    const finalPresented = presentFinalInvoiceActionError(raw, final);
    assert.equal(depositPresented, deposit.fallback);
    assert.equal(finalPresented, final.fallback);
    assertNoLeakage(depositPresented, raw);
    assertNoLeakage(finalPresented, raw);
  }
});

test("object, array, null, undefined, blank, and numeric inputs return fallback", () => {
  const deposit = depositMessages("en");
  const final = finalMessages("en");
  const malformed: unknown[] = [
    null,
    undefined,
    "",
    "   ",
    0,
    42,
    -1,
    true,
    false,
    Symbol("x"),
    { error: "invoice_insert_failed" },
    ["invoice_insert_failed"],
    () => "invoice_insert_failed",
  ];

  for (const raw of malformed) {
    const depositPresented = presentDepositInvoiceActionError(raw, deposit);
    const finalPresented = presentFinalInvoiceActionError(raw, final);
    assert.equal(depositPresented, deposit.fallback);
    assert.equal(finalPresented, final.fallback);
    assertNoLeakage(depositPresented, raw);
    assertNoLeakage(finalPresented, raw);
  }
});

test("EN and AR Deposit/Final dictionary error shapes remain aligned and complete", () => {
  const enDeposit = depositMessages("en");
  const arDeposit = depositMessages("ar");
  const enFinal = finalMessages("en");
  const arFinal = finalMessages("ar");

  const depositKeys = Object.keys(enDeposit).sort();
  const finalKeys = Object.keys(enFinal).sort();

  assert.deepEqual(Object.keys(arDeposit).sort(), depositKeys);
  assert.deepEqual(Object.keys(arFinal).sort(), finalKeys);

  assert.equal("fallbackWithCode" in enDeposit, false);
  assert.equal("fallbackWithCode" in arDeposit, false);
  assert.equal("fallbackWithCode" in enFinal, false);
  assert.equal("fallbackWithCode" in arFinal, false);

  for (const key of depositKeys) {
    const enValue = enDeposit[key as keyof DepositInvoiceActionErrorMessages];
    const arValue = arDeposit[key as keyof DepositInvoiceActionErrorMessages];
    assert.equal(typeof enValue, "string");
    assert.equal(typeof arValue, "string");
    assert.ok(enValue.length > 0);
    assert.ok(arValue.length > 0);
    assert.equal(enValue.includes("{code}"), false);
    assert.equal(arValue.includes("{code}"), false);
  }

  for (const key of finalKeys) {
    const enValue = enFinal[key as keyof FinalInvoiceActionErrorMessages];
    const arValue = arFinal[key as keyof FinalInvoiceActionErrorMessages];
    assert.equal(typeof enValue, "string");
    assert.equal(typeof arValue, "string");
    assert.ok(enValue.length > 0);
    assert.ok(arValue.length > 0);
    assert.equal(enValue.includes("{code}"), false);
    assert.equal(arValue.includes("{code}"), false);
  }
});

test("Deposit and Final action components use shared presentation and never raw-code paths", () => {
  const depositSource = readFileSync(DEPOSIT, "utf8");
  const finalSource = readFileSync(FINAL, "utf8");

  assert.match(depositSource, /presentDepositInvoiceActionError/);
  assert.match(finalSource, /presentFinalInvoiceActionError/);
  assert.match(
    depositSource,
    /from "@\/lib\/invoices\/action-error-presentation"/,
  );
  assert.match(
    finalSource,
    /from "@\/lib\/invoices\/action-error-presentation"/,
  );

  assert.doesNotMatch(depositSource, /fallbackWithCode/);
  assert.doesNotMatch(finalSource, /fallbackWithCode/);
  assert.doesNotMatch(depositSource, /\.replace\("\{code\}"/);
  assert.doesNotMatch(finalSource, /\.replace\("\{code\}"/);
  assert.doesNotMatch(depositSource, /errMap\[result\.error\]/);
  assert.doesNotMatch(finalSource, /errMap\[result\.error\]/);

  // Presenter output is set; raw result.error is not rendered as JSX children.
  assert.match(
    depositSource,
    /setError\(\s*presentDepositInvoiceActionError\(\s*result\.error/,
  );
  assert.match(
    finalSource,
    /setError\(\s*presentFinalInvoiceActionError\(\s*result\.error/,
  );
  assert.doesNotMatch(depositSource, /\{result\.error\}/);
  assert.doesNotMatch(finalSource, /\{result\.error\}/);
  assert.doesNotMatch(depositSource, /console\.(log|error|warn|debug)/);
  assert.doesNotMatch(finalSource, /console\.(log|error|warn|debug)/);
});

test("Arabic Deposit presentation uses localized messages without raw codes", () => {
  const messages = depositMessages("ar");
  const presented = presentDepositInvoiceActionError(
    "deposit_invoice_already_exists",
    messages,
  );
  assert.equal(presented, messages.depositInvoiceAlreadyExists);
  assert.equal(presented.includes("deposit_invoice_already_exists"), false);
  assert.equal(presented.includes("عربون"), false);
});
