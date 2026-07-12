import type { ServiceBillingState } from "@/lib/invoices/types";
import { isolateBidiText } from "@/lib/i18n/bidi";
import type { ServicesDictionary } from "@/lib/i18n/dictionaries/services";
import { formatSarAmount } from "@/lib/i18n/formatting";
import { CreateDepositInvoiceAction } from "./CreateDepositInvoiceAction";
import { CreateFinalInvoiceAction } from "./CreateFinalInvoiceAction";

export default function BillingPanel({
  billingState,
  dictionary,
}: {
  billingState: ServiceBillingState;
  dictionary: ServicesDictionary;
}) {
  const billingDictionary = dictionary.billing;
  const locale = dictionary.locale;

  const formatCurrency = (value: number) => formatSarAmount(locale, value);

  const formatStatus = (status: string) => {
    if (status === "sent") return billingDictionary.invoiceStatuses.sent;
    if (status === "draft") return billingDictionary.invoiceStatuses.draft;
    if (status === "paid") return billingDictionary.invoiceStatuses.paid;
    if (status === "partial") return billingDictionary.invoiceStatuses.partial;
    if (status === "overdue") return billingDictionary.invoiceStatuses.overdue;
    if (status === "cancelled") return billingDictionary.invoiceStatuses.cancelled;
    if (status === "voided") return billingDictionary.invoiceStatuses.voided;
    return isolateBidiText(status.charAt(0).toUpperCase() + status.slice(1));
  };

  const disabledReasonLabels: Record<string, string> = {
    approved_quotation_required: billingDictionary.disabledReasons.approvedQuotationRequired,
    billing_state_unavailable: billingDictionary.disabledReasons.billingStateUnavailable,
    duplicate_active_deposit_invoices: billingDictionary.disabledReasons.duplicateActiveDepositInvoices,
    duplicate_active_final_invoices: billingDictionary.disabledReasons.duplicateActiveFinalInvoices,
    missing_service_id: billingDictionary.disabledReasons.missingServiceId,
    deposit_invoice_already_exists: billingDictionary.disabledReasons.depositInvoiceAlreadyExists,
    final_invoice_already_exists: billingDictionary.disabledReasons.finalInvoiceAlreadyExists,
    prior_invoices_exceed_quotation_total: billingDictionary.disabledReasons.priorInvoicesExceedQuotationTotal,
    quotation_not_approved: billingDictionary.disabledReasons.quotationNotApproved,
    quotation_service_mismatch: billingDictionary.disabledReasons.quotationServiceMismatch,
  };

  const {
    approvedQuotation,
    depositInvoice,
    finalInvoice,
    activePriorInvoiceTotal,
    remainingUninvoicedAmount,
    canCreateDepositInvoice,
    canCreateFinalInvoice,
    disabledReasons,
  } = billingState;

  return (
    <section className="bg-surface-container-lowest border border-surface-variant rounded-xl overflow-hidden">
      <div className="px-6 py-4 border-b border-surface-variant bg-surface-bright">
        <h3 className="font-semibold text-primary">{billingDictionary.title}</h3>
      </div>
      
      <div className="p-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <div className="flex flex-col gap-2">
          <h4 className="text-[13px] font-semibold text-on-surface uppercase tracking-wide">{billingDictionary.cards.approvedQuotation}</h4>
          {approvedQuotation ? (
            <div className="bg-surface p-4 rounded-lg border border-outline-variant">
              <div dir="ltr" className="font-mono text-primary font-medium mb-1">{isolateBidiText(approvedQuotation.quotationNumber)}</div>
              <div dir="ltr" className="text-on-surface font-semibold text-lg">{formatCurrency(approvedQuotation.grandTotal)}</div>
              <div className="text-[12px] text-on-surface-variant mt-1">{dictionary.quotationStatuses[approvedQuotation.status]}</div>
            </div>
          ) : (
            <div className="bg-surface p-4 rounded-lg border border-outline-variant border-dashed text-on-surface-variant text-[14px]">
              {billingDictionary.cards.noApprovedQuotationYet}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <h4 className="text-[13px] font-semibold text-on-surface uppercase tracking-wide">{billingDictionary.cards.depositInvoice}</h4>
          {depositInvoice ? (
            <div className="bg-surface p-4 rounded-lg border border-outline-variant">
              <div dir="ltr" className="font-mono text-primary font-medium mb-1">{isolateBidiText(depositInvoice.invoiceNumber)}</div>
              <div dir="ltr" className="text-on-surface font-semibold text-lg">{formatCurrency(depositInvoice.amount)}</div>
              <div className="text-[12px] text-on-surface-variant mt-1">{formatStatus(depositInvoice.status)}</div>
            </div>
          ) : (
            <div className="bg-surface p-4 rounded-lg border border-outline-variant border-dashed text-on-surface-variant text-[14px]">
              {billingDictionary.cards.noActiveDepositInvoice}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <h4 className="text-[13px] font-semibold text-on-surface uppercase tracking-wide">{billingDictionary.cards.finalInvoice}</h4>
          {finalInvoice ? (
            <div className="bg-surface p-4 rounded-lg border border-outline-variant">
              <div dir="ltr" className="font-mono text-primary font-medium mb-1">{isolateBidiText(finalInvoice.invoiceNumber)}</div>
              <div dir="ltr" className="text-on-surface font-semibold text-lg">{formatCurrency(finalInvoice.amount)}</div>
              <div className="text-[12px] text-on-surface-variant mt-1">{formatStatus(finalInvoice.status)}</div>
            </div>
          ) : (
            <div className="bg-surface p-4 rounded-lg border border-outline-variant border-dashed text-on-surface-variant text-[14px]">
              {billingDictionary.cards.noActiveFinalInvoice}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <h4 className="text-[13px] font-semibold text-on-surface uppercase tracking-wide">{billingDictionary.cards.billingCalculation}</h4>
          <div className="bg-surface p-4 rounded-lg border border-outline-variant flex flex-col gap-3">
            <div className="flex justify-between items-center text-[14px]">
              <span className="text-on-surface-variant">{billingDictionary.cards.priorInvoiced}</span>
              <span dir="ltr" className="font-medium text-on-surface">{formatCurrency(activePriorInvoiceTotal)}</span>
            </div>
            <div className="flex justify-between items-center text-[14px] pt-2 border-t border-outline-variant">
              <span className="text-on-surface-variant">{billingDictionary.cards.remaining}</span>
              <span dir="ltr" className={`font-semibold ${remainingUninvoicedAmount < 0 ? 'text-red-600' : 'text-primary'}`}>
                {formatCurrency(remainingUninvoicedAmount)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 py-5 bg-surface border-t border-surface-variant flex flex-col gap-4">
        <h4 className="text-[13px] font-semibold text-on-surface uppercase tracking-wide">{billingDictionary.status.title}</h4>
        
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <span className="text-[14px] text-on-surface-variant">{billingDictionary.status.depositInvoice}:</span>
            <span className={`px-2 py-1 rounded text-[12px] font-medium ${depositInvoice ? 'bg-green-100 text-green-800' : (canCreateDepositInvoice ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-600')}`}>
              {depositInvoice ? billingDictionary.status.created : (canCreateDepositInvoice ? billingDictionary.status.available : billingDictionary.status.notAvailable)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[14px] text-on-surface-variant">{billingDictionary.status.finalInvoice}:</span>
            <span className={`px-2 py-1 rounded text-[12px] font-medium ${finalInvoice ? 'bg-green-100 text-green-800' : (canCreateFinalInvoice ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-600')}`}>
              {finalInvoice ? billingDictionary.status.created : (canCreateFinalInvoice ? billingDictionary.status.available : billingDictionary.status.notAvailable)}
            </span>
          </div>
        </div>

        {canCreateFinalInvoice && !finalInvoice && (
          <div className="mt-2 text-[14px] font-medium text-primary">
            {billingDictionary.status.nextAvailableAction}
          </div>
        )}

        {disabledReasons.length > 0 && (
          <div className="mt-2">
            <p className="text-[13px] font-semibold text-on-surface-variant mb-2">{billingDictionary.status.notes}</p>
            <ul className="list-disc list-inside text-[13px] text-on-surface-variant space-y-1">
              {disabledReasons.map((reason) => (
                <li key={reason}>{disabledReasonLabels[reason] ?? billingDictionary.disabledReasons.unavailable}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-4 pt-4 border-t border-outline-variant flex flex-col gap-6 md:flex-row md:items-start">
          <div className="flex-1">
            <CreateDepositInvoiceAction
              serviceId={billingState.serviceId}
              quotationId={billingState.approvedQuotation?.id ?? null}
              quotationTotal={billingState.approvedQuotation?.grandTotal ?? 0}
              canCreate={billingState.canCreateDepositInvoice}
              disabledReasons={billingState.disabledReasons}
              dictionary={billingDictionary.depositAction}
            />
          </div>
          <div className="hidden md:block w-px bg-outline-variant self-stretch"></div>
          <div className="md:hidden h-px w-full bg-outline-variant"></div>
          <div className="flex-1">
            <CreateFinalInvoiceAction
              serviceId={billingState.serviceId}
              quotationId={billingState.approvedQuotation?.id ?? null}
              remainingAmount={billingState.remainingUninvoicedAmount}
              canCreate={billingState.canCreateFinalInvoice}
              dictionary={billingDictionary.finalAction}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
