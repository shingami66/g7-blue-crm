import "server-only";

import type { createAdminClient } from "@/lib/supabase/admin";
import type { Locale } from "@/lib/i18n/locales";
import { getServicesDictionary } from "@/lib/i18n/dictionaries/services";
import type {
  ServiceStatus,
  ServiceStatusTransitionAction,
  ServiceStatusTransitionState,
} from "@/types/service";

type SupabaseAdminClient = ReturnType<typeof createAdminClient>;

type InvoiceEvidence = {
  id: string;
  invoice_type: string;
  status: string;
  grand_total: number | string | null;
  balance_due: number | string | null;
};

type TransitionEvidence = {
  quotationCount: number;
  approvedQuotationCount: number;
  approvedQuotationTotal: number | null;
  nonDeletedInvoiceCount: number;
  activeInvoices: InvoiceEvidence[];
  activeDepositInvoices: InvoiceEvidence[];
  hasConfirmedDepositPayment: boolean;
};

type EvidenceResult =
  | { success: true; evidence: TransitionEvidence }
  | { success: false; error: string };

type TransitionValidationResult =
  | { success: true }
  | { success: false; error: string };

const TERMINAL_STATUSES = new Set<ServiceStatus>(["Completed", "Cancelled"]);

export const SERVICE_STATUS_ALLOWED_TRANSITIONS: Record<ServiceStatus, readonly ServiceStatus[]> = {
  Inquiry: ["Quoted", "Cancelled"],
  Quoted: ["Approved", "Cancelled"],
  Approved: ["Deposit Paid", "Cancelled"],
  "Deposit Paid": ["In Progress"],
  "In Progress": ["Completed"],
  Completed: [],
  Cancelled: [],
};

export function isTerminalServiceStatus(status: ServiceStatus) {
  return TERMINAL_STATUSES.has(status);
}

function getTransitionDictionary(locale: Locale) {
  return getServicesDictionary(locale).transitionCopy;
}

async function loadTransitionEvidence(
  supabase: SupabaseAdminClient,
  serviceId: string,
  locale: Locale,
): Promise<EvidenceResult> {
  const { data: quotations, error: quotationsError } = await supabase
    .from("quotations")
    .select("id, status, grand_total")
    .eq("service_id", serviceId)
    .eq("is_deleted", false);

  if (quotationsError) {
    console.error("[loadTransitionEvidence] Quotation lookup error:", quotationsError.message);
    return { success: false, error: getTransitionDictionary(locale).blockedReasons.unableToVerifyQuotationEvidence };
  }

  const approvedQuotations = (quotations ?? []).filter(
    (quotation) => quotation.status === "approved"
  );

  const { data: allInvoices, error: allInvoicesError } = await supabase
    .from("invoices")
    .select("id, invoice_type, status, grand_total, balance_due")
    .eq("service_id", serviceId)
    .eq("is_deleted", false);

  if (allInvoicesError) {
    console.error("[loadTransitionEvidence] Invoice lookup error:", allInvoicesError.message);
    return { success: false, error: getTransitionDictionary(locale).blockedReasons.unableToVerifyInvoiceEvidence };
  }

  const activeInvoices = ((allInvoices ?? []) as InvoiceEvidence[]).filter(
    (invoice) => invoice.status !== "voided" && invoice.status !== "cancelled"
  );
  const activeDepositInvoices = activeInvoices.filter(
    (invoice) => invoice.invoice_type === "deposit"
  );

  let hasConfirmedDepositPayment = false;
  const depositInvoiceIds = activeDepositInvoices.map((invoice) => invoice.id);

  if (depositInvoiceIds.length > 0) {
    const { data: payments, error: paymentsError } = await supabase
      .from("payments")
      .select("id")
      .in("invoice_id", depositInvoiceIds)
      .eq("status", "confirmed")
      .gt("amount", 0)
      .limit(1);

    if (paymentsError) {
      console.error("[loadTransitionEvidence] Deposit payment lookup error:", paymentsError.message);
      return { success: false, error: getTransitionDictionary(locale).blockedReasons.unableToVerifyPaymentEvidence };
    }

    hasConfirmedDepositPayment = (payments ?? []).length > 0;
  }

  return {
    success: true,
    evidence: {
      quotationCount: quotations?.length ?? 0,
      approvedQuotationCount: approvedQuotations.length,
      approvedQuotationTotal:
        approvedQuotations.length === 1
          ? Number(approvedQuotations[0].grand_total ?? 0)
          : null,
      nonDeletedInvoiceCount: allInvoices?.length ?? 0,
      activeInvoices,
      activeDepositInvoices,
      hasConfirmedDepositPayment,
    },
  };
}

function hasDepositPaymentEvidence(evidence: TransitionEvidence) {
  return evidence.activeDepositInvoices.length > 0 && evidence.hasConfirmedDepositPayment;
}

