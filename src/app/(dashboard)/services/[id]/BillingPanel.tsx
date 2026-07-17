import type { ServiceBillingState } from "@/lib/invoices/types";
import { isolateBidiText } from "@/lib/i18n/bidi";
import type { ServicesDictionary } from "@/lib/i18n/dictionaries/services";
import { formatSarAmount } from "@/lib/i18n/formatting";
import {
  isAuthoritativeZero,
  toAuthoritativeMoneyField,
} from "@/lib/invoices/money";
import { resolveInvoiceControlVisibility } from "@/lib/invoices/control-visibility";
import { getServiceInvoiceLifecycleDecision } from "@/lib/invoices/service-invoice-lifecycle";
import type { ServiceStatus } from "@/types/service";
import { CreateDepositInvoiceAction } from "./CreateDepositInvoiceAction";
import { CreateFinalInvoiceAction } from "./CreateFinalInvoiceAction";

export default function BillingPanel({
  billingState,
  dictionary,
  canCreateInvoices,
  serviceStatus,
}: {
  billingState: ServiceBillingState;
  dictionary: ServicesDictionary;
  canCreateInvoices: boolean;
  serviceStatus: ServiceStatus;
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
    approved_quotation_required:
      billingDictionary.disabledReasons.approvedQuotationRequired,
    billing_state_unavailable:
      billingDictionary.disabledReasons.billingStateUnavailable,
    invoice_exposure_unavailable:
      billingDictionary.disabledReasons.invoiceExposureUnavailable,
    duplicate_active_deposit_invoices:
      billingDictionary.disabledReasons.duplicateActiveDepositInvoices,
    duplicate_active_final_invoices:
      billingDictionary.disabledReasons.duplicateActiveFinalInvoices,
    missing_service_id: billingDictionary.disabledReasons.missingServiceId,
    deposit_invoice_already_exists:
      billingDictionary.disabledReasons.depositInvoiceAlreadyExists,
    final_invoice_already_exists:
      billingDictionary.disabledReasons.finalInvoiceAlreadyExists,
    prior_invoices_exceed_quotation_total:
      billingDictionary.disabledReasons.priorInvoicesExceedQuotationTotal,
    prior_invoices_exceed_billing_scope_ceiling:
      billingDictionary.disabledReasons.priorInvoicesExceedBillingScopeCeiling,
    abs_historical_authority_no_active:
      billingDictionary.disabledReasons.absHistoricalAuthorityNoActive,
    quotation_not_approved:
      billingDictionary.disabledReasons.quotationNotApproved,
    quotation_service_mismatch:
      billingDictionary.disabledReasons.quotationServiceMismatch,
  };

  const {
    authorityMode,
    approvedQuotation,
    billingCeiling,
    depositInvoice,
    finalInvoice,
    activePriorInvoiceTotal,
    remainingUninvoicedAmount,
    canCreateDepositInvoice,
    canCreateFinalInvoice,
    disabledReasons,
  } = billingState;

  const exposureField = toAuthoritativeMoneyField(activePriorInvoiceTotal);
  const remainingField = toAuthoritativeMoneyField(
    remainingUninvoicedAmount,
  );
  const remainingIsZero = isAuthoritativeZero(remainingField);
  const lifecycleDecision = getServiceInvoiceLifecycleDecision({
    status: serviceStatus,
    deletedAt: null,
  });
  const invoiceControls = resolveInvoiceControlVisibility({
    canCreateInvoices,
    authorityMode,
    lifecycleDecision,
    canCreateDepositInvoice,
    canCreateFinalInvoice,
    remainingUninvoicedAmount,
  });

  const authorityTitle =
    authorityMode === "active_abs"
      ? billingDictionary.cards.billingAuthorityAbs
      : authorityMode === "legacy_quotation"
        ? billingDictionary.cards.billingAuthorityQuotation
        : authorityMode === "historical_abs_only"
          ? billingDictionary.cards.billingAuthorityHistorical
          : authorityMode === "unavailable"
            ? billingDictionary.cards.billingAuthorityUnavailable
            : billingDictionary.cards.billingAuthorityNone;

  return (
    <section className="bg-surface-container-lowest border border-surface-variant rounded-xl overflow-hidden">
      <div className="px-6 py-4 border-b border-surface-variant bg-surface-bright">
        <h3 className="font-semibold text-primary">{billingDictionary.title}</h3>
      </div>

      {(authorityMode === "historical_abs_only" ||
        authorityMode === "unavailable") && (
        <div className="border-b border-surface-variant bg-surface px-6 py-3 text-[13px] leading-[18px] text-on-surface-variant">
          {authorityMode === "historical_abs_only"
            ? billingDictionary.authority.historicalOnlyNotice
            : billingDictionary.authority.unavailableNotice}
        </div>
      )}

      <div className="p-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <div className="flex flex-col gap-2">
          <h4 className="text-[13px] font-semibold text-on-surface uppercase tracking-wide">
            {billingDictionary.cards.billingAuthority}
          </h4>
          <div className="bg-surface p-4 rounded-lg border border-outline-variant">
            <div className="text-[14px] font-semibold text-on-surface mb-2">
              {authorityTitle}
            </div>
            {authorityMode === "active_abs" && billingCeiling != null ? (
              <>
                <div className="text-[12px] text-on-surface-variant mb-1">
                  {billingDictionary.cards.billingCeiling}
                </div>
                <div
                  dir="ltr"
                  className="text-on-surface font-semibold text-lg tabular-nums"
                >
                  {formatCurrency(billingCeiling)}
                </div>
                {approvedQuotation ? (
                  <div className="mt-3 border-t border-outline-variant pt-3">
                    <div className="text-[12px] text-on-surface-variant mb-1">
                      {billingDictionary.cards.sourceQuotation}
                    </div>
                    <div
                      dir="ltr"
                      className="font-mono text-primary font-medium mb-1"
                    >
                      {isolateBidiText(approvedQuotation.quotationNumber)}
                    </div>
                    <div className="text-[12px] text-on-surface-variant mb-1">
                      {billingDictionary.cards.sourceQuotationTotal}
                    </div>
                    <div
                      dir="ltr"
                      className="text-on-surface font-medium tabular-nums"
                    >
                      {approvedQuotation.grandTotal != null
                        ? formatCurrency(approvedQuotation.grandTotal)
                        : billingDictionary.cards.amountUnavailable}
                    </div>
                  </div>
                ) : null}
              </>
            ) : null}

            {authorityMode === "legacy_quotation" && approvedQuotation ? (
              <>
                <div
                  dir="ltr"
                  className="font-mono text-primary font-medium mb-1"
                >
                  {isolateBidiText(approvedQuotation.quotationNumber)}
                </div>
                <div className="text-[12px] text-on-surface-variant mb-1">
                  {billingDictionary.cards.billingCeiling}
                </div>
                <div
                  dir="ltr"
                  className="text-on-surface font-semibold text-lg tabular-nums"
                >
                  {approvedQuotation.grandTotal != null
                    ? formatCurrency(approvedQuotation.grandTotal)
                    : billingDictionary.cards.amountUnavailable}
                </div>
                <div className="text-[12px] text-on-surface-variant mt-1">
                  {dictionary.quotationStatuses[approvedQuotation.status]}
                </div>
              </>
            ) : null}

            {authorityMode === "historical_abs_only" ? (
              <>
                <p className="text-[13px] text-on-surface-variant mb-2">
                  {billingDictionary.authority.historicalOnlyBody}
                </p>
                {approvedQuotation ? (
                  <div className="mt-2 border-t border-outline-variant pt-3">
                    <div className="text-[12px] text-on-surface-variant mb-1">
                      {billingDictionary.cards.sourceQuotationProvenance}
                    </div>
                    <div
                      dir="ltr"
                      className="font-mono text-primary font-medium mb-1"
                    >
                      {isolateBidiText(approvedQuotation.quotationNumber)}
                    </div>
                    <div className="text-[12px] text-on-surface-variant">
                      {billingDictionary.cards.sourceQuotationNotAuthority}
                    </div>
                  </div>
                ) : null}
              </>
            ) : null}

            {authorityMode === "no_authority" ? (
              <div className="text-[14px] text-on-surface-variant">
                {billingDictionary.cards.noApprovedQuotationYet}
              </div>
            ) : null}

            {authorityMode === "unavailable" ? (
              <div className="text-[14px] text-on-surface-variant">
                {billingDictionary.authority.unavailableNotice}
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <h4 className="text-[13px] font-semibold text-on-surface uppercase tracking-wide">
            {billingDictionary.cards.depositInvoice}
          </h4>
          {depositInvoice ? (
            <div className="bg-surface p-4 rounded-lg border border-outline-variant">
              <div
                dir="ltr"
                className="font-mono text-primary font-medium mb-1"
              >
                {isolateBidiText(depositInvoice.invoiceNumber)}
              </div>
              <div
                dir="ltr"
                className="text-on-surface font-semibold text-lg tabular-nums"
              >
                {depositInvoice.amount != null
                  ? formatCurrency(depositInvoice.amount)
                  : billingDictionary.cards.amountUnavailable}
              </div>
              <div className="text-[12px] text-on-surface-variant mt-1">
                {formatStatus(depositInvoice.status)}
              </div>
            </div>
          ) : (
            <div className="bg-surface p-4 rounded-lg border border-outline-variant border-dashed text-on-surface-variant text-[14px]">
              {billingDictionary.cards.noActiveDepositInvoice}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <h4 className="text-[13px] font-semibold text-on-surface uppercase tracking-wide">
            {billingDictionary.cards.finalInvoice}
          </h4>
          {finalInvoice ? (
            <div className="bg-surface p-4 rounded-lg border border-outline-variant">
              <div
                dir="ltr"
                className="font-mono text-primary font-medium mb-1"
              >
                {isolateBidiText(finalInvoice.invoiceNumber)}
              </div>
              <div
                dir="ltr"
                className="text-on-surface font-semibold text-lg tabular-nums"
              >
                {finalInvoice.amount != null
                  ? formatCurrency(finalInvoice.amount)
                  : billingDictionary.cards.amountUnavailable}
              </div>
              <div className="text-[12px] text-on-surface-variant mt-1">
                {formatStatus(finalInvoice.status)}
              </div>
            </div>
          ) : (
            <div className="bg-surface p-4 rounded-lg border border-outline-variant border-dashed text-on-surface-variant text-[14px]">
              {billingDictionary.cards.noActiveFinalInvoice}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <h4 className="text-[13px] font-semibold text-on-surface uppercase tracking-wide">
            {billingDictionary.cards.billingCalculation}
          </h4>
          <div className="bg-surface p-4 rounded-lg border border-outline-variant flex flex-col gap-3">
            <div className="flex min-w-0 flex-wrap items-center justify-between gap-2 text-[14px]">
              <span className="min-w-0 text-on-surface-variant">
                {billingDictionary.cards.priorInvoiced}
              </span>
              <span
                dir="ltr"
                className="shrink-0 font-medium tabular-nums text-on-surface"
              >
                {exposureField.kind === "value"
                  ? formatCurrency(exposureField.amount)
                  : billingDictionary.cards.exposureUnavailable}
              </span>
            </div>
            <div className="flex min-w-0 flex-wrap items-center justify-between gap-2 border-t border-outline-variant pt-2 text-[14px]">
              <span className="min-w-0 text-on-surface-variant">
                {billingDictionary.cards.remaining}
              </span>
              {remainingField.kind === "value" ? (
                <span
                  dir="ltr"
                  className="shrink-0 font-semibold tabular-nums text-primary"
                >
                  {formatCurrency(remainingField.amount)}
                </span>
              ) : (
                <span className="shrink-0 text-[13px] font-medium text-on-surface-variant">
                  {billingDictionary.cards.remainingUnavailable}
                </span>
              )}
            </div>
            {remainingIsZero ? (
              <div className="text-[12px] font-medium text-on-surface-variant">
                {billingDictionary.cards.fullyAllocated}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="px-6 py-5 bg-surface border-t border-surface-variant flex flex-col gap-4">
        <h4 className="text-[13px] font-semibold text-on-surface uppercase tracking-wide">
          {billingDictionary.status.title}
        </h4>

        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <span className="text-[14px] text-on-surface-variant">
              {billingDictionary.status.depositInvoice}:
            </span>
            <span
              className={`px-2 py-1 rounded text-[12px] font-medium ${
                depositInvoice
                  ? "bg-green-100 text-green-800"
                  : invoiceControls.canCreateDepositInvoice
                    ? "bg-blue-100 text-blue-800"
                    : "bg-slate-100 text-slate-600"
              }`}
            >
              {depositInvoice
                ? billingDictionary.status.created
                : invoiceControls.canCreateDepositInvoice
                  ? billingDictionary.status.available
                  : billingDictionary.status.notAvailable}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[14px] text-on-surface-variant">
              {billingDictionary.status.finalInvoice}:
            </span>
            <span
              className={`px-2 py-1 rounded text-[12px] font-medium ${
                finalInvoice
                  ? "bg-green-100 text-green-800"
                  : invoiceControls.canCreateFinalInvoice
                    ? "bg-blue-100 text-blue-800"
                    : "bg-slate-100 text-slate-600"
              }`}
            >
              {finalInvoice
                ? billingDictionary.status.created
                : invoiceControls.canCreateFinalInvoice
                  ? billingDictionary.status.available
                  : billingDictionary.status.notAvailable}
            </span>
          </div>
        </div>

        {invoiceControls.canCreateFinalInvoice && !finalInvoice && (
          <div className="mt-2 text-[14px] font-medium text-primary">
            {billingDictionary.status.nextAvailableAction}
          </div>
        )}

        {disabledReasons.length > 0 && (
          <div className="mt-2">
            <p className="text-[13px] font-semibold text-on-surface-variant mb-2">
              {billingDictionary.status.notes}
            </p>
            <ul className="list-disc list-inside text-[13px] text-on-surface-variant space-y-1">
              {disabledReasons.map((reason) => (
                <li key={reason}>
                  {disabledReasonLabels[reason] ??
                    billingDictionary.disabledReasons.unavailable}
                </li>
              ))}
            </ul>
          </div>
        )}

        {invoiceControls.showInvoiceActions ? (
          <div className="mt-4 pt-4 border-t border-outline-variant flex flex-col gap-6 md:flex-row md:items-start">
            {lifecycleDecision.canCreateDeposit ? (
              <div className="flex-1">
                <CreateDepositInvoiceAction
                  serviceId={billingState.serviceId}
                  quotationId={billingState.approvedQuotation?.id ?? null}
                  remainingAmount={billingState.remainingUninvoicedAmount}
                  canCreate={invoiceControls.canCreateDepositInvoice}
                  disabledReasons={billingState.disabledReasons}
                  dictionary={billingDictionary.depositAction}
                />
              </div>
            ) : null}
            {lifecycleDecision.canCreateDeposit &&
            lifecycleDecision.canCreateFinal ? (
              <>
                <div className="hidden md:block w-px bg-outline-variant self-stretch"></div>
                <div className="md:hidden h-px w-full bg-outline-variant"></div>
              </>
            ) : null}
            {lifecycleDecision.canCreateFinal ? (
              <div className="flex-1">
                <CreateFinalInvoiceAction
                  serviceId={billingState.serviceId}
                  quotationId={billingState.approvedQuotation?.id ?? null}
                  remainingAmount={billingState.remainingUninvoicedAmount}
                  canCreate={invoiceControls.canCreateFinalInvoice}
                  dictionary={billingDictionary.finalAction}
                />
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
