"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requirePermission } from "@/lib/auth/permissions";
import { UnauthorizedError, ForbiddenError } from "@/lib/auth/errors";
import { consumeRateLimit } from "@/lib/security/rate-limit";
import { getServiceById } from "@/lib/services/queries";
import {
  executeQuotationApprovalActivation,
  type QuotationApprovalActivationData,
} from "./approval-contract";
import {
  createQuotationSchema,
  quotationCommercialStructureSchema,
  updateQuotationSchema,
} from "./schemas";
import type { QuotationRpcResult } from "./types";

export interface QuotationCommercialStructureResult {
  quotation_id: string;
  line_count: number;
  subtotal: number;
  discount: number;
  vat_amount: number;
  grand_total: number;
}

export type QuotationActionErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "RATE_LIMITED"
  | "INVALID_INPUT"
  | "SERVICE_UNAVAILABLE"
  | "SERVICE_STATUS_INVALID"
  | "INVALID_VALIDITY_WINDOW"
  | "MUTATION_KEY_CONFLICT"
  | "CREATE_FAILED"
  | "STRUCTURE_UPDATE_FAILED"
  | "UNKNOWN_ERROR";

export type ActionResult<T = void> = {
  success: boolean;
  error?: string;
  code?: QuotationActionErrorCode;
  data?: T;
};

const RATE_LIMIT_ERROR = "Too many attempts. Please wait a moment and try again.";
const CREATE_QUOTATION_RATE_LIMIT = { limit: 5, windowMs: 60_000 };
const APPROVAL_RATE_LIMIT = { limit: 10, windowMs: 60_000 };

function serviceCanReceiveQuotation(status: string) {
  return status === "Inquiry" || status === "Quoted";
}

const VALID_AFTER_SERVICE_START_ERROR =
  "Quotation cannot remain valid after the service begins.";
const SERVICE_ALREADY_STARTED_ERROR =
  "Cannot create a quotation because the service has already started.";

function validateQuotationValidityWindow(
  validUntil: string | null | undefined,
  issueDate: string | null | undefined,
  serviceStartDate: string | null | undefined
) {
  if (serviceStartDate && issueDate && serviceStartDate < issueDate) {
    return SERVICE_ALREADY_STARTED_ERROR;
  }

  if (validUntil && issueDate && validUntil < issueDate) {
    return "Valid until date must be on or after the quotation date";
  }

  if (validUntil && serviceStartDate && validUntil > serviceStartDate) {
    return VALID_AFTER_SERVICE_START_ERROR;
  }

  return null;
}

async function getExistingQuotationForUpdate(
  supabase: ReturnType<typeof createAdminClient>,
  id: string
) {
  const { data, error } = await supabase
    .from("quotations")
    .select("id, service_id, date, valid_until, status, quotation_items(commercial_role)")
    .eq("id", id)
    .eq("is_deleted", false)
    .single();

  if (error) {
    console.error("[getExistingQuotationForUpdate] Supabase error:", error.message);
    return null;
  }

  return data;
}

