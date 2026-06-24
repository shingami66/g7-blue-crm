import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ServiceBillingState } from "./types";

export async function getServiceBillingState(serviceId: string): Promise<ServiceBillingState> {
  const defaultState: ServiceBillingState = {
    serviceId: serviceId || "",
    approvedQuotation: null,
    depositInvoice: null,
    finalInvoice: null,
    activePriorInvoiceTotal: 0,
    remainingUninvoicedAmount: 0,
    canCreateDepositInvoice: false,
    canCreateFinalInvoice: false,
    disabledReasons: [],
  };

  if (!serviceId) {
    return {
      ...defaultState,
      disabledReasons: ["missing_service_id"]
    };
  }

  const supabase = createAdminClient();

  try {
    // 1. Fetch approved quotations for the service
    const { data: quotations, error: quotationsError } = await supabase
      .from("quotations")
      .select("id, quotation_number, status, grand_total, created_at")
      .eq("service_id", serviceId)
      .eq("status", "approved")
      .eq("is_deleted", false)
      .order("created_at", { ascending: false });

    if (quotationsError) {
      console.error("[getServiceBillingState] Error fetching quotations:", quotationsError);
      return {
        ...defaultState,
        disabledReasons: ["billing_state_unavailable"]
      };
    }

    const approvedQuotationRow = quotations && quotations.length > 0 ? quotations[0] : null;

    if (approvedQuotationRow) {
      defaultState.approvedQuotation = {
        id: approvedQuotationRow.id,
        quotationNumber: approvedQuotationRow.quotation_number,
        status: "approved",
        grandTotal: Number(approvedQuotationRow.grand_total || 0),
      };
    } else {
      defaultState.disabledReasons.push("approved_quotation_required");
    }

    // 2. Fetch active invoices for the service
    const { data: invoices, error: invoicesError } = await supabase
      .from("invoices")
      .select("id, invoice_number, invoice_type, status, grand_total, created_at")
      .eq("service_id", serviceId)
      .eq("is_deleted", false)
      .is("voided_at", null)
      .not("status", "in", '("voided","cancelled")')
      .order("created_at", { ascending: false });

    if (invoicesError) {
      console.error("[getServiceBillingState] Error fetching invoices:", invoicesError);
      return {
        ...defaultState,
        disabledReasons: ["billing_state_unavailable"]
      };
    }

    const depositInvoices = invoices?.filter(inv => inv.invoice_type === "deposit") || [];
    const finalInvoices = invoices?.filter(inv => inv.invoice_type === "final") || [];

    // Defensively handle duplicate deposits
    if (depositInvoices.length > 0) {
      const firstDeposit = depositInvoices[0];
      defaultState.depositInvoice = {
        id: firstDeposit.id,
        invoiceNumber: firstDeposit.invoice_number,
        invoiceType: "deposit",
        status: firstDeposit.status,
        amount: Number(firstDeposit.grand_total || 0),
      };

      if (depositInvoices.length > 1) {
        defaultState.disabledReasons.push("duplicate_active_deposit_invoices");
      }
    }

    // Defensively handle duplicate finals
    if (finalInvoices.length > 0) {
      const firstFinal = finalInvoices[0];
      defaultState.finalInvoice = {
        id: firstFinal.id,
        invoiceNumber: firstFinal.invoice_number,
        invoiceType: "final",
        status: firstFinal.status,
        amount: Number(firstFinal.grand_total || 0),
      };

      if (finalInvoices.length > 1) {
        defaultState.disabledReasons.push("duplicate_active_final_invoices");
      }
    }

    // 3. Amount calculations
    defaultState.activePriorInvoiceTotal = depositInvoices.reduce((sum, inv) => sum + Number(inv.grand_total || 0), 0);
    
    if (defaultState.approvedQuotation) {
      defaultState.remainingUninvoicedAmount = defaultState.approvedQuotation.grandTotal - defaultState.activePriorInvoiceTotal;
    } else {
      defaultState.remainingUninvoicedAmount = 0;
    }

    if (defaultState.remainingUninvoicedAmount < 0) {
      defaultState.disabledReasons.push("prior_invoices_exceed_quotation_total");
    }

    if (defaultState.depositInvoice) {
      defaultState.disabledReasons.push("deposit_invoice_already_exists");
    }
    
    if (defaultState.finalInvoice) {
      defaultState.disabledReasons.push("final_invoice_already_exists");
    }

    // 4. Can-create flags
    const hasBlockersForDeposit = defaultState.disabledReasons.length > 0;
    defaultState.canCreateDepositInvoice = !hasBlockersForDeposit;

    const blockersForFinal = defaultState.disabledReasons.filter(r => r !== "deposit_invoice_already_exists");
    defaultState.canCreateFinalInvoice = blockersForFinal.length === 0;

    return defaultState;

  } catch (err) {
    console.error("[getServiceBillingState] Unexpected error:", err instanceof Error ? err.message : "Unknown");
    return {
      ...defaultState,
      disabledReasons: ["billing_state_unavailable"]
    };
  }
}
