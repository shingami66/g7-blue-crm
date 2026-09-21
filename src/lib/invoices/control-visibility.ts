import type { ServiceBillingAuthorityMode } from "./types";
import type { ServiceInvoiceLifecycleDecision } from "./service-invoice-lifecycle";

type InvoiceControlVisibilityInput = {
  canCreateInvoices: boolean;
  authorityMode: ServiceBillingAuthorityMode;
  lifecycleDecision: ServiceInvoiceLifecycleDecision;
  canCreateDepositInvoice: boolean;
  canCreateFlexibleInvoice?: boolean;
  canCreateFinalInvoice: boolean;
  remainingUninvoicedAmount: number | null;
};

export type InvoiceControlVisibility = {
  showInvoiceActions: boolean;
  canCreateDepositInvoice: boolean;
  canCreateFlexibleInvoice?: boolean;
  canCreateFinalInvoice: boolean;
};

export function resolveInvoiceControlVisibility({
  canCreateInvoices,
  authorityMode,
  lifecycleDecision,
  canCreateDepositInvoice,
  canCreateFlexibleInvoice = false,
  canCreateFinalInvoice,
  remainingUninvoicedAmount,
}: InvoiceControlVisibilityInput): InvoiceControlVisibility {
  const hasLiveAuthority =
    authorityMode === "active_abs" || authorityMode === "legacy_quotation";
  const hasLifecycleAction =
    lifecycleDecision.canCreateDeposit ||
    lifecycleDecision.canCreateFinal ||
    (lifecycleDecision.canCreateFlexible && canCreateFlexibleInvoice);
  const showInvoiceActions =
    canCreateInvoices && hasLiveAuthority && hasLifecycleAction;

  const flexibleControl =
    showInvoiceActions &&
    lifecycleDecision.canCreateFlexible &&
    canCreateFlexibleInvoice &&
    remainingUninvoicedAmount != null &&
    remainingUninvoicedAmount > 0;

  return {
    showInvoiceActions,
    canCreateDepositInvoice:
      showInvoiceActions &&
      lifecycleDecision.canCreateDeposit &&
      canCreateDepositInvoice,
    ...(flexibleControl ? { canCreateFlexibleInvoice: true } : {}),
    canCreateFinalInvoice:
      showInvoiceActions &&
      lifecycleDecision.canCreateFinal &&
      canCreateFinalInvoice &&
      remainingUninvoicedAmount != null &&
      remainingUninvoicedAmount > 0,
  };
}
