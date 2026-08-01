import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  getEligibleInvoiceServiceFromState,
  getInvoiceSelectorResults,
  getInvoiceServiceHref,
  resolveInvoiceChooserLoadStatus,
  sortEligibleInvoiceServices,
  type EligibleInvoiceService,
} from "./eligible-service-selector.ts";
import { applyApplicableServiceInvoiceExposurePredicate } from "./exposure.ts";
import type { ServiceBillingState } from "./types.ts";
import type { Service, ServiceStatus } from "../../types/service.ts";

const serviceQueriesSource = readFileSync(
  new URL("../services/queries.ts", import.meta.url),
  "utf8",
);
const selectorContractSource = readFileSync(
  new URL("./eligible-service-selector.ts", import.meta.url),
  "utf8",
);
const invoicePageSource = readFileSync(
  new URL("../../app/(dashboard)/invoices/page.tsx", import.meta.url),
  "utf8",
);
const invoiceClientSource = readFileSync(
  new URL("../../app/(dashboard)/invoices/InvoicesListClient.tsx", import.meta.url),
  "utf8",
);
const invoiceActionsSource = readFileSync(
  new URL("../../app/(dashboard)/invoices/actions.ts", import.meta.url),
  "utf8",
);
const selectorSource = readFileSync(
  new URL(
    "../../app/(dashboard)/invoices/EligibleInvoiceServiceSelector.tsx",
    import.meta.url,
  ),
  "utf8",
);
const chooserSource = readFileSync(
  new URL("../../app/(dashboard)/invoices/CreateInvoiceChooser.tsx", import.meta.url),
  "utf8",
);
const servicePageSource = readFileSync(
  new URL("../../app/(dashboard)/services/[id]/page.tsx", import.meta.url),
  "utf8",
);
const billingPanelSource = readFileSync(
  new URL("../../app/(dashboard)/services/[id]/BillingPanel.tsx", import.meta.url),
  "utf8",
);
const dictionarySource = readFileSync(
  new URL("../i18n/dictionaries/invoices.ts", import.meta.url),
  "utf8",
);

