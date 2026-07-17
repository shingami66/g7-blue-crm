"use server";

import { requirePermission } from "@/lib/auth/permissions";
import { INVOICE_PERMISSIONS } from "@/lib/auth/role-permissions";
import { UnauthorizedError, ForbiddenError } from "@/lib/auth/errors";
import { createAdminClient } from "@/lib/supabase/admin";
import { consumeRateLimit } from "@/lib/security/rate-limit";
import { createInvoiceSchema } from "./schemas";
import { buildInvoiceSnapshotData } from "./snapshots";
import { mapRowToQuotationDetail } from "@/lib/quotations/mappers";
import type { QuotationDetailRow } from "@/lib/quotations/types";
import type { InvoiceStatus } from "@/types/invoice";
import type { CreateInvoiceResult, IssueInvoiceResult } from "./types";
import { resolveInvoiceBillingAuthorityForService } from "../approved-billing-scopes/queries";
import {
  parseAuthoritativeMoney,
  sumAuthoritativeMoney,
} from "./money";
import {
  applyApplicableServiceInvoiceExposurePredicate,
  parseApplicableServiceInvoiceExposureResult,
} from "./exposure";
import { getServiceInvoiceLifecycleDecision } from "./service-invoice-lifecycle";

const QUOTATION_DETAIL_SELECT = "*, quotation_items(*), customers(company, contact), services(service_number, service_title, status, event_name)";
const RATE_LIMIT_ERROR = "Too many attempts. Please wait a moment and try again.";
const CREATE_INVOICE_RATE_LIMIT = { limit: 5, windowMs: 60_000 };
const ISSUE_INVOICE_RATE_LIMIT = { limit: 10, windowMs: 60_000 };

type ApplicablePriorDepositStatus = Exclude<
  InvoiceStatus,
  "cancelled" | "voided"
>;

type PriorDepositRow = {
  id: string;
  invoice_number: string;
  invoice_type: "deposit";
  grand_total: unknown;
  status: ApplicablePriorDepositStatus;
};

const PRIOR_DEPOSIT_QUERY_RESULT_KEYS = ["data", "error"] as const;
const SERVICE_QUERY_RESULT_KEYS = ["data", "error"] as const;
const SERVICE_ROW_KEYS = ["id", "status", "deleted_at"] as const;
const PRIOR_DEPOSIT_ROW_KEYS = [
  "id",
  "invoice_number",
  "invoice_type",
  "grand_total",
  "status",
] as const;

// The query excludes only cancelled and voided canonical Invoice statuses.
const APPLICABLE_PRIOR_DEPOSIT_STATUSES = new Set<ApplicablePriorDepositStatus>([
  "draft",
  "sent",
  "paid",
  "partial",
  "overdue",
]);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function hasOwnDataProperties(
  value: object,
  propertyNames: readonly string[],
): boolean {
  return propertyNames.every((propertyName) => {
    const descriptor = Object.getOwnPropertyDescriptor(value, propertyName);
    return descriptor !== undefined && "value" in descriptor;
  });
}

function isPriorDepositQueryResultContainer(
  value: unknown,
): value is { data: unknown; error: unknown } {
  return (
    isPlainObject(value) &&
    hasOwnDataProperties(value, PRIOR_DEPOSIT_QUERY_RESULT_KEYS)
  );
}

function isServiceQueryResultContainer(
  value: unknown,
): value is { data: unknown; error: unknown } {
  return (
    isPlainObject(value) &&
    hasOwnDataProperties(value, SERVICE_QUERY_RESULT_KEYS)
  );
}

function isCurrentServiceRow(
  value: unknown,
  serviceId: string,
): value is Record<(typeof SERVICE_ROW_KEYS)[number], unknown> {
  return (
    isPlainObject(value) &&
    hasOwnDataProperties(value, SERVICE_ROW_KEYS) &&
    value.id === serviceId
  );
}

function isApplicablePriorDepositStatus(
  value: unknown,
): value is ApplicablePriorDepositStatus {
  return (
    typeof value === "string" &&
    APPLICABLE_PRIOR_DEPOSIT_STATUSES.has(
      value as ApplicablePriorDepositStatus,
    )
  );
}

