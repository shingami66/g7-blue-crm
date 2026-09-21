"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { ServiceBillingState } from "@/lib/invoices/types";
import type { ServicesDictionary } from "@/lib/i18n/dictionaries/services";
import { resolveInvoiceControlVisibility } from "@/lib/invoices/control-visibility";
import { getServiceInvoiceLifecycleDecision } from "@/lib/invoices/service-invoice-lifecycle";
import { formatSarAmount } from "@/lib/i18n/formatting";
import type { ServiceStatus } from "@/types/service";
import { CreateDepositInvoiceAction } from "./CreateDepositInvoiceAction";
import { CreateFinalInvoiceAction } from "./CreateFinalInvoiceAction";
import { CreateFlexibleInvoiceAction } from "./CreateFlexibleInvoiceAction";

type InvoiceActionIntent = "deposit" | "progress" | "final";

export default function BillingPanel({
  billingState,
  dictionary,
  canCreateInvoices,
  serviceStatus,
  invoiceActionIntent,
}: {
  billingState: ServiceBillingState;
  dictionary: ServicesDictionary;
  canCreateInvoices: boolean;
  serviceStatus: ServiceStatus;
  invoiceActionIntent?: InvoiceActionIntent;
}) {
  const billingDictionary = dictionary.billing;
  const ceiling = billingState.billingCeiling;
  const [activeHighlight, setActiveHighlight] = useState<InvoiceActionIntent | null>(
    invoiceActionIntent ?? null,
  );

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
    remainingUninvoicedAmount,
    canCreateDepositInvoice,
    canCreateFlexibleInvoice,
    canCreateFinalInvoice,
    disabledReasons,
  } = billingState;

  const lifecycleDecision = getServiceInvoiceLifecycleDecision({
    status: serviceStatus,
    deletedAt: null,
  });
  const invoiceControls = resolveInvoiceControlVisibility({
    canCreateInvoices,
    authorityMode,
    lifecycleDecision,
    canCreateDepositInvoice,
    canCreateFlexibleInvoice,
    canCreateFinalInvoice,
    remainingUninvoicedAmount,
  });
  const billingSectionRef = useRef<HTMLElement>(null);
  const depositActionRef = useRef<HTMLDivElement>(null);
  const flexibleActionRef = useRef<HTMLDivElement>(null);
  const finalActionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!invoiceActionIntent) return;

    const timer = setTimeout(() => {
      setActiveHighlight(null);
    }, 1800);

    const actionTarget =
      invoiceActionIntent === "deposit"
        ? invoiceControls.showInvoiceActions && lifecycleDecision.canCreateDeposit
          ? depositActionRef.current
          : null
        : invoiceActionIntent === "progress"
          ? invoiceControls.showInvoiceActions && invoiceControls.canCreateFlexibleInvoice
            ? flexibleActionRef.current
            : null
          : invoiceControls.showInvoiceActions && lifecycleDecision.canCreateFinal
            ? finalActionRef.current
            : null;
    const frame = window.requestAnimationFrame(() => {
      const interactiveTarget = actionTarget?.querySelector<HTMLElement>(
        'input:not([disabled]), button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
      );
      (interactiveTarget ?? actionTarget)?.focus({ preventScroll: true });
    });

    return () => {
      window.cancelAnimationFrame(frame);
      clearTimeout(timer);
    };
  }, [
    invoiceActionIntent,
    invoiceControls.showInvoiceActions,
    invoiceControls.canCreateFlexibleInvoice,
    lifecycleDecision.canCreateDeposit,
    lifecycleDecision.canCreateFinal,
  ]);

  const panelTitle = invoiceActionIntent
    ? {
        deposit: billingDictionary.createDepositInvoiceTitle,
        progress: billingDictionary.createProgressInvoiceTitle,
        final: billingDictionary.createFinalInvoiceTitle,
      }[invoiceActionIntent]
    : billingDictionary.selectBillingAction;

  const billingModeOptions: Array<{
    intent: InvoiceActionIntent;
    label: string;
    enabled: boolean;
  }> = [
    {
      intent: "progress",
      label: billingDictionary.cards.progressInvoice,
      enabled: invoiceControls.canCreateFlexibleInvoice === true,
    },
    {
      intent: "deposit",
      label: billingDictionary.status.depositInvoice,
      enabled: invoiceControls.canCreateDepositInvoice,
    },
    {
      intent: "final",
      label: billingDictionary.status.finalInvoice,
      enabled: invoiceControls.canCreateFinalInvoice,
    },
  ];

  return (
    <section
      ref={billingSectionRef}
      id="billing"
      aria-label={billingDictionary.cards.billingCeiling}
      data-billing-ceiling={
        ceiling == null
          ? undefined
          : formatSarAmount(dictionary.locale, ceiling)
      }
      data-prior-invoiced-label={billingDictionary.cards.priorInvoiced}
      data-exposure-unavailable-label={billingDictionary.cards.exposureUnavailable}
      data-remaining-unavailable-label={billingDictionary.cards.remainingUnavailable}
      data-amount-unavailable-label={billingDictionary.cards.amountUnavailable}
      data-remaining-label={billingDictionary.cards.remaining}
      className="bg-surface-container-lowest border border-surface-variant rounded-xl overflow-hidden"
    >
      <div className="px-5 py-3.5 border-b border-surface-variant bg-surface-bright flex min-w-0 flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold text-primary text-base sm:text-lg">{panelTitle}</h3>
      </div>

      {(authorityMode === "historical_abs_only" ||
        authorityMode === "unavailable") && (
        <div className="border-b border-surface-variant bg-surface px-5 py-3 text-[13px] leading-[18px] text-on-surface-variant">
          {authorityMode === "historical_abs_only"
            ? billingDictionary.authority.historicalOnlyNotice
            : billingDictionary.authority.unavailableNotice}
        </div>
      )}

      <div className="p-5 flex flex-col gap-4">
        {disabledReasons.length > 0 && (
          <div className="rounded-lg bg-surface p-3 border border-outline-variant/60">
            <p className="text-xs font-semibold text-on-surface-variant mb-1">
              {billingDictionary.status.notes}
            </p>
            <ul className="list-disc list-inside text-xs text-on-surface-variant space-y-0.5">
              {disabledReasons.map((reason) => (
                <li key={reason}>
                  {disabledReasonLabels[reason] ??
                    billingDictionary.disabledReasons.unavailable}
                </li>
              ))}
            </ul>
          </div>
        )}

      {/* Primary Action Panel & Mode Switcher */}
      {invoiceControls.showInvoiceActions ? (
        <div className="flex flex-col gap-4">
          <nav
            aria-label={billingDictionary.selectBillingAction}
            className="flex flex-col gap-2 rounded-lg border border-outline-variant/60 bg-surface p-3"
          >
            <span className="text-xs font-semibold text-on-surface-variant">
              {billingDictionary.selectBillingAction}
            </span>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {billingModeOptions
                .filter((mode) => mode.enabled)
                .map((mode) => {
                  const isCurrent = invoiceActionIntent === mode.intent;

                  return (
                    <Link
                      key={mode.intent}
                      href={`/services/${encodeURIComponent(billingState.serviceId)}/billing?intent=${mode.intent}`}
                      aria-current={isCurrent ? "page" : undefined}
                      aria-label={
                        mode.intent === "deposit"
                          ? billingDictionary.switchToDeposit
                          : mode.intent === "final"
                            ? billingDictionary.switchToFinal
                            : billingDictionary.cards.progressInvoice
                      }
                      data-billing-mode={mode.intent}
                      className={`inline-flex min-w-0 items-center justify-center rounded-lg border px-3 py-2 text-center text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:text-sm ${
                        isCurrent
                          ? "border-primary bg-primary text-on-primary"
                          : "border-primary/40 bg-primary-fixed/20 text-primary hover:bg-primary hover:text-on-primary"
                      }`}
                    >
                      <span className="break-words">{mode.label}</span>
                    </Link>
                  );
                })}
            </div>
          </nav>

          {invoiceActionIntent === "deposit" && invoiceControls.canCreateDepositInvoice ? (
              <div className="flex flex-col gap-3">
                <div
                  ref={depositActionRef}
                  tabIndex={-1}
                  data-invoice-action="deposit"
                  className={`rounded-lg transition-colors duration-500 motion-reduce:transition-none outline-none ${
                    activeHighlight === "deposit" ? "bg-primary-fixed/25 p-2" : ""
                  }`}
                >
                  <CreateDepositInvoiceAction
                    serviceId={billingState.serviceId}
                    quotationId={billingState.approvedQuotation?.id ?? null}
                    remainingAmount={billingState.remainingUninvoicedAmount}
                    canCreate={invoiceControls.canCreateDepositInvoice}
                    disabledReasons={billingState.disabledReasons}
                    dictionary={billingDictionary.depositAction}
                  />
                </div>

              </div>
            ) : invoiceActionIntent === "final" && invoiceControls.canCreateFinalInvoice ? (
              <div className="flex flex-col gap-3">
                <div
                  ref={finalActionRef}
                  tabIndex={-1}
                  data-invoice-action="final"
                  className={`rounded-lg transition-colors duration-500 motion-reduce:transition-none outline-none ${
                    activeHighlight === "final" ? "bg-primary-fixed/25 p-2" : ""
                  }`}
                >
                  <CreateFinalInvoiceAction
                    serviceId={billingState.serviceId}
                    quotationId={billingState.approvedQuotation?.id ?? null}
                    remainingAmount={billingState.remainingUninvoicedAmount}
                    canCreate={invoiceControls.canCreateFinalInvoice}
                    dictionary={billingDictionary.finalAction}
                  />
                </div>

              </div>
            ) : invoiceActionIntent === "progress" && invoiceControls.canCreateFlexibleInvoice ? (
              <div className="flex flex-col gap-3">
                <div
                  ref={flexibleActionRef}
                  tabIndex={-1}
                  data-invoice-action="progress"
                  className={`rounded-lg transition-colors duration-500 motion-reduce:transition-none outline-none ${
                    activeHighlight === "progress" ? "bg-primary-fixed/25 p-2" : ""
                  }`}
                >
                  <CreateFlexibleInvoiceAction
                    serviceId={billingState.serviceId}
                    quotationId={billingState.approvedQuotation?.id ?? null}
                    remainingAmount={billingState.remainingUninvoicedAmount}
                    canCreate={invoiceControls.canCreateFlexibleInvoice === true}
                    dictionary={billingDictionary.flexibleAction}
                  />
                </div>
              </div>
            ) : !invoiceActionIntent ? (
              /* Missing or invalid intent fallback: Compact action selector */
              <div className="flex flex-col gap-3 rounded-lg border border-outline-variant/60 bg-surface p-4 text-xs">
                <span className="font-semibold text-on-surface text-sm">
                  {billingDictionary.selectBillingAction}
                </span>
                <div className="flex flex-wrap gap-3">
                  {invoiceControls.canCreateFlexibleInvoice && (
                    <div className="w-full rounded-lg border border-primary/30 bg-primary-fixed/10 p-3">
                      <CreateFlexibleInvoiceAction
                        serviceId={billingState.serviceId}
                        quotationId={billingState.approvedQuotation?.id ?? null}
                        remainingAmount={billingState.remainingUninvoicedAmount}
                        canCreate={invoiceControls.canCreateFlexibleInvoice === true}
                        dictionary={billingDictionary.flexibleAction}
                      />
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
