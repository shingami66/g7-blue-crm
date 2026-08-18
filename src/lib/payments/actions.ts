"use server";

import { recordPaymentSchema } from "./schemas.ts";
import type { RecordPaymentResult } from "./types.ts";
import { mapPaymentRpcResult } from "./submission-controller.ts";
import { UnauthorizedError, ForbiddenError, AuthDependencyError } from "../auth/errors.ts";

const RATE_LIMIT_ERROR = "Too many attempts. Please wait a moment and try again.";
const RECORD_PAYMENT_RATE_LIMIT = { limit: 10, windowMs: 60_000 };
const SAFE_CORRELATION_ID_REGEX = /^[a-zA-Z0-9_-]{1,64}$/;

function sanitizeCorrelationId(candidate: unknown): string {
  if (
    typeof candidate === "string" &&
    SAFE_CORRELATION_ID_REGEX.test(candidate)
  ) {
    return candidate;
  }
  return crypto.randomUUID();
}

export type RpcCaller = (params: {
  p_invoice_id: string;
  p_amount: number;
  p_date: string;
  p_method: string;
  p_reference: string;
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
  const correlationId = sanitizeCorrelationId(input.requestId);

  try {
    const { data, error } = await rpcCall({
      p_invoice_id: input.invoiceId,
      p_amount: input.amount,
      p_date: input.date,
      p_method: input.method,
      p_reference: input.reference || "",
      p_user_id: userId,
      p_request_id: input.requestId,
    });

    return mapPaymentRpcResult(data, error);
  } catch {
    console.error(
      `[executeRecordPayment] [${correlationId}] Payment RPC transport failure: dependency_error`
    );
    return { success: false, error: "payment_record_failed" };
  }
}

export async function recordPaymentAction(input: unknown): Promise<RecordPaymentResult> {
  const rawRequestId =
    typeof input === "object" &&
    input !== null &&
    "requestId" in input &&
    typeof (input as { requestId?: unknown }).requestId === "string"
      ? (input as { requestId: string }).requestId
      : undefined;
  const fallbackCorrelationId = sanitizeCorrelationId(rawRequestId);

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
    if (err instanceof UnauthorizedError) return { success: false, error: "Unauthorized" };
    if (err instanceof ForbiddenError) return { success: false, error: "Forbidden" };
    if (err instanceof AuthDependencyError) {
      console.error(
        `[recordPaymentAction] [${fallbackCorrelationId}] Auth dependency failure: auth_unavailable`
      );
      return { success: false, error: "An unexpected error occurred." };
    }
    console.error(
      `[recordPaymentAction] [${fallbackCorrelationId}] Unexpected execution failure: internal_error`
    );
    return { success: false, error: "An unexpected error occurred." };
  }
}
