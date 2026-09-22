"use server";

import { requirePermission } from "@/lib/auth/permissions";
import { AuthDependencyError, ForbiddenError, UnauthorizedError } from "@/lib/auth/errors";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  applyCustomerCreditSchema,
  recordCustomerInternalCreditAdjustmentSchema,
  reverseCustomerCreditApplicationSchema,
  reverseCustomerInternalCreditAdjustmentSchema,
  reverseCustomerRefundSchema,
  refundCustomerCreditSchema,
} from "./schemas";
import type { CustomerCreditActionResult } from "./types";

type CreditRpcClient = {
  rpc: (name: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>;
};

function firstRpcRow(data: unknown): Record<string, unknown> | null {
  if (!Array.isArray(data) || data.length === 0 || typeof data[0] !== "object" || data[0] === null) return null;
  return data[0] as Record<string, unknown>;
}

function rpcResult(data: unknown, error: unknown): CustomerCreditActionResult {
  if (error) return { success: false, error: "customer_credit_operation_failed" };
  const row = firstRpcRow(data);
  if (!row) return { success: false, error: "customer_credit_operation_failed" };
  if (typeof row.error_code === "string" && row.error_code.length > 0) {
    return { success: false, error: row.error_code, data: row };
  }
  return { success: true, data: row };
}

function authError(error: unknown, fallback: string): CustomerCreditActionResult | null {
  if (error instanceof UnauthorizedError) return { success: false, error: "Unauthorized" };
  if (error instanceof ForbiddenError) return { success: false, error: "Forbidden" };
  if (error instanceof AuthDependencyError) return { success: false, error: "auth_unavailable" };
  return error instanceof Error ? { success: false, error: fallback } : null;
}

export async function recordCustomerInternalCreditAdjustmentAction(
  input: unknown,
): Promise<CustomerCreditActionResult> {
  try {
    const user = await requirePermission("invoices:write");
    const parsed = recordCustomerInternalCreditAdjustmentSchema.safeParse(input);
    if (!parsed.success) return { success: false, error: "invalid_credit_adjustment_input" };
    const supabase = createAdminClient() as unknown as CreditRpcClient;
    const { data, error } = await supabase.rpc("record_customer_internal_credit_adjustment", {
      p_customer_id: parsed.data.customerId,
      p_service_id: parsed.data.serviceId,
      p_invoice_id: parsed.data.invoiceId,
      p_amount: parsed.data.amount,
      p_reason_code: parsed.data.reasonCode,
      p_reason: parsed.data.reason,
      p_effective_date: parsed.data.effectiveDate,
      p_request_id: parsed.data.requestId,
      p_actor_id: user.clerk_user_id,
      p_source_approved_billing_scope_id: parsed.data.sourceApprovedBillingScopeId ?? null,
      p_successor_approved_billing_scope_id: parsed.data.successorApprovedBillingScopeId ?? null,
    });
    return rpcResult(data, error);
  } catch (error) {
    return authError(error, "customer_credit_operation_failed") ?? { success: false, error: "customer_credit_operation_failed" };
  }
}

export async function refundCustomerCreditAction(input: unknown): Promise<CustomerCreditActionResult> {
  try {
    const user = await requirePermission("payments:write");
    const parsed = refundCustomerCreditSchema.safeParse(input);
    if (!parsed.success) return { success: false, error: "invalid_customer_refund_input" };
    const supabase = createAdminClient() as unknown as CreditRpcClient;
    const { data, error } = await supabase.rpc("refund_customer_credit", {
      p_customer_id: parsed.data.customerId,
      p_source_credit_adjustment_id: parsed.data.sourceCreditAdjustmentId,
      p_amount: parsed.data.amount,
      p_business_date: parsed.data.businessDate,
      p_reason: parsed.data.reason,
      p_refund_method: parsed.data.refundMethod,
      p_reference: parsed.data.reference ?? "",
      p_request_id: parsed.data.requestId,
      p_actor_id: user.clerk_user_id,
    });
    return rpcResult(data, error);
  } catch (error) {
    return authError(error, "customer_refund_operation_failed") ?? { success: false, error: "customer_refund_operation_failed" };
  }
}

export async function applyCustomerCreditAction(input: unknown): Promise<CustomerCreditActionResult> {
  try {
    const user = await requirePermission("payments:write");
    const parsed = applyCustomerCreditSchema.safeParse(input);
    if (!parsed.success) return { success: false, error: "invalid_customer_credit_application_input" };
    const supabase = createAdminClient() as unknown as CreditRpcClient;
    const { data, error } = await supabase.rpc("apply_customer_credit", {
      p_customer_id: parsed.data.customerId,
      p_source_credit_adjustment_id: parsed.data.sourceCreditAdjustmentId,
      p_target_invoice_id: parsed.data.targetInvoiceId,
      p_amount: parsed.data.amount,
      p_business_date: parsed.data.businessDate,
      p_reason: parsed.data.reason,
      p_request_id: parsed.data.requestId,
      p_actor_id: user.clerk_user_id,
    });
    return rpcResult(data, error);
  } catch (error) {
    return authError(error, "customer_credit_application_failed") ?? { success: false, error: "customer_credit_application_failed" };
  }
}

export async function reverseCustomerInternalCreditAdjustmentAction(input: unknown): Promise<CustomerCreditActionResult> {
  try {
    const user = await requirePermission("invoices:write");
    const parsed = reverseCustomerInternalCreditAdjustmentSchema.safeParse(input);
    if (!parsed.success) return { success: false, error: "invalid_credit_adjustment_reversal_input" };
    const supabase = createAdminClient() as unknown as CreditRpcClient;
    const { data, error } = await supabase.rpc("reverse_customer_internal_credit_adjustment", {
      p_customer_id: parsed.data.customerId,
      p_source_credit_adjustment_id: parsed.data.sourceCreditAdjustmentId,
      p_amount: parsed.data.amount,
      p_effective_date: parsed.data.effectiveDate,
      p_reason: parsed.data.reason,
      p_request_id: parsed.data.requestId,
      p_actor_id: user.clerk_user_id,
    });
    return rpcResult(data, error);
  } catch (error) {
    return authError(error, "customer_credit_reversal_failed") ?? { success: false, error: "customer_credit_reversal_failed" };
  }
}

export async function reverseCustomerRefundAction(input: unknown): Promise<CustomerCreditActionResult> {
  try {
    const user = await requirePermission("payments:write");
    const parsed = reverseCustomerRefundSchema.safeParse(input);
    if (!parsed.success) return { success: false, error: "invalid_customer_refund_reversal_input" };
    const supabase = createAdminClient() as unknown as CreditRpcClient;
    const { data, error } = await supabase.rpc("reverse_customer_refund", {
      p_customer_id: parsed.data.customerId,
      p_source_refund_id: parsed.data.sourceRefundId,
      p_amount: parsed.data.amount,
      p_business_date: parsed.data.businessDate,
      p_reason: parsed.data.reason,
      p_request_id: parsed.data.requestId,
      p_actor_id: user.clerk_user_id,
    });
    return rpcResult(data, error);
  } catch (error) {
    return authError(error, "customer_refund_reversal_failed") ?? { success: false, error: "customer_refund_reversal_failed" };
  }
}

export async function reverseCustomerCreditApplicationAction(input: unknown): Promise<CustomerCreditActionResult> {
  try {
    const user = await requirePermission("payments:write");
    const parsed = reverseCustomerCreditApplicationSchema.safeParse(input);
    if (!parsed.success) return { success: false, error: "invalid_customer_credit_application_reversal_input" };
    const supabase = createAdminClient() as unknown as CreditRpcClient;
    const { data, error } = await supabase.rpc("reverse_customer_credit_application", {
      p_customer_id: parsed.data.customerId,
      p_source_application_id: parsed.data.sourceApplicationId,
      p_amount: parsed.data.amount,
      p_business_date: parsed.data.businessDate,
      p_reason: parsed.data.reason,
      p_request_id: parsed.data.requestId,
      p_actor_id: user.clerk_user_id,
    });
    return rpcResult(data, error);
  } catch (error) {
    return authError(error, "customer_credit_application_reversal_failed") ?? { success: false, error: "customer_credit_application_reversal_failed" };
  }
}
