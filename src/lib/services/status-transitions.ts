import "server-only";

import type { createAdminClient } from "@/lib/supabase/admin";
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

const ACTION_COPY: Record<ServiceStatus, { label: string; description: string }> = {
  Inquiry: {
    label: "Move to Inquiry",
    description: "Return to inquiry.",
  },
  Quoted: {
    label: "Move to Quoted",
    description: "A Service-scoped quotation exists.",
  },
  Approved: {
    label: "Move to Approved",
    description: "An approved quotation exists for this Service.",
  },
  "Deposit Paid": {
    label: "Move to Deposit Paid",
    description: "A Deposit Invoice has confirmed payment evidence.",
  },
  "In Progress": {
    label: "Start Work",
    description: "Operations confirms work has started.",
  },
  Completed: {
    label: "Mark Completed",
    description: "Delivery is complete and active invoices are paid.",
  },
  Cancelled: {
    label: "Cancel Service",
    description: "Cancel this Service with a reason.",
  },
};

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

async function loadTransitionEvidence(
  supabase: SupabaseAdminClient,
  serviceId: string
): Promise<EvidenceResult> {
  const { data: quotations, error: quotationsError } = await supabase
    .from("quotations")
    .select("id, status, grand_total")
    .eq("service_id", serviceId)
    .eq("is_deleted", false);

  if (quotationsError) {
    console.error("[loadTransitionEvidence] Quotation lookup error:", quotationsError.message);
    return { success: false, error: "Unable to verify Service quotation evidence. Please try again." };
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
    return { success: false, error: "Unable to verify Service invoice evidence. Please try again." };
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
      return { success: false, error: "Unable to verify Service payment evidence. Please try again." };
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
  evidence: TransitionEvidence
): string | null {
  switch (nextStatus) {
    case "Quoted":
      return evidence.quotationCount > 0
        ? null
        : "Create a Service quotation before moving this Service to Quoted.";
    case "Approved":
      if (evidence.approvedQuotationCount === 0) {
        return "Approve a Service quotation before moving this Service to Approved.";
      }
      if (evidence.approvedQuotationCount > 1) {
        return "Multiple approved quotations were found. Resolve the quotation state before changing Service status.";
      }
      return null;
    case "Deposit Paid":
      return hasDepositPaymentEvidence(evidence)
        ? null
        : "Create a Deposit Invoice and record a confirmed payment before moving this Service to Deposit Paid.";
    case "In Progress":
      return hasDepositPaymentEvidence(evidence)
        ? null
        : "Confirmed Deposit Invoice payment evidence is required before starting work.";
    case "Completed": {
      const unpaidInvoice = evidence.activeInvoices.find(
        (invoice) => Number(invoice.balance_due ?? 0) > 0
      );

      if (unpaidInvoice) {
        return "This Service still has unpaid active invoices. Complete payment before marking it Completed.";
      }

      if (evidence.approvedQuotationCount !== 1 || evidence.approvedQuotationTotal === null) {
        return "An approved quotation is required before marking this Service Completed.";
      }

      const activeInvoiceTotal = evidence.activeInvoices.reduce(
        (sum, invoice) => sum + Number(invoice.grand_total ?? 0),
        0
      );

      if (evidence.approvedQuotationTotal - activeInvoiceTotal > 0.01) {
        return "Create the remaining invoice before marking this Service Completed.";
      }

      return null;
    }
    case "Cancelled":
      return evidence.nonDeletedInvoiceCount === 0
        ? null
        : "This Service has financial records. Cancellation needs a finance cancellation workflow first.";
    default:
      return "This status transition is not available.";
  }
}

function makeAction(
  status: ServiceStatus,
  blockedReason: string | null
): ServiceStatusTransitionAction {
  return {
    status,
    label: ACTION_COPY[status].label,
    description: ACTION_COPY[status].description,
    blockedReason,
    requiresCancellationReason: status === "Cancelled",
  };
}

function buildTransitionState(
  currentStatus: ServiceStatus,
  evidence: TransitionEvidence | null,
  evidenceError: string | null
): ServiceStatusTransitionState {
  const candidateStatuses = SERVICE_STATUS_ALLOWED_TRANSITIONS[currentStatus] ?? [];

  return {
    currentStatus,
    isTerminal: isTerminalServiceStatus(currentStatus),
    actions: candidateStatuses.map((nextStatus) =>
      makeAction(
        nextStatus,
        evidence ? getPreconditionBlockReason(nextStatus, evidence) : evidenceError
      )
    ),
  };
}

export async function getServiceStatusTransitionState(
  supabase: SupabaseAdminClient,
  serviceId: string,
  currentStatus: ServiceStatus
): Promise<ServiceStatusTransitionState> {
  if (isTerminalServiceStatus(currentStatus)) {
    return buildTransitionState(currentStatus, null, null);
  }

  const evidenceResult = await loadTransitionEvidence(supabase, serviceId);

  if (!evidenceResult.success) {
    return buildTransitionState(currentStatus, null, evidenceResult.error);
  }

  return buildTransitionState(currentStatus, evidenceResult.evidence, null);
}

export async function validateServiceStatusTransition(
  supabase: SupabaseAdminClient,
  serviceId: string,
  currentStatus: ServiceStatus,
  requestedStatus: ServiceStatus,
  cancellationReason?: string | null
): Promise<TransitionValidationResult> {
  if (currentStatus === requestedStatus) {
    return { success: false, error: `Service is already ${currentStatus}.` };
  }

  if (isTerminalServiceStatus(currentStatus)) {
    return { success: false, error: `${currentStatus} Services cannot be changed.` };
  }

  if (!SERVICE_STATUS_ALLOWED_TRANSITIONS[currentStatus]?.includes(requestedStatus)) {
    return { success: false, error: "This Service status transition is not allowed." };
  }

  if (requestedStatus === "Cancelled" && !cancellationReason?.trim()) {
    return { success: false, error: "Cancellation requires a reason." };
  }

  const evidenceResult = await loadTransitionEvidence(supabase, serviceId);

  if (!evidenceResult.success) {
    return { success: false, error: evidenceResult.error };
  }

  const blockedReason = getPreconditionBlockReason(
    requestedStatus,
    evidenceResult.evidence
  );

  if (blockedReason) {
    return { success: false, error: blockedReason };
  }

  return { success: true };
}