function isPriorDepositRow(row: unknown): row is PriorDepositRow {
  if (
    !isPlainObject(row) ||
    !hasOwnDataProperties(row, PRIOR_DEPOSIT_ROW_KEYS)
  ) {
    return false;
  }

  return (
    typeof row.id === "string" &&
    row.id.trim().length > 0 &&
    typeof row.invoice_number === "string" &&
    row.invoice_number.trim().length > 0 &&
    row.invoice_type === "deposit" &&
    isApplicablePriorDepositStatus(row.status)
  );
}

export async function createInvoiceAction(input: unknown): Promise<CreateInvoiceResult> {
  try {
    const user = await requirePermission(INVOICE_PERMISSIONS.write);

    if (!consumeRateLimit("createInvoiceAction", user.clerk_user_id, CREATE_INVOICE_RATE_LIMIT)) {
      return { success: false, error: RATE_LIMIT_ERROR };
    }

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

    // 4. Resolve the current Service lifecycle independently from the Quotation projection.
    const serviceQueryResult = await supabase
      .from("services")
      .select("id, status, deleted_at")
      .eq("id", serviceId)
      .maybeSingle();

    if (
      !isServiceQueryResultContainer(serviceQueryResult) ||
      serviceQueryResult.error !== null ||
      !isCurrentServiceRow(serviceQueryResult.data, serviceId)
    ) {
      return { success: false, error: "service_lifecycle_unavailable" };
    }

    const lifecycleDecision = getServiceInvoiceLifecycleDecision({
      status: serviceQueryResult.data.status,
      deletedAt: serviceQueryResult.data.deleted_at,
    });
    const lifecycleDenial =
      invoiceType === "deposit"
        ? lifecycleDecision.depositDenial
        : lifecycleDecision.finalDenial;

    if (lifecycleDenial) {
      return { success: false, error: lifecycleDenial };
    }

    // 5. Compose trusted Quotation data.
    const quotationDetail = mapRowToQuotationDetail(quotationRow as unknown as QuotationDetailRow);

    // 6. Trusted quotation total
    if (typeof quotationDetail.grandTotal !== "number") {
      return { success: false, error: "quotation_total_unavailable" };
    }

    const billingAuthority =
      await resolveInvoiceBillingAuthorityForService(serviceId);

    if (billingAuthority.status === "unavailable") {
      return { success: false, error: "billing_scope_authority_unavailable" };
    }

    if (billingAuthority.status === "historical_only") {
      return { success: false, error: "billing_scope_inactive" };
    }

    const activeScope =
      billingAuthority.status === "active" ? billingAuthority.scope : null;

    const billingCeiling = activeScope
      ? activeScope.acceptedGrandTotal
      : quotationDetail.grandTotal;

    let finalInvoiceAmount = 0;
    const priorDepositsData: Array<{
      id: string;
      invoice_number: string;
      invoice_type: "deposit";
      amount: number;
      status: ApplicablePriorDepositStatus;
    }> = [];
    let activePriorInvoiceTotal = 0;

    if (invoiceType === "deposit") {
      const authoritativeBillingCeiling =
        parseAuthoritativeMoney(billingCeiling);
      if (authoritativeBillingCeiling == null) {
        return { success: false, error: "billing_scope_authority_unavailable" };
      }

      const exposureQueryResult = await applyApplicableServiceInvoiceExposurePredicate(
        supabase.from("invoices").select("id, grand_total"),
        serviceId,
      );
      const exposureResult = parseApplicableServiceInvoiceExposureResult(
        exposureQueryResult,
      );
      if (exposureResult.status !== "success") {
        return { success: false, error: "invoice_exposure_unavailable" };
      }

      const remainingBillable =
        authoritativeBillingCeiling - exposureResult.exposure;
      if (
        !Number.isFinite(remainingBillable) ||
        remainingBillable < 0 ||
        requestedAmount! > remainingBillable
      ) {
        return { success: false, error: "deposit_amount_exceeds_remaining" };
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
      const priorDepositsResult = await supabase
        .from("invoices")
        .select("id, invoice_number, invoice_type, grand_total, status")
        .eq("service_id", serviceId)
        .eq("invoice_type", "deposit")
        .not("status", "in", '("voided","cancelled")')
        .is("voided_at", null)
        .eq("is_deleted", false);

      if (!isPriorDepositQueryResultContainer(priorDepositsResult)) {
        return { success: false, error: "prior_invoice_lookup_failed" };
      }

      if (priorDepositsResult.error !== null) {
        if (priorDepositsResult.error) {
          console.error("[createInvoiceAction] Error querying prior deposits:", priorDepositsResult.error);
        }
        return { success: false, error: "prior_invoice_lookup_failed" };
      }

      if (!Array.isArray(priorDepositsResult.data)) {
        return { success: false, error: "prior_invoice_lookup_failed" };
      }

      for (const priorDeposit of priorDepositsResult.data) {
        if (!isPriorDepositRow(priorDeposit)) {
          return { success: false, error: "prior_invoice_lookup_failed" };
        }

        const amount = parseAuthoritativeMoney(priorDeposit.grand_total);
        if (amount == null) {
          return { success: false, error: "prior_invoice_lookup_failed" };
        }

        priorDepositsData.push({
          id: priorDeposit.id,
          invoice_number: priorDeposit.invoice_number,
          invoice_type: priorDeposit.invoice_type,
          amount,
          status: priorDeposit.status,
        });
      }

      const priorDepositTotal = sumAuthoritativeMoney(
        priorDepositsData.map((deposit) => deposit.amount),
      );
      if (priorDepositTotal == null) {
        return { success: false, error: "prior_invoice_lookup_failed" };
      }
      activePriorInvoiceTotal = priorDepositTotal;

      finalInvoiceAmount = billingCeiling - activePriorInvoiceTotal;

      if (finalInvoiceAmount < 0) {
        return { success: false, error: activeScope ? "prior_invoices_exceed_billing_scope_ceiling" : "prior_invoices_exceed_quotation_total" };
      }
    }

    const { data: settings, error: settingsError } = await supabase
      .from("company_settings")
      .select("*")
      .eq("setting_key", "default")
      .maybeSingle();

    if (settingsError || !settings || !settings.vat_mode) {
      return { success: false, error: "company_settings_unavailable" };
    }

    if (settings.vat_mode !== "not_registered") {
      return { success: false, error: "vat_registered_invoice_not_implemented_in_this_slice" };
    }

    let snapshotData;
    try {
      snapshotData = buildInvoiceSnapshotData(settings, quotationDetail, activeScope, finalInvoiceAmount, invoiceType);

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

    if (invoiceType === "final") {
      // Persist final settlement basis in snapshots
      snapshotData.snapshot_quotation = {
        ...(snapshotData.snapshot_quotation && typeof snapshotData.snapshot_quotation === "object" ? (snapshotData.snapshot_quotation as Record<string, unknown>) : {}),
        final_invoice_settlement: {
          method: "SIMPLE_SUM_FOR_T018",
          approved_quotation_total: quotationDetail.grandTotal,
          approved_billing_scope_total: activeScope ? activeScope.acceptedGrandTotal : null,
          billing_ceiling: billingCeiling,
          active_prior_invoice_total: activePriorInvoiceTotal,
          final_invoice_amount: finalInvoiceAmount,
          prior_invoices: priorDepositsData.map(d => ({
            id: d.id,
            invoice_number: d.invoice_number,
            invoice_type: d.invoice_type,
            amount: d.amount,
            status: d.status
          })),
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
        approved_billing_scope_id: activeScope?.id ?? null,
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

      if (insertError) {
        const errorMsg = insertError.message || "";
        if (errorMsg.includes("exceeds active billing scope ceiling")) {
          return { success: false, error: "invoice_amount_exceeds_ceiling" };
        }
        if (errorMsg.trim() === "billing_scope_inactive") {
          return { success: false, error: "billing_scope_inactive" };
        }
        if (errorMsg.includes("not active or is voided/superseded")) {
          return { success: false, error: "billing_scope_inactive" };
        }
        if (errorMsg.includes("must match invoice service_id")) {
          return { success: false, error: "billing_scope_service_mismatch" };
        }
        if (errorMsg.includes("grand_total cannot be null")) {
          return { success: false, error: "invoice_grand_total_invalid" };
        }
      }

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
    const user = await requirePermission(INVOICE_PERMISSIONS.write);

    if (!consumeRateLimit("issueInvoiceAction", user.clerk_user_id, ISSUE_INVOICE_RATE_LIMIT)) {
      return { success: false, error: RATE_LIMIT_ERROR };
    }

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
