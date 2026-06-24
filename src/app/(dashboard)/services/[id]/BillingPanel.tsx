import type { ServiceBillingState } from "@/lib/invoices/types";
import { CreateDepositInvoiceAction } from "./CreateDepositInvoiceAction";
import { CreateFinalInvoiceAction } from "./CreateFinalInvoiceAction";

export default function BillingPanel({ billingState }: { billingState: ServiceBillingState }) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-SA", {
      style: "currency",
      currency: "SAR",
    }).format(value);
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
        <h3 className="font-semibold text-primary">Billing / Invoicing</h3>
      </div>
      
      <div className="p-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {/* Approved Quotation */}
        <div className="flex flex-col gap-2">
          <h4 className="text-[13px] font-semibold text-on-surface uppercase tracking-wide">Approved Quotation</h4>
          {approvedQuotation ? (
            <div className="bg-surface p-4 rounded-lg border border-outline-variant">
              <div className="font-mono text-primary font-medium mb-1">{approvedQuotation.quotationNumber}</div>
              <div className="text-on-surface font-semibold text-lg">{formatCurrency(approvedQuotation.grandTotal)}</div>
              <div className="text-[12px] text-on-surface-variant mt-1 capitalize">{approvedQuotation.status}</div>
            </div>
          ) : (
            <div className="bg-surface p-4 rounded-lg border border-outline-variant border-dashed text-on-surface-variant text-[14px]">
              No approved quotation yet
            </div>
          )}
        </div>

        {/* Deposit Invoice */}
        <div className="flex flex-col gap-2">
          <h4 className="text-[13px] font-semibold text-on-surface uppercase tracking-wide">Deposit Invoice</h4>
          {depositInvoice ? (
            <div className="bg-surface p-4 rounded-lg border border-outline-variant">
              <div className="font-mono text-primary font-medium mb-1">{depositInvoice.invoiceNumber}</div>
              <div className="text-on-surface font-semibold text-lg">{formatCurrency(depositInvoice.amount)}</div>
              <div className="text-[12px] text-on-surface-variant mt-1 capitalize">{depositInvoice.status}</div>
            </div>
          ) : (
            <div className="bg-surface p-4 rounded-lg border border-outline-variant border-dashed text-on-surface-variant text-[14px]">
              No active deposit invoice
            </div>
          )}
        </div>

        {/* Final Invoice */}
        <div className="flex flex-col gap-2">
          <h4 className="text-[13px] font-semibold text-on-surface uppercase tracking-wide">Final Invoice</h4>
          {finalInvoice ? (
            <div className="bg-surface p-4 rounded-lg border border-outline-variant">
              <div className="font-mono text-primary font-medium mb-1">{finalInvoice.invoiceNumber}</div>
              <div className="text-on-surface font-semibold text-lg">{formatCurrency(finalInvoice.amount)}</div>
              <div className="text-[12px] text-on-surface-variant mt-1 capitalize">{finalInvoice.status}</div>
            </div>
          ) : (
            <div className="bg-surface p-4 rounded-lg border border-outline-variant border-dashed text-on-surface-variant text-[14px]">
              No active final invoice
            </div>
          )}
        </div>

        {/* Billing Calculation */}
        <div className="flex flex-col gap-2">
          <h4 className="text-[13px] font-semibold text-on-surface uppercase tracking-wide">Billing Calculation</h4>
          <div className="bg-surface p-4 rounded-lg border border-outline-variant flex flex-col gap-3">
            <div className="flex justify-between items-center text-[14px]">
              <span className="text-on-surface-variant">Prior Invoiced</span>
              <span className="font-medium text-on-surface">{formatCurrency(activePriorInvoiceTotal)}</span>
            </div>
            <div className="flex justify-between items-center text-[14px] pt-2 border-t border-outline-variant">
              <span className="text-on-surface-variant">Remaining</span>
              <span className={`font-semibold ${remainingUninvoicedAmount < 0 ? 'text-red-600' : 'text-primary'}`}>
                {formatCurrency(remainingUninvoicedAmount)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Billing Status */}
      <div className="px-6 py-5 bg-surface border-t border-surface-variant flex flex-col gap-4">
        <h4 className="text-[13px] font-semibold text-on-surface uppercase tracking-wide">Billing Status</h4>
        
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <span className="text-[14px] text-on-surface-variant">Deposit Invoice:</span>
            <span className={`px-2 py-1 rounded text-[12px] font-medium ${depositInvoice ? 'bg-green-100 text-green-800' : (canCreateDepositInvoice ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-600')}`}>
              {depositInvoice ? "Created" : (canCreateDepositInvoice ? "Available" : "Not available")}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[14px] text-on-surface-variant">Final Invoice:</span>
            <span className={`px-2 py-1 rounded text-[12px] font-medium ${finalInvoice ? 'bg-green-100 text-green-800' : (canCreateFinalInvoice ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-600')}`}>
              {finalInvoice ? "Created" : (canCreateFinalInvoice ? "Available" : "Not available")}
            </span>
          </div>
        </div>

        {canCreateFinalInvoice && !finalInvoice && (
          <div className="mt-2 text-[14px] font-medium text-primary">
            Next available action: Create Final Invoice
          </div>
        )}

        {disabledReasons.length > 0 && (
          <div className="mt-2">
            <p className="text-[13px] font-semibold text-on-surface-variant mb-2">Notes:</p>
            <ul className="list-disc list-inside text-[13px] text-on-surface-variant space-y-1">
              {disabledReasons.map((reason) => {
                const labels: Record<string, string> = {
                  no_approved_quotation: "No approved quotation is available for this service.",
                  deposit_invoice_already_exists: "Deposit invoice already created for this service.",
                  final_invoice_already_exists: "Final invoice already created for this service.",
                  prior_invoices_exceed_quotation_total: "Prior invoices exceed the approved quotation total.",
                  quotation_not_approved: "The selected quotation is not approved yet.",
                  quotation_service_mismatch: "The quotation does not match this service.",
                };
                return (
                  <li key={reason}>{labels[reason] ?? "Action is currently unavailable."}</li>
                );
              })}
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
            />
          </div>
        </div>
      </div>
    </section>
  );
}
