import type { ServiceBillingAuthorityMode } from "./types";
import type { ServiceInvoiceLifecycleDecision } from "./service-invoice-lifecycle";

type InvoiceControlVisibilityInput = {
  canCreateInvoices: boolean;
  authorityMode: ServiceBillingAuthorityMode;
  lifecycleDecision: ServiceInvoiceLifecycleDecision;
  canCreateDepositInvoice: boolean;
  canCreateFinalInvoice: boolean;
  remainingUninvoicedAmount: number | null;
};

export type InvoiceControlVisibility = {
  showInvoiceActions: boolean;
  canCreateDepositInvoice: boolean;
  canCreateFinalInvoice: boolean;
};

export function resolveInvoiceControlVisibility({
  canCreateInvoices,
  authorityMode,
  lifecycleDecision,
  canCreateDepositInvoice,
  canCreateFinalInvoice,
  remainingUninvoicedAmount,
}: InvoiceControlVisibilityInput): InvoiceControlVisibility {
  const hasLiveAuthority =
    authorityMode === "active_abs" || authorityMode === "legacy_quotation";
  const hasLifecycleAction =
    lifecycleDecision.canCreateDeposit || lifecycleDecision.canCreateFinal;
  const showInvoiceActions =
    canCreateInvoices && hasLiveAuthority && hasLifecycleAction;

  return {
    showInvoiceActions,
    canCreateDepositInvoice:
      showInvoiceActions &&
      lifecycleDecision.canCreateDeposit &&
      canCreateDepositInvoice,
    canCreateFinalInvoice:
      showInvoiceActions &&
      lifecycleDecision.canCreateFinal &&
      canCreateFinalInvoice &&
      remainingUninvoicedAmount != null &&
      remainingUninvoicedAmount > 0,
  };
}
