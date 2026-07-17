import "server-only";
import { createAdminClient } from "../supabase/admin.ts";
import {
  parseAuthoritativeMoney,
} from "./money.ts";
import {
  applyApplicableServiceInvoiceExposurePredicate,
  parseApplicableServiceInvoiceExposureResult,
} from "./exposure.ts";
import type {
  BillingInvoiceSummary,
  ServiceBillingAuthorityMode,
  ServiceBillingState,
} from "./types";

type ScopeRow = {
  id: string;
  status: string;
  accepted_grand_total: unknown;
  source_quotation_id: string;
  superseded_at: string | null;
  voided_at: string | null;
};

type QuotationRow = {
  id: string;
  quotation_number: string;
  grand_total: unknown;
};

type InvoiceRow = {
  id: string;
  invoice_number: string;
  invoice_type: string;
  status: string;
  grand_total: unknown;
};

function isActiveApprovedScope(scope: ScopeRow): boolean {
  return (
    scope.status === "approved" &&
    scope.superseded_at == null &&
    scope.voided_at == null
  );
}

function createDefaultBillingState(serviceId: string): ServiceBillingState {
  return {
    serviceId: serviceId || "",
    authorityMode: "unavailable",
    approvedQuotation: null,
    billingCeiling: null,
    activeBillingScopeId: null,
    depositInvoice: null,
    finalInvoice: null,
    activePriorInvoiceTotal: null,
    remainingUninvoicedAmount: null,
    canCreateDepositInvoice: false,
    canCreateFinalInvoice: false,
    disabledReasons: [],
  };
}

function failBillingState(
  state: ServiceBillingState,
  reason: string,
): ServiceBillingState {
  return {
    ...state,
    authorityMode: "unavailable",
    billingCeiling: null,
    activeBillingScopeId: null,
    activePriorInvoiceTotal: null,
    remainingUninvoicedAmount: null,
    canCreateDepositInvoice: false,
    canCreateFinalInvoice: false,
    disabledReasons: [reason],
  };
}

function mapInvoiceSummary(
  invoice: InvoiceRow,
  invoiceType: "deposit" | "final",
): BillingInvoiceSummary {
  return {
    id: invoice.id,
    invoiceNumber: invoice.invoice_number,
    invoiceType,
    status: invoice.status,
    amount: parseAuthoritativeMoney(invoice.grand_total),
  };
}

