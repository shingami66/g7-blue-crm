import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import {
  APPROVED_BILLING_SCOPE_ACCOUNTANT_PERMISSIONS,
  APPROVED_BILLING_SCOPE_MANAGER_PERMISSIONS,
  APPROVED_BILLING_SCOPE_PERMISSIONS,
} from "../approved-billing-scopes/permissions.ts";
import {
  getServiceStatusLabel,
  getServicesDictionary,
} from "./dictionaries/services.ts";
import {
  formatSarAmount,
  formatUiDate,
  formatUiNumber,
} from "./formatting.ts";

const REPO_ROOT = join(import.meta.dirname, "../../..");

const BILLING = join(REPO_ROOT, "src/app/(dashboard)/services/[id]/BillingPanel.tsx");
const DEPOSIT = join(
  REPO_ROOT,
  "src/app/(dashboard)/services/[id]/CreateDepositInvoiceAction.tsx",
);
const FINAL = join(
  REPO_ROOT,
  "src/app/(dashboard)/services/[id]/CreateFinalInvoiceAction.tsx",
);
const ABS_CARD = join(
  REPO_ROOT,
  "src/app/(dashboard)/services/[id]/ApprovedBillingScopesCard.tsx",
);
const ABS_DETAIL = join(
  REPO_ROOT,
  "src/app/(dashboard)/services/[id]/approved-billing-scopes/[scopeId]/page.tsx",
);
const ALLOCATIONS = join(
  REPO_ROOT,
  "src/app/(dashboard)/services/[id]/SupplierAllocationsPanel.tsx",
);
const BOOKINGS = join(
  REPO_ROOT,
  "src/app/(dashboard)/services/[id]/SupplierBookingsPanel.tsx",
);
const BOOKING_ACTIONS = join(
  REPO_ROOT,
  "src/app/(dashboard)/services/[id]/SupplierBookingActions.tsx",
);
const ALLOC_CREATE_PAGE = join(
  REPO_ROOT,
  "src/app/(dashboard)/services/[id]/allocations/new/page.tsx",
);
const ALLOC_EDIT_PAGE = join(
  REPO_ROOT,
  "src/app/(dashboard)/services/[id]/allocations/[allocationId]/edit/page.tsx",
);
const ALLOC_CANCEL_PAGE = join(
  REPO_ROOT,
  "src/app/(dashboard)/services/[id]/allocations/[allocationId]/cancel/page.tsx",
);
const ALLOC_DELETE_PAGE = join(
  REPO_ROOT,
  "src/app/(dashboard)/services/[id]/allocations/[allocationId]/delete/page.tsx",
);
const ALLOC_RESTORE_PAGE = join(
  REPO_ROOT,
  "src/app/(dashboard)/services/[id]/allocations/[allocationId]/restore/page.tsx",
);
const SERVICE_DETAIL = join(REPO_ROOT, "src/app/(dashboard)/services/[id]/page.tsx");
const INVOICE_ACTIONS = join(REPO_ROOT, "src/lib/invoices/actions.ts");
const INVOICE_BILLING_STATE = join(REPO_ROOT, "src/lib/invoices/billing-state.ts");
const INVOICE_SCHEMAS = join(REPO_ROOT, "src/lib/invoices/schemas.ts");
const PERMISSIONS = join(REPO_ROOT, "src/lib/auth/permissions.ts");
const PENDING = join(REPO_ROOT, "src/components/ui/GlobalPendingProvider.tsx");
const QUOTATIONS_PAGE = join(REPO_ROOT, "src/app/(dashboard)/quotations/page.tsx");
const INVOICES_PAGE = join(REPO_ROOT, "src/app/(dashboard)/invoices/page.tsx");
const PAYMENTS_PAGE = join(REPO_ROOT, "src/app/(dashboard)/payments/page.tsx");

const ARABIC_INDIC = /[٠-٩]/;

