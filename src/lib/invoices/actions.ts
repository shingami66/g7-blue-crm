"use server";

import { requirePermission } from "@/lib/auth/permissions";
import { UnauthorizedError, ForbiddenError } from "@/lib/auth/errors";
import { createAdminClient } from "@/lib/supabase/admin";
import { createInvoiceSchema } from "./schemas";
import { buildInvoiceSnapshotData } from "./snapshots";
import { mapRowToQuotationDetail } from "@/lib/quotations/mappers";
import type { QuotationDetailRow } from "@/lib/quotations/types";
import type { CreateInvoiceResult } from "./types";

const QUOTATION_DETAIL_SELECT = "*, quotation_items(*), customers(company, contact), services(service_number, service_title, status, event_name)";

export async function createInvoiceAction(input: unknown): Promise<CreateInvoiceResult> {
  try {
    await requirePermission("invoices:write");

    const parsed = createInvoiceSchema.safeParse(input);

    if (!parsed.success) {
      return { success: false, error: "invalid_invoice_input" };
    }

    const { quotationId, serviceId } = parsed.data;

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

    try {
      const snapshotData = buildInvoiceSnapshotData(settings, quotationDetail);

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

    // T015A skeleton: validation and RBAC pass.
    // DB write behavior is reserved for T015C.
    return { success: false, error: "invoice_creation_not_implemented_in_this_slice" };
  } catch (err) {
    if (err instanceof UnauthorizedError) return { success: false, error: "Unauthorized" };
    if (err instanceof ForbiddenError) return { success: false, error: "Forbidden" };
    console.error("[createInvoiceAction] Unexpected error:", err instanceof Error ? err.message : "Unknown");
    return { success: false, error: "An unexpected error occurred." };
  }
}
