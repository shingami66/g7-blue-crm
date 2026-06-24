"use server";

import { requirePermission } from "@/lib/auth/permissions";
import { UnauthorizedError, ForbiddenError } from "@/lib/auth/errors";
import { createAdminClient } from "@/lib/supabase/admin";
import { createInvoiceSchema } from "./schemas";
import { buildInvoiceSnapshotData } from "./snapshots";
import { mapRowToQuotationDetail } from "@/lib/quotations/mappers";
import type { QuotationDetailRow } from "@/lib/quotations/types";
import type { CreateInvoiceResult, IssueInvoiceResult } from "./types";

const QUOTATION_DETAIL_SELECT = "*, quotation_items(*), customers(company, contact), services(service_number, service_title, status, event_name)";

export async function createInvoiceAction(input: unknown): Promise<CreateInvoiceResult> {
  try {
    await requirePermission("invoices:write");

    const parsed = createInvoiceSchema.safeParse(input);

    if (!parsed.success) {
      return { success: false, error: "invalid_invoice_input" };
    }

    const { quotationId, serviceId, invoiceType, requestedAmount } = parsed.data;

    if (invoiceType === "deposit") {
      if (requestedAmount === undefined || requestedAmount === null) {
        return { success: false, error: "deposit_amount_required" };
      }

      if (typeof requestedAmount !== "number" || !Number.isFinite(requestedAmount) || requestedAmount <= 0) {
        return { success: false, error: "invalid_deposit_amount" };
      }
    }

    const supabase = createAdminClient();

    // 1. Fetch quotation
    const { data: quotationRow, error: quotationError } = await supabase
      .from("quotations")
      .select(QUOTATION_DETAIL_SELECT)
      .eq("id", quotationId)
      .eq("is_deleted", false)
      .single();

    if (quotationError || !quotationRow) {
      return { success: false, error: "quotation_not_found" };
    }

    // 2. Validate quotation status
    if (quotationRow.status !== "approved") {
      return { success: false, error: "quotation_not_approved" };
    }

    // 3. Validate quotation/service alignment
    if (quotationRow.service_id !== serviceId) {
      return { success: false, error: "quotation_service_mismatch" };
    }

    // 4. Fetch company settings
    const { data: settings, error: settingsError } = await supabase
      .from("company_settings")
      .select("*")
      .eq("setting_key", "default")
      .maybeSingle();

    if (settingsError || !settings || !settings.vat_mode) {
      return { success: false, error: "company_settings_unavailable" };
    }

    // 5. Compose snapshot data
    const quotationDetail = mapRowToQuotationDetail(quotationRow as unknown as QuotationDetailRow);

    let snapshotData;
    try {
      snapshotData = buildInvoiceSnapshotData(settings, quotationDetail);

      if (
        !snapshotData ||
        !snapshotData.snapshot_seller ||
        !snapshotData.snapshot_buyer ||
        !snapshotData.snapshot_quotation ||
        !snapshotData.snapshot_bank_details ||
        !snapshotData.snapshot_document_rules ||
        !snapshotData.vat_mode ||
        typeof snapshotData.vat_rate !== "number" ||
        !snapshotData.document_label
      ) {
        return { success: false, error: "invoice_snapshot_unavailable" };
      }
    } catch (err) {
      console.error("[createInvoiceAction] Snapshot error:", err instanceof Error ? err.message : "Unknown");
      return { success: false, error: "invoice_snapshot_unavailable" };
    }

    // 6. Trusted quotation total
    if (typeof quotationDetail.grandTotal !== "number") {
      return { success: false, error: "quotation_total_unavailable" };
    }

    // 7. Reject VAT registered modes for this slice
    if (snapshotData.vat_mode !== "not_registered") {
      return { success: false, error: "vat_registered_invoice_not_implemented_in_this_slice" };
    }

    let finalInvoiceAmount = 0;

    if (invoiceType === "deposit") {
      if (requestedAmount! > quotationDetail.grandTotal) {
        return { success: false, error: "deposit_amount_exceeds_quotation_total" };
      }
      finalInvoiceAmount = requestedAmount!;

      // 8. Check for existing active deposit invoice
      // NOTE: "voided" is in the TypeScript InvoiceStatus union but not yet in the DB CHECK.
      // DB will reject status = "voided" until the void/credit-note migration is applied.
      // The duplicate guard filters it anyway for future-proofing.
      const { data: existingDeposit, error: existingDepositError } = await supabase
        .from("invoices")
        .select("id")
        .eq("approved_quotation_id", quotationId)
        .eq("service_id", serviceId)
        .eq("invoice_type", "deposit")
        .not("status", "in", '("voided","cancelled")')
        .is("voided_at", null)
        .eq("is_deleted", false)
        .maybeSingle();

      if (existingDepositError && existingDepositError.code !== "PGRST116") {
        console.error("[createInvoiceAction] Error checking existing deposit:", existingDepositError);
        return { success: false, error: "deposit_invoice_already_exists" };
      }
      if (existingDeposit) {
        return { success: false, error: "deposit_invoice_already_exists" };
      }
    } else {
      // 8. Final invoice logic

      // Prevent duplicate active final invoice
      const { data: existingFinal, error: existingFinalError } = await supabase
        .from("invoices")
        .select("id")
        .eq("service_id", serviceId)
        .eq("invoice_type", "final")
        .not("status", "in", '("voided","cancelled")')
        .is("voided_at", null)
        .eq("is_deleted", false)
        .maybeSingle();

      if (existingFinalError && existingFinalError.code !== "PGRST116") {
        console.error("[createInvoiceAction] Error checking existing final:", existingFinalError);
        return { success: false, error: "final_invoice_already_exists" };
      }
      if (existingFinal) {
        return { success: false, error: "final_invoice_already_exists" };
      }

      // Find active prior deposit invoices
      const { data: priorDeposits, error: priorDepositsError } = await supabase
        .from("invoices")
        .select("id, invoice_number, invoice_type, grand_total, status")
        .eq("service_id", serviceId)
        .eq("invoice_type", "deposit")
        .not("status", "in", '("voided","cancelled")')
        .is("voided_at", null)
        .eq("is_deleted", false);

      if (priorDepositsError) {
        console.error("[createInvoiceAction] Error querying prior deposits:", priorDepositsError);
        return { success: false, error: "prior_invoice_lookup_failed" };
      }

      const activePriorInvoiceTotal = priorDeposits
        ? priorDeposits.reduce((sum, inv) => sum + Number(inv.grand_total || 0), 0)
        : 0;

      finalInvoiceAmount = quotationDetail.grandTotal - activePriorInvoiceTotal;

      if (finalInvoiceAmount < 0) {
        return { success: false, error: "prior_invoices_exceed_quotation_total" };
      }

      // Persist final settlement basis in snapshots
      snapshotData.snapshot_quotation = {
        ...(snapshotData.snapshot_quotation && typeof snapshotData.snapshot_quotation === "object" ? (snapshotData.snapshot_quotation as Record<string, unknown>) : {}),
        final_invoice_settlement: {
          method: "SIMPLE_SUM_FOR_T018",
          approved_quotation_total: quotationDetail.grandTotal,
          active_prior_invoice_total: activePriorInvoiceTotal,
          final_invoice_amount: finalInvoiceAmount,
          prior_invoices: priorDeposits?.map(d => ({
            id: d.id,
            invoice_number: d.invoice_number,
            invoice_type: d.invoice_type,
            amount: Number(d.grand_total || 0),
            status: d.status
          })) || [],
          payments_excluded: true,
          invoice_prepayment_applications_used: false
        }
      } as unknown as string;
    }

    // 9. Generate invoice number
    const { data: invoiceNumber, error: invoiceNumberError } = await supabase
      .rpc("generate_document_number", { doc_type: "invoice" });

    if (invoiceNumberError || !invoiceNumber) {
      console.error("[createInvoiceAction] Invoice number error:", invoiceNumberError);
      return { success: false, error: "invoice_number_unavailable" };
    }

    if (!quotationRow.customer_id) {
      return { success: false, error: "invoice_customer_unavailable" };
    }

    const today = new Date().toISOString().slice(0, 10);

    // 10. Insert invoice
    const { data: insertedInvoice, error: insertError } = await supabase
      .from("invoices")
      .insert({
        invoice_number: invoiceNumber,
        customer_id: quotationRow.customer_id,
        approved_quotation_id: quotationId,
        service_id: serviceId,
        date: today,
        due_date: today,
        invoice_type: invoiceType,
        status: "draft",
        subtotal: finalInvoiceAmount,
        vat_rate: 0,
        vat_amount: 0,
        grand_total: finalInvoiceAmount,
        amount_paid: 0,
        balance_due: finalInvoiceAmount,
        document_label: snapshotData.document_label,
        vat_mode: snapshotData.vat_mode,
        snapshot_seller: snapshotData.snapshot_seller,
        snapshot_buyer: snapshotData.snapshot_buyer,
        snapshot_quotation: snapshotData.snapshot_quotation,
        snapshot_bank_details: snapshotData.snapshot_bank_details,
        snapshot_document_rules: snapshotData.snapshot_document_rules,
        issued_at: null,
      })
      .select("id, invoice_number")
      .single();

    if (insertError || !insertedInvoice) {
      console.error("[createInvoiceAction] Invoice insert failed:", insertError);
      return { success: false, error: "invoice_insert_failed" };
    }

    return {
      success: true,
      invoiceId: insertedInvoice.id,
      invoiceNumber: insertedInvoice.invoice_number,
    };
  } catch (err) {
    if (err instanceof UnauthorizedError) return { success: false, error: "Unauthorized" };
    if (err instanceof ForbiddenError) return { success: false, error: "Forbidden" };
    console.error("[createInvoiceAction] Unexpected error:", err instanceof Error ? err.message : "Unknown");
    return { success: false, error: "An unexpected error occurred." };
  }
}