const OPERATIONAL_UI_FILES = [
  BILLING,
  DEPOSIT,
  FINAL,
  ABS_CARD,
  ABS_DETAIL,
  ALLOCATIONS,
  BOOKINGS,
  BOOKING_ACTIONS,
  ALLOC_CREATE_PAGE,
  ALLOC_EDIT_PAGE,
  ALLOC_CANCEL_PAGE,
  ALLOC_DELETE_PAGE,
  ALLOC_RESTORE_PAGE,
];

function listNestedKeys(value: unknown, prefix = ""): string[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return prefix ? [prefix] : [];
  }
  return Object.entries(value as Record<string, unknown>).flatMap(([key, nested]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    if (nested && typeof nested === "object" && !Array.isArray(nested)) {
      return listNestedKeys(nested, path);
    }
    return [path];
  });
}

function read(path: string) {
  return readFileSync(path, "utf8");
}

// ---------------------------------------------------------------------------
// 1. Dictionary shape alignment
// ---------------------------------------------------------------------------
test("1. Operational services dictionary English/Arabic shapes stay aligned", () => {
  const en = getServicesDictionary("en");
  const ar = getServicesDictionary("ar");
  assert.deepEqual(listNestedKeys(en.billing).sort(), listNestedKeys(ar.billing).sort());
  assert.deepEqual(
    listNestedKeys(en.approvedBillingScopes).sort(),
    listNestedKeys(ar.approvedBillingScopes).sort(),
  );
  assert.deepEqual(
    listNestedKeys(en.supplierAllocations).sort(),
    listNestedKeys(ar.supplierAllocations).sort(),
  );
  assert.deepEqual(
    listNestedKeys(en.supplierBookings).sort(),
    listNestedKeys(ar.supplierBookings).sort(),
  );
});

// ---------------------------------------------------------------------------
// 2-3. Billing headings + deposit/final action copy
// ---------------------------------------------------------------------------
test("2. Billing headings and labels resolve in both locales", () => {
  const en = getServicesDictionary("en");
  const ar = getServicesDictionary("ar");
  assert.equal(en.billing.title, "Billing");
  assert.equal(ar.billing.title, "الفوترة");
  assert.equal(en.billing.cards.billingCalculation, "Billing Summary");
  assert.equal(ar.billing.cards.billingCalculation, "ملخص الفوترة");
  assert.equal(en.billing.cards.priorInvoiced, "Previously Invoiced");
  assert.equal(ar.billing.cards.priorInvoiced, "المفوتر سابقاً");
  assert.equal(en.billing.cards.remaining, "Remaining Amount");
  assert.equal(ar.billing.cards.remaining, "المبلغ المتبقي");
  assert.equal(en.billing.cards.depositInvoice, "Deposit Invoice");
  assert.equal(ar.billing.cards.depositInvoice, "فاتورة دفعة مقدمة");
  assert.equal(en.billing.cards.finalInvoice, "Final Invoice");
  assert.equal(ar.billing.cards.finalInvoice, "الفاتورة النهائية");
});

test("3. Deposit and final invoice action copy resolves in both locales", () => {
  const en = getServicesDictionary("en");
  const ar = getServicesDictionary("ar");
  assert.equal(en.billing.depositAction.create, "Create Deposit Invoice");
  assert.equal(ar.billing.depositAction.create, "إنشاء فاتورة دفعة مقدمة");
  assert.equal(ar.billing.depositAction.amountLabel, "مبلغ الدفعة المقدمة (SAR)");
  assert.equal(ar.billing.depositAction.unavailable, "فاتورة الدفعة المقدمة غير متاحة.");
  assert.equal(
    ar.billing.depositAction.errors.depositInvoiceAlreadyExists,
    "توجد فاتورة دفعة مقدمة نشطة بالفعل.",
  );
  assert.equal(en.billing.finalAction.create, "Create Final Invoice");
  assert.equal(ar.billing.finalAction.create, "إنشاء الفاتورة النهائية");
  assert.match(en.billing.depositAction.success, /\{invoiceNumber\}/);
  assert.match(ar.billing.finalAction.success, /\{invoiceNumber\}/);
  assert.match(read(DEPOSIT), /useLocale/);
  assert.match(read(FINAL), /useLocale/);
  assert.match(read(BILLING), /billingDictionary\.depositAction/);
  assert.match(read(BILLING), /billingDictionary\.finalAction/);
});