export async function getServiceBillingState(
  serviceId: string,
): Promise<ServiceBillingState> {
  const state = createDefaultBillingState(serviceId);

  if (!serviceId) {
    return failBillingState(state, "missing_service_id");
  }

  const supabase = createAdminClient();

  try {
    const { data: scopeRows, error: scopesError } = await supabase
      .from("approved_billing_scopes")
      .select(
        "id, status, accepted_grand_total, source_quotation_id, superseded_at, voided_at",
      )
      .eq("service_id", serviceId);

    if (scopesError || !Array.isArray(scopeRows)) {
      console.error(
        "[getServiceBillingState] Error fetching billing scopes:",
        scopesError,
      );
      return failBillingState(state, "billing_state_unavailable");
    }

    const scopes = scopeRows as ScopeRow[];
    const activeScopes = scopes.filter(isActiveApprovedScope);
    if (activeScopes.length > 1) {
      return failBillingState(state, "billing_state_unavailable");
    }

    const activeScope = activeScopes[0] ?? null;
    const hasAbsHistory = scopes.length > 0;

    const { data: quotationRows, error: quotationsError } = await supabase
      .from("quotations")
      .select("id, quotation_number, status, grand_total, created_at")
      .eq("service_id", serviceId)
      .eq("status", "approved")
      .eq("is_deleted", false)
      .order("created_at", { ascending: false });

    if (quotationsError || !Array.isArray(quotationRows)) {
      console.error(
        "[getServiceBillingState] Error fetching quotations:",
        quotationsError,
      );
      return failBillingState(state, "billing_state_unavailable");
    }

    const quotations = quotationRows as QuotationRow[];
    const approvedQuotationRow =
      quotations.length > 0
        ? activeScope
          ? quotations.find(
              (quotation) => quotation.id === activeScope.source_quotation_id,
            ) ?? quotations[0]
          : quotations[0]
        : null;

    if (approvedQuotationRow) {
      state.approvedQuotation = {
        id: approvedQuotationRow.id,
        quotationNumber: approvedQuotationRow.quotation_number,
        status: "approved",
        grandTotal: parseAuthoritativeMoney(
          approvedQuotationRow.grand_total,
        ),
      };

      if (state.approvedQuotation.grandTotal == null) {
        return failBillingState(state, "billing_state_unavailable");
      }
    }

    let authorityMode: ServiceBillingAuthorityMode;
    let billingCeiling: number | null = null;

    if (activeScope) {
      billingCeiling = parseAuthoritativeMoney(
        activeScope.accepted_grand_total,
      );
      if (billingCeiling == null) {
        return failBillingState(state, "billing_state_unavailable");
      }

      authorityMode = "active_abs";
      state.activeBillingScopeId = activeScope.id;
    } else if (hasAbsHistory) {
      authorityMode = "historical_abs_only";
      state.disabledReasons.push("abs_historical_authority_no_active");
    } else if (state.approvedQuotation) {
      authorityMode = "legacy_quotation";
      billingCeiling = state.approvedQuotation.grandTotal;
    } else {
      authorityMode = "no_authority";
      state.disabledReasons.push("approved_quotation_required");
    }

    state.authorityMode = authorityMode;
    state.billingCeiling = billingCeiling;

    const invoiceQueryResult = await applyApplicableServiceInvoiceExposurePredicate(
      supabase
        .from("invoices")
        .select("id, invoice_number, invoice_type, status, grand_total, created_at")
        .order("created_at", { ascending: false }),
      serviceId,
    );
    const invoiceExposureResult =
      parseApplicableServiceInvoiceExposureResult(invoiceQueryResult);

    const invoices = (invoiceExposureResult.rows ?? []) as InvoiceRow[];
    const depositInvoices = invoices.filter(
      (invoice) => invoice.invoice_type === "deposit",
    );
    const finalInvoices = invoices.filter(
      (invoice) => invoice.invoice_type === "final",
    );

    if (depositInvoices.length > 0) {
      state.depositInvoice = mapInvoiceSummary(depositInvoices[0], "deposit");
      if (depositInvoices.length > 1) {
        state.disabledReasons.push("duplicate_active_deposit_invoices");
      }
    }

    if (finalInvoices.length > 0) {
      state.finalInvoice = mapInvoiceSummary(finalInvoices[0], "final");
      if (finalInvoices.length > 1) {
        state.disabledReasons.push("duplicate_active_final_invoices");
      }
    }

    if (invoiceExposureResult.status !== "success") {
      console.error(
        "[getServiceBillingState] Error fetching invoices:",
        "Invoice exposure unavailable",
      );
      state.disabledReasons.push("invoice_exposure_unavailable");
      return state;
    }

    const invoiceExposure = invoiceExposureResult.exposure;

    state.activePriorInvoiceTotal = invoiceExposure;

    if (billingCeiling != null) {
      state.remainingUninvoicedAmount = Math.max(
        0,
        billingCeiling - invoiceExposure,
      );

      if (invoiceExposure > billingCeiling) {
        state.disabledReasons.push(
          authorityMode === "active_abs"
            ? "prior_invoices_exceed_billing_scope_ceiling"
            : "prior_invoices_exceed_quotation_total",
        );
      }
    }

    if (state.depositInvoice) {
      state.disabledReasons.push("deposit_invoice_already_exists");
    }

    if (state.finalInvoice) {
      state.disabledReasons.push("final_invoice_already_exists");
    }

    const canBill =
      authorityMode === "active_abs" || authorityMode === "legacy_quotation";
    if (!canBill || state.remainingUninvoicedAmount == null) {
      return state;
    }

    state.canCreateDepositInvoice = state.disabledReasons.length === 0;
    const finalBlockers = state.disabledReasons.filter(
      (reason) => reason !== "deposit_invoice_already_exists",
    );
    state.canCreateFinalInvoice = finalBlockers.length === 0;

    return state;
  } catch (error) {
    console.error(
      "[getServiceBillingState] Unexpected error:",
      error instanceof Error ? error.message : "Unknown",
    );
    return failBillingState(state, "billing_state_unavailable");
  }
}