export async function createQuotation(input: unknown): Promise<ActionResult<QuotationRpcResult>> {
  try {
    const user = await requirePermission("quotations:write");
    await requirePermission("services:read");

    if (!consumeRateLimit("createQuotation", user.clerk_user_id, CREATE_QUOTATION_RATE_LIMIT)) {
      return { success: false, code: "RATE_LIMITED", error: RATE_LIMIT_ERROR };
    }

    const parsed = createQuotationSchema.safeParse(input);

    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? "Validation failed";
      return { success: false, code: "INVALID_INPUT", error: firstError };
    }

    const service = await getServiceById(parsed.data.service_id);
    if (!service) {
      return { success: false, code: "SERVICE_UNAVAILABLE", error: "Service not found or unavailable." };
    }
    if (!serviceCanReceiveQuotation(service.status)) {
      return { success: false, code: "SERVICE_STATUS_INVALID", error: "Quotations can only be created for Inquiry or Quoted services." };
    }

    const validityError = validateQuotationValidityWindow(
      parsed.data.valid_until,
      parsed.data.date,
      service.eventStartDate
    );
    if (validityError) {
      return { success: false, code: "INVALID_VALIDITY_WINDOW", error: validityError };
    }

    const { items, ...quotationData } = parsed.data;

    const supabase = createAdminClient();
    const { data, error } = await supabase.rpc("create_quotation_with_items", {
      p_quotation: quotationData,
      p_items: items,
      p_user_id: user.clerk_user_id,
    });

    if (error) {
      console.error("[createQuotation] Supabase error:", error.message);
      return { success: false, code: "CREATE_FAILED", error: "Failed to create quotation. Please try again." };
    }

    const row = data?.[0];
    if (!row) {
      return { success: false, code: "CREATE_FAILED", error: "Failed to create quotation. Please try again." };
    }

    if (row.error_code) {
      if (row.error_code === "mutation_key_conflict") {
        return {
          success: false,
          code: "MUTATION_KEY_CONFLICT",
          error: "A Quotation creation attempt with these request details already exists. Start a new Quotation creation attempt and try again.",
        };
      }
      if (row.error_code === "service_unavailable") {
        return { success: false, code: "SERVICE_UNAVAILABLE", error: "Service not found or unavailable." };
      }
      if (row.error_code === "service_status_invalid") {
        return { success: false, code: "SERVICE_STATUS_INVALID", error: "Quotations can only be created for Inquiry or Quoted services." };
      }
      if (row.error_code === "invalid_input" || row.error_code === "missing_mutation_key") {
        return { success: false, code: "INVALID_INPUT", error: "Invalid quotation input." };
      }
      return { success: false, code: "CREATE_FAILED", error: "Failed to create quotation. Please try again." };
    }

    if (!row.quotation_id) {
      return { success: false, code: "CREATE_FAILED", error: "Failed to create quotation. Please try again." };
    }

    revalidatePath("/quotations");
    revalidatePath(`/services/${parsed.data.service_id}`);
    return {
      success: true,
      data: {
        quotation_id: row.quotation_id,
        quotation_number: row.quotation_number,
        subtotal: Number(row.subtotal),
        discount: Number(row.discount),
        vat_amount: Number(row.vat_amount),
        grand_total: Number(row.grand_total),
        is_replayed: Boolean(row.is_replayed),
        isReplayed: Boolean(row.is_replayed),
      },
    };
  } catch (err) {
    if (err instanceof UnauthorizedError) return { success: false, code: "UNAUTHORIZED", error: "Unauthorized" };
    if (err instanceof ForbiddenError) return { success: false, code: "FORBIDDEN", error: "Forbidden" };
    console.error("[createQuotation] Unexpected error:", err instanceof Error ? err.message : "Unknown");
    return { success: false, code: "UNKNOWN_ERROR", error: "An unexpected error occurred." };
  }
}

export async function updateQuotation(id: string, input: unknown): Promise<ActionResult<QuotationRpcResult>> {
  try {
    const user = await requirePermission("quotations:write");
    await requirePermission("services:read");
    const parsed = updateQuotationSchema.safeParse(input);

    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? "Validation failed";
      return { success: false, error: firstError };
    }

    const { items, ...quotationData } = parsed.data;

    // Filter out undefined keys to match RPC fallback behavior effectively
    const updates: Record<string, string | number | null> = {};
    for (const [key, value] of Object.entries(quotationData)) {
      if (value !== undefined) {
        updates[key] = value;
      }
    }

    const supabase = createAdminClient();
    const existingQuotation = await getExistingQuotationForUpdate(supabase, id);
    if (!existingQuotation) {
      return { success: false, error: "Quotation not found or already deleted." };
    }

    if (existingQuotation.status !== "draft") {
      return { success: false, error: "Only draft quotations can be edited." };
    }

    // The legacy replace-all RPC cannot carry W2A hierarchy metadata. Fail
    // closed instead of silently flattening an already structured draft.
    const existingItems = Array.isArray(existingQuotation.quotation_items)
      ? existingQuotation.quotation_items
      : [];
    if (existingItems.some((item) => item?.commercial_role && item.commercial_role !== "authority_line")) {
      return {
        success: false,
        error: "Structured quotations must be edited through the Authority Line editor.",
      };
    }

    const service = await getServiceById(existingQuotation.service_id);
    if (!service) {
      return { success: false, error: "Service not found or unavailable." };
    }

    const effectiveIssueDate = parsed.data.date ?? existingQuotation.date;
    const effectiveValidUntil =
      parsed.data.valid_until === undefined
        ? existingQuotation.valid_until
        : parsed.data.valid_until;
    const validityError = validateQuotationValidityWindow(
      effectiveValidUntil,
      effectiveIssueDate,
      service.eventStartDate
    );
    if (validityError) {
      return { success: false, error: validityError };
    }

    const { data, error } = await supabase.rpc("update_quotation_with_items", {
      p_quotation_id: id,
      p_quotation: updates,
      p_items: items,
      p_user_id: user.clerk_user_id,
    });

    if (error) {
      console.error("[updateQuotation] Supabase error:", error.message);
      if (
        error.message.includes("Cannot edit quotation with status") ||
        error.message.includes("approved_quotation_immutable")
      ) {
        return { success: false, error: "Only draft quotations can be edited." };
      }
      return { success: false, error: "Failed to update quotation. Please try again." };
    }

    revalidatePath("/quotations");
    revalidatePath(`/quotations/${id}`);
    return { success: true, data: data?.[0] };
  } catch (err) {
    if (err instanceof UnauthorizedError) return { success: false, error: "Unauthorized" };
    if (err instanceof ForbiddenError) return { success: false, error: "Forbidden" };
    console.error("[updateQuotation] Unexpected error:", err instanceof Error ? err.message : "Unknown");
    return { success: false, error: "An unexpected error occurred." };
  }
}

