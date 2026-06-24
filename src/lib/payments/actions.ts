"use server";

import { requirePermission, getCurrentAppUser } from "@/lib/auth/permissions";
import { UnauthorizedError, ForbiddenError } from "@/lib/auth/errors";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordPaymentSchema } from "./schemas";
import type { RecordPaymentResult } from "./types";

export async function recordPaymentAction(input: unknown): Promise<RecordPaymentResult> {
  try {
    await requirePermission("payments:write");
    const user = await getCurrentAppUser();

    if (!user) {
      throw new UnauthorizedError("User not found");
    }

    const parsed = recordPaymentSchema.safeParse(input);

    if (!parsed.success) {
      return { success: false, error: "invalid_payment_input" };
    }

    const { invoiceId, amount, date, method, reference } = parsed.data;

    const supabase = createAdminClient();

    const { data, error } = await supabase.rpc("record_invoice_payment", {
      p_invoice_id: invoiceId,
      p_amount: amount,
      p_date: date,
      p_method: method,
      p_reference: reference || null,
      p_user_id: user.clerk_user_id,
    });

    if (error) {
      console.error("[recordPaymentAction] RPC error:", error);

      if (error.message.includes("Invoice not found")) return { success: false, error: "invoice_not_found" };
      if (error.message.includes("Payment amount exceeds")) return { success: false, error: "payment_exceeds_balance" };
      if (error.message.includes("Payment is only allowed for sent or partial")) return { success: false, error: "invoice_not_payable" };
      if (error.message.includes("Invoice is deleted")) return { success: false, error: "invoice_deleted" };
      if (error.message.includes("Payment amount must be greater than 0")) return { success: false, error: "invalid_payment_amount" };

      return { success: false, error: "payment_record_failed" };
    }

    const result = Array.isArray(data) ? data[0] : data;

    return {
      success: true,
      paymentId: result?.payment_id,
      paymentNumber: result?.payment_number,
      newAmountPaid: result?.amount_paid,
      newBalanceDue: result?.balance_due,
      newStatus: result?.status,
    };
  } catch (err) {
    if (err instanceof UnauthorizedError) return { success: false, error: "Unauthorized" };
    if (err instanceof ForbiddenError) return { success: false, error: "Forbidden" };
    console.error("[recordPaymentAction] Unexpected error:", err instanceof Error ? err.message : "Unknown");
    return { success: false, error: "An unexpected error occurred." };
  }
}
