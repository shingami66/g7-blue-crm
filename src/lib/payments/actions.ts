"use server";

import { recordPaymentSchema } from "./schemas.ts";
import type { RecordPaymentResult } from "./types.ts";
import { mapPaymentRpcResult } from "./submission-controller.ts";

const RATE_LIMIT_ERROR = "Too many attempts. Please wait a moment and try again.";
const RECORD_PAYMENT_RATE_LIMIT = { limit: 10, windowMs: 60_000 };

export type RpcCaller = (params: {
  p_invoice_id: string;
  p_amount: number;
  p_date: string;
  p_method: string;
  p_reference: string | null;
  p_user_id: string;
  p_request_id: string;
}) => Promise<{ data: unknown; error: unknown }>;

export async function executeRecordPayment(
  input: {
    invoiceId: string;
    requestId: string;
    amount: number;
    date: string;
    method: "bank_transfer" | "cash" | "cheque" | "online";
    reference?: string;
  },
  userId: string,
  rpcCall: RpcCaller
): Promise<RecordPaymentResult> {
  try {
    const { data, error } = await rpcCall({
      p_invoice_id: input.invoiceId,
      p_amount: input.amount,
      p_date: input.date,
      p_method: input.method,
      p_reference: input.reference || null,
      p_user_id: userId,
      p_request_id: input.requestId,
    });

    return mapPaymentRpcResult(data, error);
  } catch (rpcExc) {
    console.error("[executeRecordPayment] RPC exception:", rpcExc);
    return { success: false, error: "payment_record_failed" };
  }
}

export async function recordPaymentAction(input: unknown): Promise<RecordPaymentResult> {
  try {
    const { requirePermission } = await import("@/lib/auth/permissions");
    const { consumeRateLimit } = await import("@/lib/security/rate-limit");
    const { createAdminClient } = await import("@/lib/supabase/admin");

    const user = await requirePermission("payments:write");

    if (!consumeRateLimit("recordPaymentAction", user.clerk_user_id, RECORD_PAYMENT_RATE_LIMIT)) {
      return { success: false, error: RATE_LIMIT_ERROR };
    }

    const parsed = recordPaymentSchema.safeParse(input);

    if (!parsed.success) {
      return { success: false, error: "invalid_payment_input" };
    }

    const supabase = createAdminClient();
    const defaultRpcCaller: RpcCaller = async (params) => {
      return await supabase.rpc("record_invoice_payment", params);
    };

    return await executeRecordPayment(parsed.data, user.clerk_user_id, defaultRpcCaller);
  } catch (err) {
    const errName = err instanceof Error ? err.constructor.name : "";
    if (errName === "UnauthorizedError") return { success: false, error: "Unauthorized" };
    if (errName === "ForbiddenError") return { success: false, error: "Forbidden" };
    console.error("[recordPaymentAction] Unexpected error:", err instanceof Error ? err.message : "Unknown");
    return { success: false, error: "An unexpected error occurred." };
  }
}
