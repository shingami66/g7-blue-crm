"use server";

import { requirePermission } from "@/lib/auth/permissions";
import { UnauthorizedError, ForbiddenError } from "@/lib/auth/errors";
import { createAdminClient } from "@/lib/supabase/admin";
import { consumeRateLimit } from "@/lib/security/rate-limit";
import { recordPaymentSchema } from "./schemas";
import type { RecordPaymentResult } from "./types";

const RATE_LIMIT_ERROR = "Too many attempts. Please wait a moment and try again.";
const RECORD_PAYMENT_RATE_LIMIT = { limit: 10, windowMs: 60_000 };

export async function recordPaymentAction(input: unknown): Promise<RecordPaymentResult> {
  try {
    const user = await requirePermission("payments:write");

    if (!consumeRateLimit("recordPaymentAction", user.clerk_user_id, RECORD_PAYMENT_RATE_LIMIT)) {
      return { success: false, error: RATE_LIMIT_ERROR };
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
