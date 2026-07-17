import {
  isAuthoritativeZero,
  parseAuthoritativeMoney,
  toAuthoritativeMoneyField,
} from "../invoices/money.ts";
import type {
  ServiceBillingAuthorityMode,
  ServiceBillingState,
} from "../invoices/types.ts";

export type QuotationBillingAuthorityViewModel = {
  authorityMode: ServiceBillingAuthorityMode;
  sourceQuotationTotal: number | null;
  billingCeiling: number | null;
  invoiceExposure: number | null;
  remainingBillable: number | null;
  fullyAllocated: boolean;
  isCurrentQuotationAuthoritySource: boolean;
  serviceBillingHref: string | null;
};

type BuildQuotationBillingAuthorityInput = {
  quotationId: string;
  linkedServiceId: string | null;
  billingState: ServiceBillingState | null;
};

function unavailableAuthority(): QuotationBillingAuthorityViewModel {
  return {
    authorityMode: "unavailable",
    sourceQuotationTotal: null,
    billingCeiling: null,
    invoiceExposure: null,
    remainingBillable: null,
    fullyAllocated: false,
    isCurrentQuotationAuthoritySource: false,
    serviceBillingHref: null,
  };
}

/**
 * Adapts the canonical Service billing result for the Quotation detail page.
 * It deliberately performs no ABS lookup or financial arithmetic of its own.
 */
export function buildQuotationBillingAuthority(
  input: BuildQuotationBillingAuthorityInput,
): QuotationBillingAuthorityViewModel {
  const { quotationId, linkedServiceId, billingState } = input;

  if (
    !linkedServiceId ||
    !billingState ||
    billingState.serviceId !== linkedServiceId
  ) {
    return unavailableAuthority();
  }

  const isCurrentQuotationAuthoritySource =
    billingState.approvedQuotation?.id === quotationId;
  const sourceQuotationTotal = isCurrentQuotationAuthoritySource
    ? parseAuthoritativeMoney(billingState.approvedQuotation?.grandTotal)
    : null;
  const hasLiveAuthority =
    billingState.authorityMode === "active_abs" ||
    billingState.authorityMode === "legacy_quotation";
  const billingCeiling = hasLiveAuthority
    ? parseAuthoritativeMoney(billingState.billingCeiling)
    : null;
  const invoiceExposure = hasLiveAuthority
    ? parseAuthoritativeMoney(billingState.activePriorInvoiceTotal)
    : null;
  const remainingBillable = hasLiveAuthority
    ? parseAuthoritativeMoney(billingState.remainingUninvoicedAmount)
    : null;

  return {
    authorityMode: billingState.authorityMode,
    sourceQuotationTotal,
    billingCeiling,
    invoiceExposure,
    remainingBillable,
    fullyAllocated: isAuthoritativeZero(
      toAuthoritativeMoneyField(remainingBillable),
    ),
    isCurrentQuotationAuthoritySource,
    serviceBillingHref: `/services/${linkedServiceId}`,
  };
}