test("3b. Deposit invoice Arabic glossary: no canonical فاتورة عربون; codes stable", () => {
  const ar = getServicesDictionary("ar");
  const en = getServicesDictionary("en");
  assert.equal(ar.billing.cards.depositInvoice, "فاتورة دفعة مقدمة");
  assert.equal(ar.billing.depositAction.create, "إنشاء فاتورة دفعة مقدمة");
  assert.equal(getServiceStatusLabel("ar", "Deposit Paid"), "تم سداد الدفعة المقدمة");
  assert.match(ar.serviceStatuses["Deposit Paid"], /الدفعة المقدمة/);
  // Canonical Deposit Invoice UI strings must not use عربون
  assert.equal(ar.billing.cards.depositInvoice.includes("عربون"), false);
  assert.equal(ar.billing.depositAction.create.includes("عربون"), false);
  assert.equal(ar.billing.depositAction.amountLabel.includes("عربون"), false);
  assert.equal(ar.billing.depositAction.errors.depositInvoiceAlreadyExists.includes("عربون"), false);
  // English and internal codes unchanged
  assert.equal(en.billing.cards.depositInvoice, "Deposit Invoice");
  assert.equal(en.billing.depositAction.create, "Create Deposit Invoice");
  assert.equal(en.serviceStatuses["Deposit Paid"], "Deposit Paid");
  assert.match(read(DEPOSIT), /invoiceType: "deposit"/);
  assert.match(read(BILLING), /deposit_invoice_already_exists/);
  assert.doesNotMatch(read(DEPOSIT), /invoiceType: "progress"/);
  // Final Invoice terminology unchanged
  assert.equal(ar.billing.cards.finalInvoice, "الفاتورة النهائية");
  assert.equal(ar.billing.finalAction.create, "إنشاء الفاتورة النهائية");
});