export async function issueInvoiceAction(invoiceId: string): Promise<IssueInvoiceResult> {
  try {
    await requirePermission("invoices:write");

    if (!invoiceId || typeof invoiceId !== "string") {
      return { success: false, error: "invalid_invoice_id" };
    }

    const supabase = createAdminClient();

    const { data: invoice, error: fetchError } = await supabase
      .from("invoices")
      .select("id, status, is_deleted")
      .eq("id", invoiceId)
      .maybeSingle();

    if (fetchError || !invoice) {
      return { success: false, error: "invoice_not_found" };
    }

    if (invoice.is_deleted) {
      return { success: false, error: "invoice_not_found" };
    }

    if (invoice.status !== "draft") {
      return { success: false, error: "invoice_not_draft" };
    }

    const { data: updatedInvoice, error: updateError } = await supabase
      .from("invoices")
      .update({
        status: "sent",
        issued_at: new Date().toISOString(),
      })
      .eq("id", invoiceId)
      .eq("status", "draft")
      .select("id")
      .maybeSingle();

    if (updateError) {
      console.error("[issueInvoiceAction] Invoice update failed:", updateError);
      return { success: false, error: "invoice_update_failed" };
    }

    if (!updatedInvoice) {
      return { success: false, error: "invoice_not_draft" };
    }

    return { success: true };
  } catch (err) {
    if (err instanceof UnauthorizedError) return { success: false, error: "Unauthorized" };
    if (err instanceof ForbiddenError) return { success: false, error: "Forbidden" };
    console.error("[issueInvoiceAction] Unexpected error:", err instanceof Error ? err.message : "Unknown");
    return { success: false, error: "An unexpected error occurred." };
  }
}
