"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requirePermission } from "@/lib/auth/permissions";
import { UnauthorizedError, ForbiddenError } from "@/lib/auth/errors";
import { createQuotationSchema, updateQuotationSchema } from "./schemas";
import type { QuotationRpcResult } from "./types";

export type ActionResult<T = void> = {
  success: boolean;
  error?: string;
  data?: T;
};

export async function createQuotation(input: unknown): Promise<ActionResult<QuotationRpcResult>> {
  try {
    const user = await requirePermission("quotations:write");
    const parsed = createQuotationSchema.safeParse(input);

    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? "Validation failed";
      return { success: false, error: firstError };
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
      return { success: false, error: "Failed to create quotation. Please try again." };
    }

    revalidatePath("/quotations");
    return { success: true, data: data?.[0] };
  } catch (err) {
    if (err instanceof UnauthorizedError) return { success: false, error: "Unauthorized" };
    if (err instanceof ForbiddenError) return { success: false, error: "Forbidden" };
    console.error("[createQuotation] Unexpected error:", err instanceof Error ? err.message : "Unknown");
    return { success: false, error: "An unexpected error occurred." };
  }
}

export async function updateQuotation(id: string, input: unknown): Promise<ActionResult<QuotationRpcResult>> {
  try {
    const user = await requirePermission("quotations:write");
    const parsed = updateQuotationSchema.safeParse(input);

    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? "Validation failed";
      return { success: false, error: firstError };
    }

    const { items, ...quotationData } = parsed.data;

    // Filter out undefined keys to match RPC fallback behavior effectively
    const updates: Record<string, any> = {};
    for (const [key, value] of Object.entries(quotationData)) {
      if (value !== undefined) {
        updates[key] = value;
      }
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase.rpc("update_quotation_with_items", {
      p_quotation_id: id,
      p_quotation: updates,
      p_items: items,
      p_user_id: user.clerk_user_id,
    });

    if (error) {
      console.error("[updateQuotation] Supabase error:", error.message);
      if (error.message.includes("Cannot edit quotation with status")) {
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

    const { error } = await supabase
      .from("quotations")
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        updated_by: user.clerk_user_id,
      })
      .eq("id", id)
      .eq("is_deleted", false);

    if (error) {
      console.error("[softDeleteQuotation] Supabase error:", error.message);
      return { success: false, error: "Failed to delete quotation. Please try again." };
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