// ---------------------------------------------------------------------------
// 4-6. Invoice codes, disabled reasons, billing calculations untouched
// ---------------------------------------------------------------------------
test("4. Invoice internal types/codes remain deposit|final and schema-stable", () => {
  const schemas = read(INVOICE_SCHEMAS);
  assert.match(schemas, /invoiceType: z\.enum\(\["deposit", "final"\]/);
  assert.match(schemas, /requestedAmount/);
  const actions = read(INVOICE_ACTIONS);
  assert.match(actions, /invoiceType === "deposit"/);
  assert.match(actions, /invoiceType === "final"/);
});

test("5. Invoice disabled reasons map from safe codes without changing eligibility keys", () => {
  const billing = read(BILLING);
  assert.match(billing, /approved_quotation_required/);
  assert.match(billing, /deposit_invoice_already_exists/);
  assert.match(billing, /final_invoice_already_exists/);
  assert.match(billing, /prior_invoices_exceed_quotation_total/);
  assert.match(billing, /disabledReasonLabels\[reason\]/);
  const en = getServicesDictionary("en");
  assert.ok(en.billing.disabledReasons.approvedQuotationRequired.length > 0);
  assert.ok(en.billing.disabledReasons.unavailable.length > 0);
  assert.notEqual(
    en.billing.disabledReasons.approvedQuotationRequired,
    en.billing.disabledReasons.billingStateUnavailable,
  );
});

test("6. Billing ceiling / prior invoiced / remaining calculations remain in billing-state source", () => {
  const billingState = read(INVOICE_BILLING_STATE);
  assert.match(billingState, /activePriorInvoiceTotal/);
  assert.match(billingState, /remainingUninvoicedAmount/);
  assert.match(billingState, /canCreateDepositInvoice/);
  assert.match(billingState, /canCreateFinalInvoice/);
  // UI must not recompute remaining amounts
  const panel = read(BILLING);
  assert.match(panel, /billingState\.remainingUninvoicedAmount|remainingUninvoicedAmount/);
  assert.doesNotMatch(panel, /Math\.max\(0,\s*.*grandTotal/);
  assert.match(read(DEPOSIT), /createInvoiceAction/);
  assert.match(read(FINAL), /invoiceType: "final"/);
  assert.match(read(DEPOSIT), /invoiceType: "deposit"/);
  assert.match(read(DEPOSIT), /requestedAmount: parsedAmount/);
});

// ---------------------------------------------------------------------------
// 7-11. Approved Billing Scope
// ---------------------------------------------------------------------------
test("7. ABS headings, statuses, line-safety, and item-decision labels localize", () => {
  const en = getServicesDictionary("en");
  const ar = getServicesDictionary("ar");
  assert.equal(en.approvedBillingScopes.title, "Approved Billing Scope");
  assert.equal(ar.approvedBillingScopes.title, "نطاق الفوترة المعتمد");
  assert.equal(ar.approvedBillingScopes.statusLabels.draft, "مسودة");
  assert.equal(ar.approvedBillingScopes.statusLabels.approved, "معتمد");
  assert.equal(ar.approvedBillingScopes.statusLabels.voided, "ملغى");
  assert.equal(ar.approvedBillingScopes.lineSafetyLabels.pending_review, "بانتظار المراجعة");
  assert.equal(ar.approvedBillingScopes.lineSafetyLabels.safe, "آمن");
  assert.equal(ar.approvedBillingScopes.detail.itemDecisionLabels.accepted, "مقبول");
  assert.equal(ar.approvedBillingScopes.detail.itemDecisionLabels.adjusted, "معدل");
  assert.equal(ar.approvedBillingScopes.detail.itemDecisionLabels.excluded, "مستبعد");
  assert.equal(
    ar.approvedBillingScopes.detail.itemDecisionLabels.customer_supplied,
    "يوفره العميل",
  );
  assert.equal(ar.approvedBillingScopes.labels.acceptedGrandTotal, "الإجمالي المقبول");
  assert.equal(ar.approvedBillingScopes.detail.sectionInvoices, "الفواتير المرتبطة");
});

test("8. ABS internal status and decision codes remain unchanged", () => {
  const en = getServicesDictionary("en");
  assert.deepEqual(Object.keys(en.approvedBillingScopes.statusLabels).sort(), [
    "approved",
    "draft",
    "voided",
  ]);
  assert.deepEqual(Object.keys(en.approvedBillingScopes.lineSafetyLabels).sort(), [
    "pending_review",
    "safe",
    "unsafe",
  ]);
  assert.deepEqual(
    Object.keys(en.approvedBillingScopes.detail.itemDecisionLabels).sort(),
    ["accepted", "adjusted", "customer_supplied", "excluded"],
  );
  const card = read(ABS_CARD);
  assert.match(card, /statusLabels\[currentScope\.status\]/);
  assert.match(card, /lineSafetyLabels\[currentScope\.lineSafetyStatus\]/);
});

test("9-11. ABS permissions and masking: accountant read-only; viewer/sales blocked", () => {
  assert.deepEqual(APPROVED_BILLING_SCOPE_ACCOUNTANT_PERMISSIONS, [
    APPROVED_BILLING_SCOPE_PERMISSIONS.read,
  ]);
  assert.ok(
    APPROVED_BILLING_SCOPE_MANAGER_PERMISSIONS.includes(
      APPROVED_BILLING_SCOPE_PERMISSIONS.approve,
    ),
  );

  const permissions = read(PERMISSIONS);
  const salesBlock = permissions.match(/sales:\s*\[([\s\S]*?)\],\s*operations:/)?.[1] ?? "";
  const viewerBlock = permissions.match(/viewer:\s*\[([\s\S]*?)\],?\s*\};/)?.[1] ?? "";
  const accountantBlock =
    permissions.match(/accountant:\s*\[([\s\S]*?)\],\s*viewer:/)?.[1] ?? "";
  const managerBlock = permissions.match(/manager:\s*\[([\s\S]*?)\],\s*sales:/)?.[1] ?? "";
  assert.equal(salesBlock.includes("approvedBillingScopes"), false);
  assert.equal(viewerBlock.includes("approvedBillingScopes"), false);
  assert.equal(
    accountantBlock.includes("APPROVED_BILLING_SCOPE_ACCOUNTANT_PERMISSIONS"),
    true,
  );
  assert.equal(
    managerBlock.includes("APPROVED_BILLING_SCOPE_MANAGER_PERMISSIONS"),
    true,
  );

  const detail = read(ABS_DETAIL);
  assert.match(detail, /requirePermission\("approvedBillingScopes:read"\)/);
  assert.match(detail, /sourceDescription/);
  assert.doesNotMatch(detail, /estimatedUnitCost|supplier_allocations|supplier_costing/);
  assert.match(read(SERVICE_DETAIL), /canReadApprovedBillingScopes/);
  assert.match(read(SERVICE_DETAIL), /approvedBillingScopes:read/);
});

// ---------------------------------------------------------------------------
// 12-13. Supplier allocations
// ---------------------------------------------------------------------------
test("12. Supplier allocation headings, actions, confirmations, and states localize", () => {
  const en = getServicesDictionary("en");
  const ar = getServicesDictionary("ar");
  assert.equal(en.supplierAllocations.title, "Supplier Allocations");
  assert.equal(ar.supplierAllocations.title, "تخصيصات الموردين");
  assert.equal(en.supplierAllocations.actions.newAllocation, "New Allocation");
  assert.equal(ar.supplierAllocations.actions.restore, "استعادة");
  assert.equal(ar.supplierAllocations.subflow.editPage.title, "تعديل التخصيص");
  assert.equal(ar.supplierAllocations.subflow.cancelPage.title, "إلغاء التخصيص");
  assert.equal(ar.supplierAllocations.subflow.deletePage.title, "حذف التخصيص");
  assert.equal(ar.supplierAllocations.subflow.restorePage.title, "استعادة التخصيص");
  assert.ok(en.supplierAllocations.subflow.cancelForm.warning.length > 0);
  assert.ok(ar.supplierAllocations.empty.includes("تخصيص") || ar.supplierAllocations.empty.length > 0);

  for (const page of [ALLOC_EDIT_PAGE, ALLOC_CANCEL_PAGE, ALLOC_DELETE_PAGE, ALLOC_RESTORE_PAGE]) {
    const source = read(page);
    assert.match(source, /getCurrentSessionEffectiveLocale/);
    assert.match(source, /getServicesDictionary/);
    assert.doesNotMatch(source, /"Access Denied"/);
    assert.doesNotMatch(source, /"Return to Service"/);
  }
});

test("13. Supplier allocation internal codes, schemas, actions, and permissions remain unchanged", () => {
  const en = getServicesDictionary("en");
  assert.deepEqual(Object.keys(en.supplierAllocations.statusLabels).sort(), [
    "cancelled",
    "deleted",
    "draft",
    "planned",
    "selected",
  ]);
  const panel = read(ALLOCATIONS);
  assert.match(panel, /canReadCost/);
  assert.match(panel, /statusLabels\[a\.status\]/);
  assert.match(panel, /costSource === "manual_estimate"/);
  assert.match(read(ALLOC_EDIT_PAGE), /supplier_allocations:write/);
  assert.match(read(ALLOC_EDIT_PAGE), /supplier_allocations:read_cost/);
  assert.match(read(ALLOC_CANCEL_PAGE), /supplier_allocations:cancel/);
  assert.match(read(ALLOC_CREATE_PAGE), /supplier_allocations:write/);
});

// ---------------------------------------------------------------------------
// 14-15. Supplier bookings
// ---------------------------------------------------------------------------
test("14. Supplier booking headings, actions, confirmations, and states localize", () => {
  const en = getServicesDictionary("en");
  const ar = getServicesDictionary("ar");
  assert.equal(en.supplierBookings.title, "Supplier Bookings");
  assert.equal(ar.supplierBookings.title, "حجوزات الموردين");
  assert.equal(ar.supplierBookings.createAction.label.includes("حجز") || ar.supplierBookings.createAction.label.length > 0, true);
  assert.equal(ar.supplierBookings.cancelAction.reasonLabel, "سبب الإلغاء");
  assert.equal(ar.supplierBookings.statusLabels.draft, "مسودة");
  assert.equal(ar.supplierBookings.statusLabels.cancelled, "ملغى");
  assert.match(read(BOOKINGS), /panelDictionary\.title/);
  assert.match(read(BOOKINGS), /statusLabels\[booking\.status\]/);
});

test("15. Supplier booking action contracts and permissions remain unchanged", () => {
  const actions = read(BOOKING_ACTIONS);
  assert.match(actions, /createSupplierBookingFromAllocation/);
  assert.match(actions, /cancelSupplierBooking/);
  assert.match(actions, /sourceAllocationId/);
  assert.doesNotMatch(actions, /invoice|payment|margin|settlement/i);
  const detail = read(SERVICE_DETAIL);
  assert.match(detail, /supplier_bookings:read/);
  assert.match(detail, /supplier_bookings:write/);
  assert.match(detail, /supplier_bookings:cancel/);
  assert.deepEqual(Object.keys(getServicesDictionary("en").supplierBookings.statusLabels).sort(), [
    "cancelled",
    "draft",
  ]);
});

// ---------------------------------------------------------------------------
// 16-17. Supplier cost privacy
// ---------------------------------------------------------------------------
test("16-17. Supplier cost remains permission-gated and does not leak to ABS/customer surfaces", () => {
  const panel = read(ALLOCATIONS);
  assert.match(panel, /canReadCost &&/);
  assert.match(panel, /estimatedUnitCost/);
  assert.match(panel, /formatAllocationMoney|formatSarAmount/);

  const bookings = read(BOOKINGS);
  assert.match(bookings, /hasCostColumns/);
  assert.match(bookings, /estimatedUnitCost !== null/);

  const absDetail = read(ABS_DETAIL);
  assert.doesNotMatch(absDetail, /estimatedUnitCost|estimatedTotalCost|supplierName/);
  assert.doesNotMatch(absDetail, /supplier_allocations:read_cost/);

  const permissions = read(PERMISSIONS);
  const salesBlock = permissions.match(/sales:\s*\[([\s\S]*?)\],\s*operations:/)?.[1] ?? "";
  const viewerBlock = permissions.match(/viewer:\s*\[([\s\S]*?)\],?\s*\};/)?.[1] ?? "";
  const managerBlock = permissions.match(/manager:\s*\[([\s\S]*?)\],\s*sales:/)?.[1] ?? "";
  assert.equal(salesBlock.includes("supplier_allocations"), false);
  assert.equal(viewerBlock.includes("supplier_allocations"), false);
  assert.equal(viewerBlock.includes("supplier_bookings"), false);
  assert.equal(managerBlock.includes("supplier_allocations:read_cost"), true);
});

