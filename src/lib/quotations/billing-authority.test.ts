import assert from "node:assert/strict";
import test from "node:test";
import type { ServiceBillingState } from "../invoices/types.ts";
import { buildQuotationBillingAuthority } from "./billing-authority.ts";

const QUOTATION_ID = "quotation-1";
const SERVICE_ID = "service-1";

function billingState(
  overrides: Partial<ServiceBillingState> = {},
): ServiceBillingState {
  return {
    serviceId: SERVICE_ID,
    authorityMode: "legacy_quotation",
    approvedQuotation: {
      id: QUOTATION_ID,
      quotationNumber: "QT-2026-9002",
      status: "approved",
      grandTotal: 100,
    },
    billingCeiling: 100,
    activeBillingScopeId: null,
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

test("active ABS keeps quotation 100 as reference and scope 40 as authority", () => {
  const view = buildQuotationBillingAuthority({
    quotationId: QUOTATION_ID,
    linkedServiceId: SERVICE_ID,
    billingState: billingState({
      authorityMode: "active_abs",
      billingCeiling: 40,
      activeBillingScopeId: "scope-1",
      activePriorInvoiceTotal: 40,
      remainingUninvoicedAmount: 0,
      canCreateDepositInvoice: false,
      canCreateFinalInvoice: false,
    }),
  });

  assert.equal(view.authorityMode, "active_abs");
  assert.equal(view.sourceQuotationTotal, 100);
  assert.equal(view.billingCeiling, 40);
  assert.equal(view.invoiceExposure, 40);
  assert.equal(view.remainingBillable, 0);
  assert.equal(view.fullyAllocated, true);
  assert.equal(view.serviceBillingHref, `/services/${SERVICE_ID}`);
});

test("historical ABS blocks quotation fallback and exposes no live balance", () => {
  const view = buildQuotationBillingAuthority({
    quotationId: QUOTATION_ID,
    linkedServiceId: SERVICE_ID,
    billingState: billingState({
      authorityMode: "historical_abs_only",
      billingCeiling: null,
      activePriorInvoiceTotal: 0,
      remainingUninvoicedAmount: null,
      canCreateDepositInvoice: false,
      canCreateFinalInvoice: false,
      disabledReasons: ["abs_historical_authority_no_active"],
    }),
  });

  assert.equal(view.authorityMode, "historical_abs_only");
  assert.equal(view.sourceQuotationTotal, 100);
  assert.equal(view.billingCeiling, null);
  assert.equal(view.invoiceExposure, null);
  assert.equal(view.remainingBillable, null);
  assert.equal(view.fullyAllocated, false);
});

test("proven zero ABS history preserves legacy quotation authority", () => {
  const view = buildQuotationBillingAuthority({
    quotationId: QUOTATION_ID,
    linkedServiceId: SERVICE_ID,
    billingState: billingState(),
  });

  assert.equal(view.authorityMode, "legacy_quotation");
  assert.equal(view.sourceQuotationTotal, 100);
  assert.equal(view.billingCeiling, 100);
  assert.equal(view.invoiceExposure, 0);
  assert.equal(view.remainingBillable, 100);
  assert.equal(view.fullyAllocated, false);
});

test("unavailable authority never fabricates zero", () => {
  const view = buildQuotationBillingAuthority({
    quotationId: QUOTATION_ID,
    linkedServiceId: SERVICE_ID,
    billingState: billingState({
      authorityMode: "unavailable",
      approvedQuotation: null,
      billingCeiling: null,
      activePriorInvoiceTotal: null,
      remainingUninvoicedAmount: null,
      canCreateDepositInvoice: false,
      canCreateFinalInvoice: false,
      disabledReasons: ["billing_state_unavailable"],
    }),
  });

  assert.equal(view.authorityMode, "unavailable");
  assert.equal(view.sourceQuotationTotal, null);
  assert.equal(view.billingCeiling, null);
  assert.equal(view.invoiceExposure, null);
  assert.equal(view.remainingBillable, null);
  assert.equal(view.fullyAllocated, false);
});

test("missing or mismatched linked Service evidence fails closed", () => {
  for (const input of [
    {
      quotationId: QUOTATION_ID,
      linkedServiceId: null,
      billingState: billingState(),
    },
    {
      quotationId: QUOTATION_ID,
      linkedServiceId: SERVICE_ID,
      billingState: billingState({ serviceId: "different-service" }),
    },
    {
      quotationId: QUOTATION_ID,
      linkedServiceId: SERVICE_ID,
      billingState: null,
    },
  ]) {
    const view = buildQuotationBillingAuthority(input);
    assert.equal(view.authorityMode, "unavailable");
    assert.equal(view.billingCeiling, null);
    assert.equal(view.remainingBillable, null);
    assert.equal(view.serviceBillingHref, null);
  }
});

test("a different Quotation cannot present itself as the authority source", () => {
  const view = buildQuotationBillingAuthority({
    quotationId: "older-quotation",
    linkedServiceId: SERVICE_ID,
    billingState: billingState(),
  });

  assert.equal(view.authorityMode, "legacy_quotation");
  assert.equal(view.isCurrentQuotationAuthoritySource, false);
  assert.equal(view.sourceQuotationTotal, null);
  assert.equal(view.billingCeiling, 100);
  assert.equal(view.serviceBillingHref, `/services/${SERVICE_ID}`);
});