function getPreconditionBlockReason(
  nextStatus: ServiceStatus,
  evidence: TransitionEvidence,
  locale: Locale,
): string | null {
  const copy = getTransitionDictionary(locale).blockedReasons;

  switch (nextStatus) {
    case "Quoted":
      return evidence.quotationCount > 0
        ? null
        : copy.noServiceQuotation;
    case "Approved":
      if (evidence.approvedQuotationCount === 0) {
        return copy.approveQuotationFirst;
      }
      if (evidence.approvedQuotationCount > 1) {
        return copy.multipleApprovedQuotations;
      }
      return null;
    case "Deposit Paid":
      return hasDepositPaymentEvidence(evidence)
        ? null
        : copy.depositPaymentRequired;
    case "In Progress":
      return hasDepositPaymentEvidence(evidence)
        ? null
        : copy.depositPaymentBeforeWork;
    case "Completed": {
      const unpaidInvoice = evidence.activeInvoices.find(
        (invoice) => Number(invoice.balance_due ?? 0) > 0
      );

      if (unpaidInvoice) {
        return copy.unpaidInvoices;
      }

      if (evidence.approvedQuotationCount !== 1 || evidence.approvedQuotationTotal === null) {
        return copy.approvedQuotationRequiredForCompleted;
      }

      const activeInvoiceTotal = evidence.activeInvoices.reduce(
        (sum, invoice) => sum + Number(invoice.grand_total ?? 0),
        0
      );

      if (evidence.approvedQuotationTotal - activeInvoiceTotal > 0.01) {
        return copy.remainingInvoiceRequired;
      }

      return null;
    }
    case "Cancelled":
      return evidence.nonDeletedInvoiceCount === 0
        ? null
        : copy.financeCancellationRequired;
    default:
      return copy.unavailable;
  }
}

function makeAction(
  status: ServiceStatus,
  blockedReason: string | null,
  locale: Locale,
): ServiceStatusTransitionAction {
  const copy = getTransitionDictionary(locale).actions[status];

  return {
    status,
    label: copy.label,
    description: copy.description,
    blockedReason,
    requiresCancellationReason: status === "Cancelled",
  };
}

function buildTransitionState(
  currentStatus: ServiceStatus,
  evidence: TransitionEvidence | null,
  evidenceError: string | null,
  locale: Locale,
): ServiceStatusTransitionState {
  const candidateStatuses = SERVICE_STATUS_ALLOWED_TRANSITIONS[currentStatus] ?? [];

  return {
    currentStatus,
    isTerminal: isTerminalServiceStatus(currentStatus),
    actions: candidateStatuses.map((nextStatus) =>
      makeAction(
        nextStatus,
        evidence ? getPreconditionBlockReason(nextStatus, evidence, locale) : evidenceError,
        locale,
      )
    ),
  };
}

export async function getServiceStatusTransitionState(
  supabase: SupabaseAdminClient,
  serviceId: string,
  currentStatus: ServiceStatus,
  locale: Locale,
): Promise<ServiceStatusTransitionState> {
  if (isTerminalServiceStatus(currentStatus)) {
    return buildTransitionState(currentStatus, null, null, locale);
  }

  const evidenceResult = await loadTransitionEvidence(supabase, serviceId, locale);

  if (!evidenceResult.success) {
    return buildTransitionState(currentStatus, null, evidenceResult.error, locale);
  }

  return buildTransitionState(currentStatus, evidenceResult.evidence, null, locale);
}

export async function validateServiceStatusTransition(
  supabase: SupabaseAdminClient,
  serviceId: string,
  currentStatus: ServiceStatus,
  requestedStatus: ServiceStatus,
  cancellationReason: string | null | undefined,
  locale: Locale,
): Promise<TransitionValidationResult> {
  const dictionary = getServicesDictionary(locale);

  if (currentStatus === requestedStatus) {
    return {
      success: false,
      error: getTransitionDictionary(locale).blockedReasons.alreadyStatus.replace(
        "{status}",
        dictionary.serviceStatuses[currentStatus],
      ),
    };
  }

  if (isTerminalServiceStatus(currentStatus)) {
    return {
      success: false,
      error: getTransitionDictionary(locale).blockedReasons.terminalStatusCannotChange.replace(
        "{status}",
        dictionary.serviceStatuses[currentStatus],
      ),
    };
  }

  if (!SERVICE_STATUS_ALLOWED_TRANSITIONS[currentStatus]?.includes(requestedStatus)) {
    return { success: false, error: getTransitionDictionary(locale).blockedReasons.transitionNotAllowed };
  }

  if (requestedStatus === "Cancelled" && !cancellationReason?.trim()) {
    return { success: false, error: getTransitionDictionary(locale).blockedReasons.cancellationReasonRequired };
  }

  const evidenceResult = await loadTransitionEvidence(supabase, serviceId, locale);

  if (!evidenceResult.success) {
    return { success: false, error: evidenceResult.error };
  }

  const blockedReason = getPreconditionBlockReason(requestedStatus, evidenceResult.evidence, locale);

  if (blockedReason) {
    return { success: false, error: blockedReason };
  }

  return { success: true };
}