test("eligible Service query derives Deposit and Final capabilities from existing authority helpers", () => {
  assert.match(serviceQueriesSource, /requirePermission\(INVOICE_PERMISSIONS\.write\)/);
  assert.match(serviceQueriesSource, /requirePermission\("services:read"\)/);
  assert.match(serviceQueriesSource, /getServiceBillingState\(service\.id\)/);
  assert.match(serviceQueriesSource, /getEligibleInvoiceServiceFromState/);
  assert.match(
    serviceQueriesSource,
    /const billingState = await getServiceBillingState\(service\.id\)/,
  );
  assert.match(
    serviceQueriesSource,
    /getEligibleInvoiceServiceFromState\(\s*service,\s*billingState,\s*true/,
  );
  assert.match(serviceQueriesSource, /service\.canCreateDeposit \|\| service\.canCreateFinal/);
  assert.doesNotMatch(serviceQueriesSource, /payments:read|quotations:read/);
  assert.match(serviceQueriesSource, /status: "error", services: \[\]/);
  assert.match(serviceQueriesSource, /resolveInvoiceChooserLoadStatus/);
});

test("eligible Service query has deterministic ordering and returns no financial or customer mutation DTO", () => {
  const projectionSource = selectorContractSource.slice(
    selectorContractSource.indexOf("export type EligibleInvoiceService"),
    selectorContractSource.indexOf("export const INVOICE_SELECTOR_ITEMS_PER_PAGE"),
  );

  assert.match(selectorContractSource, /compareStableText\(left\.serviceNumber, right\.serviceNumber\)/);
  assert.match(selectorContractSource, /compareStableText\(left\.serviceId, right\.serviceId\)/);
  assert.match(projectionSource, /customerDisplay: string/);
  assert.doesNotMatch(projectionSource, /requestedAmount|grandTotal|vatAmount|discount|lineItems|customerId:/);
});

test("global list preserves invoices read and exposes only one permission-gated Create Invoice CTA", () => {
  assert.match(invoicePageSource, /requirePermission\("invoices:read"\)/);
  assert.match(invoicePageSource, /checkPermission\(INVOICE_PERMISSIONS\.write\)/);
  assert.match(invoicePageSource, /checkPermission\("services:read"\)/);
  assert.match(invoiceClientSource, /canCreateInvoiceChooser &&/);
  assert.match(invoiceClientSource, /invoiceChooser\.createInvoice/);
  assert.match(invoiceClientSource, /setEligibleServicesLoadStatus\("loading"\)/);
  assert.match(invoiceClientSource, /loadEligibleInvoiceServicesAction\(\)/);
  assert.match(invoiceActionsSource, /"use server"/);
  assert.match(
    invoiceActionsSource,
    /return getEligibleServicesForInvoiceChooser\(\)/,
  );
  assert.equal((invoiceClientSource.match(/invoiceChooser\.createInvoice/g) ?? []).length, 1);
});

test("chooser remains two-step, accessible, and navigation-only", () => {
  assert.match(chooserSource, /chooseMode\("deposit"\)/);
  assert.match(chooserSource, /chooseMode\("final"\)/);
  assert.match(chooserSource, /role="dialog"/);
  assert.match(chooserSource, /aria-modal="true"/);
  assert.match(chooserSource, /event\.key === "Escape"/);
  assert.match(chooserSource, /searchRef\.current/);
  assert.match(chooserSource, /opener\?\.focus\(\)/);
  assert.match(chooserSource, /document\.body\.style\.overflow = "hidden"/);
  assert.match(chooserSource, /dialogRef\.current\?\.contains\(document\.activeElement\)/);
  assert.match(selectorContractSource, /encodeURIComponent\(serviceId\)/);
  assert.match(selectorContractSource, /billing\?intent=\$\{mode\}/);
  assert.match(selectorSource, /setCurrentPage\(1\)/);
  assert.match(selectorSource, /noEligibleDeposit/);
  assert.match(selectorSource, /noEligibleFinal/);
  assert.match(selectorSource, /noMatchingDeposit/);
  assert.match(selectorSource, /noMatchingFinal/);
  assert.match(selectorSource, /role="status"/);
  assert.match(selectorSource, /aria-live="polite"/);
  assert.match(selectorSource, /loadStatus === "error"/);
  assert.match(selectorSource, /loadStatus === "partial"/);
  assert.match(selectorSource, /loadStatus === "loading"/);
  assert.doesNotMatch(
    `${chooserSource}\n${selectorSource}`,
    /createInvoiceAction|create_invoice_atomic|requestedAmount|customerId/,
  );
});

test("Invoice chooser keeps locale-aware desktop alignment and a fixed Select action", () => {
  assert.match(chooserSource, /max-w-5xl/);
  assert.match(selectorSource, /const DESKTOP_COLUMN_ORDER =/);
  assert.match(selectorSource, />Service \/ الخدمة<\/div>/);
  assert.match(selectorSource, /en:\s*\{[\s\S]*service: "order-1"[\s\S]*select: "order-6"/);
  assert.match(selectorSource, /ar:\s*\{[\s\S]*service: "order-6"[\s\S]*select: "order-1"/);
  assert.match(selectorSource, /<div dir="ltr" className="hidden grid-cols-12/);
  assert.match(selectorSource, /<div dir="ltr" className="hidden min-h-\[58px\]/);
  assert.match(selectorSource, /dir="auto" className="inline-block max-w-full/);
  assert.match(selectorSource, /dir="ltr" className="mb-0\.5 block truncate/);
  assert.match(selectorSource, /dir="ltr" className="block truncate text-xs/);
  assert.match(selectorSource, /col-span-2 \$\{desktopColumnOrder\.select\} min-w-\[6\.5rem\]/);
  assert.match(selectorSource, /min-w-\[5rem\].*whitespace-nowrap/);
  assert.match(selectorSource, /const selectAlignment = dictionary\.locale === "ar"/);
});

const workspaceClientSource = readFileSync(
  new URL(
    "../../app/(dashboard)/services/[id]/billing/ServiceBillingWorkspaceClient.tsx",
    import.meta.url,
  ),
  "utf8",
);
const costMarginSource = readFileSync(
  new URL(
    "../../app/(dashboard)/services/[id]/billing/ServiceCostMarginSection.tsx",
    import.meta.url,
  ),
  "utf8",
);
const servicesDictSource = readFileSync(
  new URL("../i18n/dictionaries/services.ts", import.meta.url),
  "utf8",
);

test("Service Detail redirects old invoiceAction deep links and renders ServiceBillingSummaryCard", () => {
  assert.match(servicePageSource, /requestedInvoiceAction === "deposit"/);
  assert.match(servicePageSource, /requestedInvoiceAction === "final"/);
  assert.match(servicePageSource, /redirect\(`/);
  assert.match(servicePageSource, /billing\?intent=/);
  assert.match(servicePageSource, /ServiceBillingSummaryCard/);
  assert.match(billingPanelSource, /focus\(\{ preventScroll: true \}\)/);
  assert.match(billingPanelSource, /querySelector<HTMLElement>/);
  assert.match(billingPanelSource, /data-invoice-action="deposit"/);
  assert.match(billingPanelSource, /data-invoice-action="final"/);
  assert.match(billingPanelSource, /invoiceControls\.showInvoiceActions/);
});

test("Service Billing Workspace provides intent-driven actions and mode switching links", () => {
  assert.match(billingPanelSource, /invoiceActionIntent === "deposit"/);
  assert.match(billingPanelSource, /invoiceActionIntent === "final"/);
  assert.match(billingPanelSource, /panelTitle/);
  assert.match(billingPanelSource, /switchToFinal/);
  assert.match(billingPanelSource, /switchToDeposit/);
  assert.match(billingPanelSource, /billing\?intent=final/);
  assert.match(billingPanelSource, /billing\?intent=deposit/);
  assert.match(workspaceClientSource, /workspacePageTitle/);
  assert.match(workspaceClientSource, /backToInvoices/);
  assert.match(workspaceClientSource, /viewFullService/);
  assert.match(workspaceClientSource, /flex min-w-0 flex-col items-start gap-1/);
  assert.match(workspaceClientSource, /w-fit max-w-full text-start/);
  assert.match(workspaceClientSource, /dir="auto"\s+className="[^"]*line-clamp-2[^"]*text-start/);
  assert.match(
    workspaceClientSource,
    /authorityMode === "legacy_quotation"\s*\?\s*\(billingState\.approvedQuotation\?\.\w+ \?\? null\)\s*:\s*null/,
  );
  assert.match(costMarginSource, /estimatedGrossMargin/);
  assert.match(costMarginSource, /return null;/);
});

test("Invoice chooser dictionaries cover distinct English and Arabic Deposit and Final states", () => {
  assert.match(dictionarySource, /createInvoice: "Create Invoice"/);
  assert.match(dictionarySource, /createInvoice: "إنشاء فاتورة"/);
  assert.match(dictionarySource, /noEligibleDeposit/);
  assert.match(dictionarySource, /noEligibleFinal/);
  assert.match(dictionarySource, /noMatchingDeposit/);
  assert.match(dictionarySource, /noMatchingFinal/);
  assert.match(dictionarySource, /selectDepositServiceTitle/);
  assert.match(dictionarySource, /selectFinalServiceTitle/);
  assert.match(dictionarySource, /chooseDepositService/);
  assert.match(dictionarySource, /chooseFinalService/);
  assert.match(servicesDictSource, /costMarginTitle: "Estimated Cost & Margin"/);
  assert.match(servicesDictSource, /costMarginTitle: "التكلفة والهامش التقديري"/);
  assert.match(servicesDictSource, /estimatedGrossMargin: "Estimated Gross Margin"/);
  assert.match(servicesDictSource, /estimatedGrossMargin: "هامش الربح الإجمالي التقديري"/);
  assert.match(servicesDictSource, /priorInvoiced: "Invoiced to date"/);
  assert.match(servicesDictSource, /priorInvoiced: "المفوتر حتى الآن"/);
  assert.match(servicesDictSource, /amountSummary: "The final invoice amount is calculated automatically from the remaining billable amount."/);
  assert.match(servicesDictSource, /amountSummary: "يُحتسب مبلغ الفاتورة النهائية تلقائياً من المبلغ المتبقي القابل للفوترة."/);
});

function serviceFixture(
  status: ServiceStatus,
  overrides: Partial<Service> = {},
): Service {
  return {
    id: "service-1",
    serviceNumber: "SVC-2026-0001",
    customerId: "customer-1",
    customer: {
      company: "Blue Events",
      contact: "Mona",
      customerNumber: "CUS-1",
    },
    serviceTitle: "Annual Conference",
    eventName: "Launch Night",
    eventType: "Corporate",
    eventStartDate: "2026-09-10",
    eventEndDate: null,
    eventLocation: "Riyadh",
    description: null,
    estimatedBudget: null,
    status,
    salesOwnerId: null,
    cancellationReason: null,
    deletedAt: null,
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-01T00:00:00.000Z",
    createdBy: null,
    updatedBy: null,
    ...overrides,
  };
}

function billingFixture(
  overrides: Partial<ServiceBillingState> = {},
): ServiceBillingState {
  return {
    serviceId: "service-1",
    authorityMode: "active_abs",
    approvedQuotation: {
      id: "quotation-1",
      quotationNumber: "QT-2026-0001",
      status: "approved",
      grandTotal: 100,
    },
    billingCeiling: 100,
    activeBillingScopeId: "scope-1",
    depositInvoice: null,
    finalInvoice: null,
    activePriorInvoiceTotal: 0,
    remainingUninvoicedAmount: 100,
    canCreateDepositInvoice: true,
    canCreateFinalInvoice: true,
    disabledReasons: [],
    ...overrides,
  };
}

function eligibleFixture(
  id: string,
  capabilities: { deposit: boolean; final: boolean },
  overrides: Partial<EligibleInvoiceService> = {},
): EligibleInvoiceService {
  return {
    serviceId: id,
    serviceNumber: `SVC-${id}`,
    serviceTitle: `Service ${id}`,
    customerDisplay: `Customer ${id}`,
    status: "Approved",
    eventName: `Event ${id}`,
    eventStartDate: "2026-09-10",
    eventLocation: "Riyadh",
    canCreateDeposit: capabilities.deposit,
    canCreateFinal: capabilities.final,
    ...overrides,
  };
}

for (const lifecycleCase of [
  { status: "Inquiry", deposit: true, final: true },
  { status: "Quoted", deposit: true, final: true },
  { status: "Approved", deposit: true, final: true },
  { status: "Deposit Paid", deposit: false, final: true },
  { status: "In Progress", deposit: false, final: true },
  { status: "Completed", deposit: false, final: false },
  { status: "Cancelled", deposit: false, final: false },
] as const) {
  test(`chooser projection applies the shared lifecycle matrix for ${lifecycleCase.status}`, () => {
    const result = getEligibleInvoiceServiceFromState(
      serviceFixture(lifecycleCase.status),
      billingFixture(),
      true,
    );

    assert.equal(result.canCreateDeposit, lifecycleCase.deposit);
    assert.equal(result.canCreateFinal, lifecycleCase.final);
  });
}

test("chooser projection fails closed for permission denial and deleted Services", () => {
  const permissionDenied = getEligibleInvoiceServiceFromState(
    serviceFixture("Approved"),
    billingFixture(),
    false,
  );
  const deleted = getEligibleInvoiceServiceFromState(
    serviceFixture("Approved", {
      deletedAt: "2026-07-30T00:00:00.000Z",
    }),
    billingFixture(),
    true,
  );

  assert.equal(permissionDenied.canCreateDeposit, false);
  assert.equal(permissionDenied.canCreateFinal, false);
  assert.equal(deleted.canCreateDeposit, false);
  assert.equal(deleted.canCreateFinal, false);
});

test("Deposit and Final blockers remain independent and Final has no Deposit prerequisite", () => {
  const activeDeposit = getEligibleInvoiceServiceFromState(
    serviceFixture("Approved"),
    billingFixture({
      depositInvoice: {
        id: "invoice-deposit",
        invoiceNumber: "INV-1",
        invoiceType: "deposit",
        status: "draft",
        amount: 20,
      },
      activePriorInvoiceTotal: 20,
      remainingUninvoicedAmount: 80,
      canCreateDepositInvoice: false,
      canCreateFinalInvoice: true,
      disabledReasons: ["deposit_invoice_already_exists"],
    }),
    true,
  );
  const activeFinal = getEligibleInvoiceServiceFromState(
    serviceFixture("Approved"),
    billingFixture({
      finalInvoice: {
        id: "invoice-final",
        invoiceNumber: "INV-2",
        invoiceType: "final",
        status: "draft",
        amount: 100,
      },
      remainingUninvoicedAmount: 0,
      canCreateDepositInvoice: false,
      canCreateFinalInvoice: false,
      disabledReasons: ["final_invoice_already_exists"],
    }),
    true,
  );
  const noDepositHistory = getEligibleInvoiceServiceFromState(
    serviceFixture("In Progress"),
    billingFixture({
      depositInvoice: null,
      activePriorInvoiceTotal: 0,
      remainingUninvoicedAmount: 100,
      canCreateDepositInvoice: true,
      canCreateFinalInvoice: true,
    }),
    true,
  );

  assert.deepEqual(
    [activeDeposit.canCreateDeposit, activeDeposit.canCreateFinal],
    [false, true],
  );
  assert.deepEqual(
    [activeFinal.canCreateDeposit, activeFinal.canCreateFinal],
    [false, false],
  );
  assert.deepEqual(
    [noDepositHistory.canCreateDeposit, noDepositHistory.canCreateFinal],
    [false, true],
  );
});

test("Final eligibility requires positive server-derived remaining balance", () => {
  const zeroRemaining = getEligibleInvoiceServiceFromState(
    serviceFixture("Approved"),
    billingFixture({
      remainingUninvoicedAmount: 0,
      canCreateFinalInvoice: true,
    }),
    true,
  );
  const unavailableRemaining = getEligibleInvoiceServiceFromState(
    serviceFixture("Approved"),
    billingFixture({
      remainingUninvoicedAmount: null,
      canCreateFinalInvoice: true,
    }),
    true,
  );

  assert.equal(zeroRemaining.canCreateFinal, false);
  assert.equal(unavailableRemaining.canCreateFinal, false);
});

test("eligibility loading reports partial evaluation without fabricating an empty result", () => {
  assert.equal(resolveInvoiceChooserLoadStatus([billingFixture()]), "ready");
  assert.equal(
    resolveInvoiceChooserLoadStatus([
      billingFixture(),
      billingFixture({ authorityMode: "unavailable" }),
    ]),
    "partial",
  );
  assert.equal(
    resolveInvoiceChooserLoadStatus([
      billingFixture({
        disabledReasons: ["invoice_exposure_unavailable"],
      }),
    ]),
    "partial",
  );
});

for (const authorityMode of [
  "historical_abs_only",
  "no_authority",
  "unavailable",
] as const) {
  test(`chooser projection fails closed for ${authorityMode} authority`, () => {
    const result = getEligibleInvoiceServiceFromState(
      serviceFixture("Approved"),
      billingFixture({ authorityMode }),
      true,
    );

    assert.equal(result.canCreateDeposit, false);
    assert.equal(result.canCreateFinal, false);
  });
}

test("voided, cancelled, and deleted invoices stay excluded from active exposure", () => {
  const filters: Array<[string, string, unknown, unknown?]> = [];
  const query = {
    eq(column: string, value: unknown) {
      filters.push(["eq", column, value]);
      return this;
    },
    is(column: string, value: unknown) {
      filters.push(["is", column, value]);
      return this;
    },
    not(column: string, operator: string, value: unknown) {
      filters.push(["not", column, operator, value]);
      return this;
    },
  };

  assert.equal(
    applyApplicableServiceInvoiceExposurePredicate(query, "service-1"),
    query,
  );
  assert.deepEqual(filters, [
    ["eq", "service_id", "service-1"],
    ["not", "is_deleted", "is", true],
    ["is", "voided_at", null],
    ["not", "status", "in", '("voided","cancelled")'],
  ]);
});

test("selector sorting is stable by Service number then Service ID", () => {
  const sorted = sortEligibleInvoiceServices([
    eligibleFixture("b", { deposit: true, final: true }, {
      serviceNumber: "SVC-2",
    }),
    eligibleFixture("z", { deposit: true, final: true }, {
      serviceNumber: "SVC-1",
    }),
    eligibleFixture("a", { deposit: true, final: true }, {
      serviceNumber: "SVC-2",
    }),
  ]);

  assert.deepEqual(
    sorted.map((service) => service.serviceId),
    ["z", "a", "b"],
  );
});

test("selector filtering is type-specific and searches only display fields", () => {
  const services = [
    eligibleFixture("deposit", { deposit: true, final: false }, {
      customerDisplay: "شركة النور",
    }),
    eligibleFixture("final", { deposit: false, final: true }, {
      eventLocation: "Jeddah",
    }),
    eligibleFixture("both", { deposit: true, final: true }, {
      serviceNumber: "SVC-SHARED",
    }),
  ];

  assert.deepEqual(
    getInvoiceSelectorResults({
      services,
      mode: "deposit",
      search: "",
      requestedPage: 1,
    }).filteredServices.map((service) => service.serviceId),
    ["deposit", "both"],
  );
  assert.deepEqual(
    getInvoiceSelectorResults({
      services,
      mode: "final",
      search: "jEdDaH",
      requestedPage: 1,
    }).filteredServices.map((service) => service.serviceId),
    ["final"],
  );
  assert.deepEqual(
    getInvoiceSelectorResults({
      services,
      mode: "deposit",
      search: "النور",
      requestedPage: 1,
    }).filteredServices.map((service) => service.serviceId),
    ["deposit"],
  );
});

test("selector pagination clamps pages and returns deterministic slices", () => {
  const services = Array.from({ length: 12 }, (_, index) =>
    eligibleFixture(String(index + 1).padStart(2, "0"), {
      deposit: true,
      final: false,
    }),
  );
  const result = getInvoiceSelectorResults({
    services,
    mode: "deposit",
    search: "",
    requestedPage: 99,
    itemsPerPage: 5,
  });

  assert.equal(result.page, 3);
  assert.equal(result.totalPages, 3);
  assert.deepEqual(
    result.paginatedServices.map((service) => service.serviceId),
    ["11", "12"],
  );
});

test("navigation contract encodes only Service ID and invoice action intent", () => {
  assert.equal(
    getInvoiceServiceHref("service/with spaces", "deposit"),
    "/services/service%2Fwith%20spaces/billing?intent=deposit",
  );
  assert.equal(
    getInvoiceServiceHref("service/with spaces", "final"),
    "/services/service%2Fwith%20spaces/billing?intent=final",
  );
});