/**
 * Persist the bounded W2A Authority Line hierarchy on an existing draft.
 * Pricing remains database-derived; the browser sends only item ids and
 * structure metadata.
 */
export async function setQuotationCommercialStructure(
  id: string,
  input: unknown,
): Promise<ActionResult<QuotationCommercialStructureResult>> {
  try {
    const user = await requirePermission("quotations:write");
    const parsed = quotationCommercialStructureSchema.safeParse(input);

    if (!parsed.success) {
      return { success: false, code: "INVALID_INPUT", error: "Invalid quotation commercial structure." };
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase.rpc("set_quotation_commercial_structure", {
      p_quotation_id: id,
      p_lines: parsed.data.lines,
      p_user_id: user.clerk_user_id,
    });

    if (error) {
      console.error("[setQuotationCommercialStructure] Supabase error:", error.message);
      return { success: false, code: "STRUCTURE_UPDATE_FAILED", error: "Failed to update quotation structure." };
    }

    const row = data?.[0];
    if (!row) {
      return { success: false, code: "STRUCTURE_UPDATE_FAILED", error: "Failed to update quotation structure." };
    }

    if (row.error_code) {
      const messageByCode: Record<string, string> = {
        quotation_not_found: "Quotation not found or already deleted.",
        quotation_not_draft: "Only draft quotations can be structured.",
        discount_exceeds_subtotal: "Discount cannot exceed the quotation subtotal.",
        quotation_no_items: "At least one quotation item is required.",
        quotation_structure_must_cover_all_items: "Structure must cover every quotation item exactly once.",
        quotation_structure_item_not_found: "A quotation item could not be found.",
        commercial_parent_invalid: "Components must reference a root Authority Line in this quotation.",
        included_component_must_be_non_priced: "Included Components cannot carry an independent price.",
        optional_unselected_must_be_zero: "An unselected Optional Add-on cannot contribute to the quotation.",
        quotation_requires_authority_line: "At least one customer-priced Authority Line is required.",
      };
      return {
        success: false,
        code: row.error_code === "commercial_structure_update_failed"
          ? "STRUCTURE_UPDATE_FAILED"
          : "INVALID_INPUT",
        error: messageByCode[row.error_code] ?? "Quotation structure could not be updated.",
      };
    }

    revalidatePath(`/quotations/${id}`);
    revalidatePath("/quotations");
    return {
      success: true,
      data: {
        quotation_id: row.quotation_id,
        line_count: Number(row.line_count),
        subtotal: Number(row.subtotal),
        discount: Number(row.discount),
        vat_amount: Number(row.vat_amount),
        grand_total: Number(row.grand_total),
      },
    };
  } catch (err) {
    if (err instanceof UnauthorizedError) return { success: false, code: "UNAUTHORIZED", error: "Unauthorized" };
    if (err instanceof ForbiddenError) return { success: false, code: "FORBIDDEN", error: "Forbidden" };
    console.error(
      "[setQuotationCommercialStructure] Unexpected error:",
      err instanceof Error ? err.message : "Unknown",
    );
    return { success: false, code: "UNKNOWN_ERROR", error: "An unexpected error occurred." };
  }
}

export async function softDeleteQuotation(id: string): Promise<ActionResult> {
  try {
    const user = await requirePermission("quotations:write");

    const supabase = createAdminClient();

    // Check status before deleting
    const { data: qData, error: fetchError } = await supabase
      .from("quotations")
      .select("status")
      .eq("id", id)
      .eq("is_deleted", false)
      .single();

    if (fetchError || !qData) {
      return { success: false, error: "Quotation not found or already deleted." };
    }

    if (qData.status === "approved") {
      return { success: false, error: "Cannot delete an approved quotation." };
    }

    const { data: deletedQuotation, error } = await supabase
      .from("quotations")
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        updated_by: user.clerk_user_id,
      })
      .eq("id", id)
      .eq("is_deleted", false)
      .select("id")
      .maybeSingle();

    if (error) {
      console.error("[softDeleteQuotation] Supabase error:", error.message);
      if (error.message.includes("approved_quotation_immutable")) {
        return { success: false, error: "Cannot delete an approved quotation." };
      }
      return { success: false, error: "Failed to delete quotation. Please try again." };
    }

    if (!deletedQuotation) {
      return { success: false, error: "Quotation was not deleted. Please try again." };
    }

    revalidatePath("/quotations");
    return { success: true };
  } catch (err) {
    if (err instanceof UnauthorizedError) return { success: false, error: "Unauthorized" };
    if (err instanceof ForbiddenError) return { success: false, error: "Forbidden" };
    console.error("[softDeleteQuotation] Unexpected error:", err instanceof Error ? err.message : "Unknown");
    return { success: false, error: "An unexpected error occurred." };
  }
}

