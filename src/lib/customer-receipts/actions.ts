"use server";

import { requirePermission } from "@/lib/auth/permissions";
import { AuthDependencyError, ForbiddenError, UnauthorizedError } from "@/lib/auth/errors";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  allocateCustomerReceiptSchema,
  customerSearchSchema,
  customerReceiptInvoiceSearchSchema,
  recordCustomerReceiptSchema,
  reverseCustomerReceiptAllocationSchema,
  reverseCustomerReceiptSchema,
} from "./schemas";
import { getEligibleCustomerInvoices, searchCustomerOptions } from "./queries";
import type { CustomerOption, CustomerReceiptActionResult, EligibleCustomerInvoice } from "./types";

type ReceiptRpcClient = {
  rpc: (name: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>;
};

function firstRpcRow(data: unknown): Record<string, unknown> | null {
  if (!Array.isArray(data) || data.length === 0 || typeof data[0] !== "object" || data[0] === null) return null;
  return data[0] as Record<string, unknown>;
}

function rpcResult(data: unknown, error: unknown): CustomerReceiptActionResult {
  if (error) return { success: false, error: "customer_receipt_operation_failed" };
  const row = firstRpcRow(data);
  if (!row) return { success: false, error: "customer_receipt_operation_failed" };
  if (typeof row.error_code === "string" && row.error_code.length > 0) {
    return { success: false, error: row.error_code, data: row };
  }
  return { success: true, data: row };
}

export async function recordCustomerReceiptAction(input: unknown): Promise<CustomerReceiptActionResult> {
  try {
    const user = await requirePermission("payments:write");
    const parsed = recordCustomerReceiptSchema.safeParse(input);
    if (!parsed.success) return { success: false, error: "invalid_customer_receipt_input" };
    const supabase = createAdminClient() as unknown as ReceiptRpcClient;
    const { data, error } = await supabase.rpc("record_customer_receipt", {
      p_customer_id: parsed.data.customerId,
      p_amount: parsed.data.amount,
      p_date: parsed.data.date,
      p_method: parsed.data.method,
      p_reference: parsed.data.reference ?? "",
      p_notes: parsed.data.notes ?? "",
      p_user_id: user.clerk_user_id,
      p_request_id: parsed.data.requestId,
    });
    return rpcResult(data, error);
  } catch (error) {
    if (error instanceof UnauthorizedError) return { success: false, error: "Unauthorized" };
    if (error instanceof ForbiddenError) return { success: false, error: "Forbidden" };
    if (error instanceof AuthDependencyError) return { success: false, error: "auth_unavailable" };
    console.error("[recordCustomerReceiptAction] operation failed");
    return { success: false, error: "customer_receipt_operation_failed" };
  }
}

export async function searchEligibleCustomerInvoicesAction(
  input: unknown,
): Promise<{ success: boolean; error?: string; invoices?: EligibleCustomerInvoice[] }> {
  try {
    const parsed = customerReceiptInvoiceSearchSchema.safeParse(input);
    if (!parsed.success) return { success: false, error: "invalid_customer_receipt_invoice_search" };
    return {
      success: true,
      invoices: await getEligibleCustomerInvoices(parsed.data.customerId, parsed.data.search),
    };
  } catch (error) {
    if (error instanceof UnauthorizedError) return { success: false, error: "Unauthorized" };
    if (error instanceof ForbiddenError) return { success: false, error: "Forbidden" };
    console.error("[searchEligibleCustomerInvoicesAction] operation failed");
    return { success: false, error: "customer_receipt_invoice_search_failed" };
  }
}

export async function searchCustomerOptionsAction(
  input: unknown,
): Promise<{ success: boolean; error?: string; customers?: CustomerOption[] }> {
  try {
    const parsed = customerSearchSchema.safeParse(input);
    if (!parsed.success) return { success: false, error: "invalid_customer_search" };
    return {
      success: true,
      customers: await searchCustomerOptions(parsed.data.search),
    };
  } catch (error) {
    if (error instanceof UnauthorizedError) return { success: false, error: "Unauthorized" };
    if (error instanceof ForbiddenError) return { success: false, error: "Forbidden" };
    console.error("[searchCustomerOptionsAction] operation failed");
    return { success: false, error: "customer_search_failed" };
  }
}

export async function allocateCustomerReceiptAction(input: unknown): Promise<CustomerReceiptActionResult> {
  try {
    const user = await requirePermission("payments:write");
    const parsed = allocateCustomerReceiptSchema.safeParse(input);
    if (!parsed.success) return { success: false, error: "invalid_customer_receipt_allocation_input" };
    const supabase = createAdminClient() as unknown as ReceiptRpcClient;
    const { data, error } = await supabase.rpc("allocate_customer_receipt", {
      p_payment_id: parsed.data.paymentId,
      p_invoice_id: parsed.data.invoiceId,
      p_amount: parsed.data.amount,
      p_user_id: user.clerk_user_id,
      p_request_id: parsed.data.requestId,
    });
    return rpcResult(data, error);
  } catch (error) {
    if (error instanceof UnauthorizedError) return { success: false, error: "Unauthorized" };
    if (error instanceof ForbiddenError) return { success: false, error: "Forbidden" };
    if (error instanceof AuthDependencyError) return { success: false, error: "auth_unavailable" };
    console.error("[allocateCustomerReceiptAction] operation failed");
    return { success: false, error: "customer_receipt_operation_failed" };
  }
}

export async function reverseCustomerReceiptAllocationAction(input: unknown): Promise<CustomerReceiptActionResult> {
  try {
    const user = await requirePermission("payments:write");
    const parsed = reverseCustomerReceiptAllocationSchema.safeParse(input);
    if (!parsed.success) return { success: false, error: "invalid_customer_receipt_reversal_input" };
    const supabase = createAdminClient() as unknown as ReceiptRpcClient;
    const { data, error } = await supabase.rpc("reverse_customer_receipt_allocation", {
      p_allocation_id: parsed.data.allocationId,
      p_reason: parsed.data.reason,
      p_user_id: user.clerk_user_id,
      p_request_id: parsed.data.requestId,
    });
    return rpcResult(data, error);
  } catch (error) {
    if (error instanceof UnauthorizedError) return { success: false, error: "Unauthorized" };
    if (error instanceof ForbiddenError) return { success: false, error: "Forbidden" };
    if (error instanceof AuthDependencyError) return { success: false, error: "auth_unavailable" };
    console.error("[reverseCustomerReceiptAllocationAction] operation failed");
    return { success: false, error: "customer_receipt_operation_failed" };
  }
}

export async function reverseCustomerReceiptAction(input: unknown): Promise<CustomerReceiptActionResult> {
  try {
    const user = await requirePermission("payments:write");
    const parsed = reverseCustomerReceiptSchema.safeParse(input);
    if (!parsed.success) return { success: false, error: "invalid_customer_receipt_reversal_input" };
    const supabase = createAdminClient() as unknown as ReceiptRpcClient;
    const { data, error } = await supabase.rpc("reverse_customer_receipt", {
      p_payment_id: parsed.data.paymentId,
      p_reason: parsed.data.reason,
      p_user_id: user.clerk_user_id,
      p_request_id: parsed.data.requestId,
    });
    return rpcResult(data, error);
  } catch (error) {
    if (error instanceof UnauthorizedError) return { success: false, error: "Unauthorized" };
    if (error instanceof ForbiddenError) return { success: false, error: "Forbidden" };
    if (error instanceof AuthDependencyError) return { success: false, error: "auth_unavailable" };
    console.error("[reverseCustomerReceiptAction] operation failed");
    return { success: false, error: "customer_receipt_operation_failed" };
  }
}