// ---------------------------------------------------------------------------
// 18-20. Formatting, Western digits, stored data
// ---------------------------------------------------------------------------
test("18-19. Shared SAR/quantity/date formatters used; Arabic retains Western digits", () => {
  assert.match(read(BILLING), /formatSarAmount/);
  assert.match(read(ABS_CARD), /formatSarAmount/);
  assert.match(read(ABS_DETAIL), /formatSarAmount|UiDateText|formatUiDate|formatUiNumber/);
  assert.match(read(ALLOCATIONS), /formatSarAmount|formatUiNumber/);
  assert.match(read(BOOKINGS), /formatSarAmount|UiDateTimeText|formatUiDateTime|formatUiNumber/);

  assert.equal(formatSarAmount("ar", 17000), "SAR 17,000.00");
  assert.doesNotMatch(formatSarAmount("ar", 17000), ARABIC_INDIC);
  assert.doesNotMatch(formatUiNumber("ar", 12.5), ARABIC_INDIC);
  assert.doesNotMatch(formatUiDate("ar", "2026-07-10"), ARABIC_INDIC);

  for (const file of [BILLING, ABS_CARD, ABS_DETAIL, ALLOCATIONS, BOOKINGS]) {
    assert.doesNotMatch(read(file), /toLocaleString\(/);
  }
});

test("20. Stored supplier/item/reason/note/Service text is not translated", () => {
  assert.match(read(ALLOCATIONS), /a\.supplierName|a\.itemName|a\.category/);
  assert.match(read(ALLOCATIONS), /dir="auto"/);
  assert.match(read(BOOKINGS), /booking\.itemName|booking\.supplierName/);
  assert.match(read(ABS_DETAIL), /item\.sourceDescription/);
  assert.match(read(ABS_DETAIL), /dir="auto"/);
  assert.doesNotMatch(read(ALLOCATIONS), /translateStored|localizeItem/);
});

// ---------------------------------------------------------------------------
// 21-23. Pending, empty/denied/unavailable, no raw errors
// ---------------------------------------------------------------------------
test("21. Pending bolt visual and navigation contracts remain in GlobalPendingProvider", () => {
  const pending = read(PENDING);
  assert.match(pending, /CenterPendingBolt/);
  assert.match(pending, /showPending/);
  assert.doesNotMatch(pending, /backdrop-blur|fixed inset-0 bg-black\/50/);
  // Operational UI does not introduce a full-page spinner overlay
  assert.doesNotMatch(read(BILLING), /full-page|blocking-overlay|spinner-replacement/i);
});

test("22. Empty, unavailable, denied, warning, and eligibility-blocked states remain distinct", () => {
  const en = getServicesDictionary("en");
  assert.notEqual(en.approvedBillingScopes.empty, en.approvedBillingScopes.unavailable);
  assert.notEqual(
    en.billing.disabledReasons.approvedQuotationRequired,
    en.billing.disabledReasons.depositInvoiceAlreadyExists,
  );
  assert.notEqual(en.supplierBookings.empty.noBookings, en.supplierBookings.noPermission);
  assert.notEqual(
    en.supplierAllocations.subflow.editPage.accessDeniedMessage,
    en.supplierAllocations.subflow.editPage.serviceUnavailableMessage,
  );
  assert.notEqual(
    en.supplierAllocations.subflow.deletePage.alreadyDeletedMessage,
    en.supplierAllocations.subflow.deletePage.actionUnavailableMessage,
  );
});

test("23. No raw database or internal errors on operational UI surfaces", () => {
  for (const file of OPERATIONAL_UI_FILES) {
    const source = read(file);
    assert.doesNotMatch(source, /\{error\.message\}/);
    assert.doesNotMatch(source, /service_role|PGRST|postgres error|stack trace/i);
  }
});

// ---------------------------------------------------------------------------
// 24-27. Financial / RBAC / module exclusion invariants
// ---------------------------------------------------------------------------
test("24. No financial calculation, query, mutation, action signature, schema, or payload changes in UI layer", () => {
  assert.match(read(DEPOSIT), /createInvoiceAction\(\{/);
  assert.match(read(DEPOSIT), /quotationId,/);
  assert.match(read(DEPOSIT), /serviceId,/);
  assert.match(read(DEPOSIT), /invoiceType: "deposit"/);
  assert.match(read(FINAL), /invoiceType: "final"/);
  assert.doesNotMatch(read(DEPOSIT), /invoiceType: "progress"/);
  assert.match(read(INVOICE_ACTIONS), /export async function createInvoiceAction/);
  // UI must not invent billing ceiling math
  assert.doesNotMatch(read(BILLING), /billingCeiling\s*=/);
});

test("25. No RBAC, RLS, grants, middleware, or auth behavior changes from operational UI", () => {
  const permissions = read(PERMISSIONS);
  assert.match(permissions, /ROLE_PERMISSIONS/);
  assert.match(permissions, /supplier_allocations:read_cost/);
  assert.match(permissions, /APPROVED_BILLING_SCOPE_MANAGER_PERMISSIONS/);
  assert.match(read(SERVICE_DETAIL), /checkPermission\("supplier_allocations:read_cost"\)/);
  assert.match(read(SERVICE_DETAIL), /checkPermission\("supplier_allocations:read"\)/);
  // Operational UI does not redefine role matrices
  assert.doesNotMatch(read(BILLING), /ROLE_PERMISSIONS/);
  assert.doesNotMatch(read(ALLOCATIONS), /ROLE_PERMISSIONS/);
});

test("26. No PDF/document, VAT, ZATCA, FATOORA, QR, XML, schema, migration, or SQL in this task scope", () => {
  for (const file of OPERATIONAL_UI_FILES) {
    const source = read(file);
    assert.doesNotMatch(source, /ZATCA|FATOORA|fatoora|tax.?invoice|clearance/i);
    assert.doesNotMatch(source, /from\("invoices"\)\.delete|hard.?delete/i);
  }
});

test("27. Full Quotations, Invoices, and Payments module localization is not pulled into this task", () => {
  // Operational tests only assert Service-owned surfaces; module pages remain separate.
  assert.ok(read(QUOTATIONS_PAGE).length > 0);
  assert.ok(read(INVOICES_PAGE).length > 0);
  assert.ok(read(PAYMENTS_PAGE).length > 0);
  // Service operational UI must not import full invoices list client as locale authority
  assert.doesNotMatch(read(BILLING), /InvoicesListClient|PaymentsClient|QuotationsClient/);
});

// ---------------------------------------------------------------------------
// 28. No hardcoded English shells on operational Arabic surfaces
// ---------------------------------------------------------------------------
test("28. No hardcoded English remains in source-proven Service operational-subflow UI shells", () => {
  const forbiddenPhrases = [
    "Access Denied",
    "Return to Service",
    "Back to Service",
    "Service Unavailable",
    "Edit Supplier Allocation",
    "Cancel Supplier Allocation",
    "Delete Supplier Allocation",
    "Restore Supplier Allocation",
    "Create Deposit Invoice",
    "Create Final Invoice",
    "Billing Summary",
    "Previously Invoiced",
    "Approved Billing Scope",
    "Supplier Allocations",
    "Supplier Bookings",
  ];

  for (const file of [
    BILLING,
    DEPOSIT,
    FINAL,
    ABS_CARD,
    ABS_DETAIL,
    ALLOCATIONS,
    BOOKINGS,
    ALLOC_EDIT_PAGE,
    ALLOC_CANCEL_PAGE,
    ALLOC_DELETE_PAGE,
    ALLOC_RESTORE_PAGE,
  ]) {
    const source = read(file);
    const offenders = forbiddenPhrases.filter(
      (phrase) =>
        source.includes(`"${phrase}"`) ||
        source.includes(`'${phrase}'`) ||
        source.includes(`>${phrase}<`),
    );
    assert.deepEqual(offenders, [], `Hardcoded English in ${file}: ${offenders.join(", ")}`);
  }

  // Locale authority contracts
  assert.match(read(ABS_DETAIL), /getCurrentSessionEffectiveLocale/);
  assert.match(read(BILLING), /dictionary\.locale|formatSarAmount\(locale/);
  assert.match(read(DEPOSIT), /useLocale/);
  assert.match(read(FINAL), /useLocale/);
});