export async function approveQuotation(
  id: string,
): Promise<ActionResult<QuotationApprovalActivationData>> {
  try {
    const user = await requirePermission("quotations:approve");

    if (!consumeRateLimit("approveQuotation", user.clerk_user_id, APPROVAL_RATE_LIMIT)) {
      return { success: false, error: RATE_LIMIT_ERROR };
    }

    const supabase = createAdminClient();

    const result = await executeQuotationApprovalActivation({
      quotationId: id,
      actor: {
        clerk_user_id: user.clerk_user_id,
        role: user.role,
      },
      invoke: async (params) =>
        await supabase.rpc("approve_quotation_and_activate_internal_abs", params),
    });

    if (!result.success) return result;

    revalidatePath("/quotations");
    revalidatePath(`/quotations/${id}`);
    revalidatePath(`/services/${result.data.service_id}`);
    return result;
  } catch (err) {
    if (err instanceof UnauthorizedError) return { success: false, error: "Unauthorized" };
    if (err instanceof ForbiddenError) return { success: false, error: "Forbidden" };
    console.error("[approveQuotation] Unexpected error:", err instanceof Error ? err.message : "Unknown");
    return { success: false, error: "An unexpected error occurred." };
  }
}

export async function rejectQuotation(id: string): Promise<ActionResult> {
  try {
    const user = await requirePermission("quotations:approve");

    if (!consumeRateLimit("rejectQuotation", user.clerk_user_id, APPROVAL_RATE_LIMIT)) {
      return { success: false, error: RATE_LIMIT_ERROR };
    }

    const supabase = createAdminClient();

    // Check status before rejecting
    const { data: qData, error: fetchError } = await supabase
      .from("quotations")
      .select("status, service_id")
      .eq("id", id)
      .eq("is_deleted", false)
      .single();

    if (fetchError || !qData) {
      return { success: false, error: "Quotation not found or already deleted." };
    }

    if (qData.status !== "draft" && qData.status !== "sent") {
      return { success: false, error: `Cannot reject a quotation that is ${qData.status}.` };
    }

    const { data: rejectedQuotation, error } = await supabase
      .from("quotations")
      .update({
        status: "rejected",
        updated_by: user.clerk_user_id,
      })
      .eq("id", id)
      .eq("is_deleted", false)
      .select("id")
      .maybeSingle();

    if (error) {
      console.error("[rejectQuotation] Supabase error:", error.message);
      if (error.message.includes("approved_quotation_immutable")) {
        return { success: false, error: "Cannot reject an approved quotation." };
      }
      return { success: false, error: "Failed to reject quotation. Please try again." };
    }

    if (!rejectedQuotation) {
      return { success: false, error: "Quotation was not rejected. Please try again." };
    }

    revalidatePath("/quotations");
    revalidatePath(`/quotations/${id}`);
    revalidatePath(`/services/${qData.service_id}`);
    return { success: true };
  } catch (err) {
    if (err instanceof UnauthorizedError) return { success: false, error: "Unauthorized" };
    if (err instanceof ForbiddenError) return { success: false, error: "Forbidden" };
    console.error("[rejectQuotation] Unexpected error:", err instanceof Error ? err.message : "Unknown");
    return { success: false, error: "An unexpected error occurred." };
  }
}
