"use server";

import "server-only";

import { randomUUID } from "node:crypto";
import { requirePermission } from "@/lib/auth/permissions";
import {
  EXPENSE_PERMISSIONS,
  CASH_ADVANCE_PERMISSIONS,
  PETTY_CASH_PERMISSIONS,
} from "@/lib/auth/role-permissions";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  BUSINESS_DOCUMENT_BUCKET,
  buildBusinessDocumentObjectPath,
  validateBusinessDocumentFile,
  BusinessDocumentError,
} from "@/lib/documents/storage";
import {
  submitExpenseSchema,
  selfServiceSubmitExpenseSchema,
  approveExpenseSchema,
  rejectExpenseSchema,
  cancelExpenseSchema,
  recordEvidenceExceptionSchema,
  disposeEvidenceExceptionSchema,
  attachExpenseDocumentSchema,
  settleExpenseReimbursementSchema,
  requestCashAdvanceSchema,
  requestOwnCashAdvanceSchema,
  approveCashAdvanceSchema,
  rejectCashAdvanceSchema,
  cancelCashAdvanceSchema,
  issueCashAdvanceSchema,
  settleCashAdvanceSpendSchema,
  recordCashAdvanceReturnSchema,
  recordPettyCashTransactionSchema,
  reviewExpenseFinanceSchema,
  submitOwnCashAdvanceExpenseSchema,
  submitCashAdvanceExpenseOnBehalfSchema,
} from "./schemas";
import type { W5ActionResult, SelfServiceExpenseSubmissionData } from "./types";

// Helper to invoke unapplied W5A RPCs before migration is applied to remote schema
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getExpenseRpcClient(): any {
  return createAdminClient();
}

// 1. Submit Expense
export async function submitExpenseAction(
  rawInput: unknown,
): Promise<W5ActionResult<{ expense_id: string }>> {
  try {
    const parsed = submitExpenseSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Invalid expense submission payload",
        errorCode: "validation_error",
      };
    }

    let user;
    if (parsed.data.payment_method === "cash_advance") {
      user = await requirePermission(CASH_ADVANCE_PERMISSIONS.settle);
      await requirePermission(EXPENSE_PERMISSIONS.financeReview);
    } else {
      try {
        user = await requirePermission(EXPENSE_PERMISSIONS.write);
      } catch {
        user = await requirePermission(EXPENSE_PERMISSIONS.submitOwn);
        if (parsed.data.origin_type !== "employee_paid" || parsed.data.claimant_id !== user.id) {
          return {
            success: false,
            error: "Self-service submission is restricted to own employee-paid expenses",
            errorCode: "forbidden",
          };
        }
      }
    }

    const supabase = getExpenseRpcClient();
    const { data, error } = await supabase.rpc("submit_expense", {
      p_expense_number: parsed.data.expense_number,
      p_context_type: parsed.data.context_type,
      p_service_id: parsed.data.service_id ?? null,
      p_expense_category: parsed.data.expense_category,
      p_description: parsed.data.description,
      p_amount: parsed.data.amount,
      p_expense_date: parsed.data.expense_date,
      p_origin_type: parsed.data.origin_type,
      p_payment_method: parsed.data.payment_method,
      p_cash_advance_id: parsed.data.cash_advance_id ?? null,
      p_petty_cash_fund_id: parsed.data.petty_cash_fund_id ?? null,
      p_claimant_id: parsed.data.claimant_id ?? null,
      p_request_id: parsed.data.request_id,
      p_actor_id: user.id,
      p_actor_role: user.role,
    });

    if (error) {
      return { success: false, error: error.message, errorCode: error.code };
    }

    const row = data?.[0];
    if (row?.error_code) {
      return { success: false, error: row.error_code, errorCode: row.error_code };
    }

    return {
      success: true,
      data: { expense_id: row.expense_id },
      idempotentReplay: row.idempotent_replay,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected error during expense submission";
    return { success: false, error: message };
  }
}

// Internal helper: uploads file to private bucket and calls attach_expense_document with strict compensation
async function uploadAndAttachExpenseReceiptInternal({
  expenseId,
  file,
  user,
  requestId,
}: {
  expenseId: string;
  file: unknown;
  user: { id: string; clerk_user_id: string; role: string };
  requestId: string;
}): Promise<{ success: boolean; documentId?: string; error?: string; errorCode?: string }> {
  const validatedFile = await validateBusinessDocumentFile(file);
  const documentId = randomUUID();
  const objectPath = buildBusinessDocumentObjectPath(documentId, validatedFile.mimeType);
  const supabase = getExpenseRpcClient();

  // Step 1: Upload to private storage
  const { error: uploadError } = await supabase.storage
    .from(BUSINESS_DOCUMENT_BUCKET)
    .upload(objectPath, validatedFile.uploadBody, {
      contentType: validatedFile.mimeType,
      upsert: false,
    });

  if (uploadError) {
    // Case A: Storage upload fails -> no metadata -> no attachment -> return failure
    return {
      success: false,
      error: `Storage upload failed: ${uploadError.message}`,
      errorCode: "document_storage_upload_failed",
    };
  }

  // Step 2: Insert business_documents metadata row
  const { data: docData, error: metaError } = await supabase
    .from("business_documents")
    .insert({
      id: documentId,
      bucket_id: BUSINESS_DOCUMENT_BUCKET,
      object_path: objectPath,
      original_filename: validatedFile.originalFilename,
      mime_type: validatedFile.mimeType,
      file_size: validatedFile.fileSize,
      document_type: "expense_receipt",
      purpose: `Expense receipt: ${expenseId}`,
      uploaded_by: user.clerk_user_id,
    })
    .select("id")
    .single();

  if (metaError || !docData) {
    // Case B: Storage succeeds, metadata insert fails -> delete storage object -> return failure
    let cleanupFailure: string | undefined;
    try {
      const { error: removeErr } = await supabase.storage
        .from(BUSINESS_DOCUMENT_BUCKET)
        .remove([objectPath]);
      if (removeErr) {
        cleanupFailure = `Storage compensation failed: ${removeErr.message}`;
        console.error(
          "[uploadAndAttachExpenseReceiptInternal] Storage compensation failed:",
          removeErr.message,
        );
      }
    } catch (err: unknown) {
      cleanupFailure = `Storage compensation exception: ${err instanceof Error ? err.message : "unknown"}`;
      console.error(
        "[uploadAndAttachExpenseReceiptInternal] Storage compensation exception:",
        cleanupFailure,
      );
    }
    return {
      success: false,
      error: `Metadata insert failed: ${metaError?.message ?? "unknown"}${cleanupFailure ? ` (${cleanupFailure})` : ""}`,
      errorCode: "document_metadata_write_failed",
    };
  }

  // Step 3: Attach document to expense via governed RPC
  const { data: attachData, error: attachRpcError } = await supabase.rpc(
    "attach_expense_document",
    {
      p_expense_id: expenseId,
      p_document_id: documentId,
      p_request_id: requestId,
      p_actor_id: user.id,
      p_actor_role: user.role,
    },
  );

  const attachRow = attachData?.[0];
  if (attachRpcError || attachRow?.error_code) {
    // Case C: Storage + metadata succeed, Expense attachment fails -> delete metadata row -> delete storage object -> return failure
    const cleanupFailures: string[] = [];
    try {
      const { error: delErr } = await supabase
        .from("business_documents")
        .delete()
        .eq("id", documentId);
      if (delErr) {
        cleanupFailures.push(`metadata: ${delErr.message}`);
        console.error(
          "[uploadAndAttachExpenseReceiptInternal] Metadata compensation failed:",
          delErr.message,
        );
      }
    } catch (err: unknown) {
      cleanupFailures.push(`metadata: ${err instanceof Error ? err.message : "unknown"}`);
    }
    try {
      const { error: removeErr } = await supabase.storage
        .from(BUSINESS_DOCUMENT_BUCKET)
        .remove([objectPath]);
      if (removeErr) {
        cleanupFailures.push(`storage: ${removeErr.message}`);
        console.error(
          "[uploadAndAttachExpenseReceiptInternal] Storage compensation failed:",
          removeErr.message,
        );
      }
    } catch (err: unknown) {
      cleanupFailures.push(`storage: ${err instanceof Error ? err.message : "unknown"}`);
    }
    const cleanupNote =
      cleanupFailures.length > 0 ? ` (Compensation failed: ${cleanupFailures.join(", ")})` : "";
    return {
      success: false,
      error: `${attachRow?.error_code ?? attachRpcError?.message ?? "Failed to attach document"}${cleanupNote}`,
      errorCode: attachRow?.error_code ?? "document_attachment_failed",
    };
  }

  // Case D: Success
  return {
    success: true,
    documentId,
  };
}

// 1b. Submit Own Expense (Self-Service)
export async function submitOwnExpenseAction(
  rawInput: unknown,
): Promise<W5ActionResult<{ expense_id: string; expense_number: string }>> {
  try {
    const user = await requirePermission(EXPENSE_PERMISSIONS.submitOwn);

    const selfParsed = selfServiceSubmitExpenseSchema.safeParse(rawInput);
    let contextType: "company" | "event";
    let serviceId: string | null = null;
    let expenseCategory: string;
    let description: string;
    let amount: number;
    let expenseDate: string;
    let requestId: string;

    if (selfParsed.success) {
      contextType = selfParsed.data.context_type;
      serviceId = selfParsed.data.service_id ?? null;
      expenseCategory = selfParsed.data.expense_category;
      description = selfParsed.data.description;
      amount = selfParsed.data.amount;
      expenseDate = selfParsed.data.expense_date;
      requestId = selfParsed.data.request_id;
    } else {
      const parsed = submitExpenseSchema.safeParse(rawInput);
      if (!parsed.success) {
        return {
          success: false,
          error:
            selfParsed.error.issues[0]?.message ??
            parsed.error.issues[0]?.message ??
            "Invalid expense submission payload",
          errorCode: "validation_error",
        };
      }
      contextType = parsed.data.context_type;
      serviceId = parsed.data.service_id ?? null;
      expenseCategory = parsed.data.expense_category;
      description = parsed.data.description;
      amount = parsed.data.amount;
      expenseDate = parsed.data.expense_date;
      requestId = parsed.data.request_id;
    }

    const supabase = getExpenseRpcClient();
    // Server-authoritative constraints forced by backend:
    // p_expense_number = null (database generates authoritative EXP-YYYY-0001)
    // p_origin_type = 'employee_paid'
    // p_payment_method = 'personal_funds'
    // p_cash_advance_id = null
    // p_petty_cash_fund_id = null
    // p_claimant_id = user.id
    const { data, error } = await supabase.rpc("submit_expense", {
      p_expense_number: null,
      p_context_type: contextType,
      p_service_id: serviceId,
      p_expense_category: expenseCategory,
      p_description: description,
      p_amount: amount,
      p_expense_date: expenseDate,
      p_origin_type: "employee_paid",
      p_payment_method: "personal_funds",
      p_cash_advance_id: null,
      p_petty_cash_fund_id: null,
      p_claimant_id: user.id,
      p_request_id: requestId,
      p_actor_id: user.id,
      p_actor_role: user.role,
    });

    if (error) {
      return { success: false, error: error.message, errorCode: error.code };
    }

    const row = data?.[0];
    if (row?.error_code) {
      return { success: false, error: row.error_code, errorCode: row.error_code };
    }

    // Load authoritative generated expense_number from public.expenses
    const { data: expRow } = await supabase
      .from("expenses")
      .select("expense_number")
      .eq("id", row.expense_id)
      .single();

    return {
      success: true,
      data: {
        expense_id: row.expense_id,
        expense_number: expRow?.expense_number ?? "",
      },
      idempotentReplay: row.idempotent_replay,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected error during own expense submission";
    return { success: false, error: message };
  }
}

// 1d. Submit Own Cash Advance Expense (Self-Service Custodian)
export async function submitOwnCashAdvanceExpenseAction(
  rawInput: unknown,
): Promise<W5ActionResult<{ expense_id: string; expense_number: string }>> {
  try {
    const user = await requirePermission(CASH_ADVANCE_PERMISSIONS.submitOwn);
    await requirePermission(EXPENSE_PERMISSIONS.submitOwn);

    const parsed = submitOwnCashAdvanceExpenseSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Invalid cash advance expense submission payload",
        errorCode: "validation_error",
      };
    }

    const supabase = getExpenseRpcClient();

    // Server-side verification: advance exists, is issued, belongs to user
    const { data: advance, error: advError } = await supabase
      .from("employee_cash_advances")
      .select("id, status, recipient_id, context_type, service_id")
      .eq("id", parsed.data.advance_id)
      .maybeSingle();

    if (advError) {
      return {
        success: false,
        error: `Failed to verify cash advance: ${advError.message}`,
        errorCode: "advance_lookup_failed",
      };
    }

    if (!advance) {
      return {
        success: false,
        error: "Cash advance not found",
        errorCode: "advance_not_found",
      };
    }

    if (advance.status !== "issued") {
      return {
        success: false,
        error: "Cash advance is not in issued status",
        errorCode: "advance_not_in_issued_status",
      };
    }

    if (advance.recipient_id !== user.id) {
      return {
        success: false,
        error: "Cannot submit expense against another user's cash advance",
        errorCode: "forbidden",
      };
    }

    // Force server-authoritative values
    const { data, error } = await supabase.rpc("submit_expense", {
      p_expense_number: null,
      p_context_type: advance.context_type,
      p_service_id: advance.service_id,
      p_expense_category: parsed.data.expense_category,
      p_description: parsed.data.description,
      p_amount: parsed.data.amount,
      p_expense_date: parsed.data.expense_date,
      p_origin_type: "company_direct",
      p_payment_method: "cash_advance",
      p_cash_advance_id: advance.id,
      p_petty_cash_fund_id: null,
      p_claimant_id: null,
      p_request_id: parsed.data.request_id,
      p_actor_id: user.id,
      p_actor_role: user.role,
    });

    if (error) {
      return { success: false, error: error.message, errorCode: error.code };
    }

    const row = data?.[0];
    if (row?.error_code) {
      return { success: false, error: row.error_code, errorCode: row.error_code };
    }

    const { data: expRow } = await supabase
      .from("expenses")
      .select("expense_number")
      .eq("id", row.expense_id)
      .single();

    return {
      success: true,
      data: {
        expense_id: row.expense_id,
        expense_number: expRow?.expense_number ?? "",
      },
      idempotentReplay: row.idempotent_replay,
    };
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Unexpected error during cash advance expense submission";
    return { success: false, error: message };
  }
}

// 1e. Submit Cash Advance Expense On Behalf (Accountant / Admin)
export async function submitCashAdvanceExpenseOnBehalfAction(
  rawInput: unknown,
): Promise<W5ActionResult<{ expense_id: string; expense_number: string }>> {
  try {
    const user = await requirePermission(CASH_ADVANCE_PERMISSIONS.settle);
    await requirePermission(EXPENSE_PERMISSIONS.financeReview);

    const parsed = submitCashAdvanceExpenseOnBehalfSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Invalid cash advance expense submission payload",
        errorCode: "validation_error",
      };
    }

    const supabase = getExpenseRpcClient();

    // Server-side verification: advance exists, is issued
    const { data: advance, error: advError } = await supabase
      .from("employee_cash_advances")
      .select("id, status, recipient_id, context_type, service_id")
      .eq("id", parsed.data.advance_id)
      .maybeSingle();

    if (advError) {
      return {
        success: false,
        error: `Failed to verify cash advance: ${advError.message}`,
        errorCode: "advance_lookup_failed",
      };
    }

    if (!advance) {
      return {
        success: false,
        error: "Cash advance not found",
        errorCode: "advance_not_found",
      };
    }

    if (advance.status !== "issued") {
      return {
        success: false,
        error: "Cash advance is not in issued status",
        errorCode: "advance_not_in_issued_status",
      };
    }

    // Force server-authoritative values; Accountant is the submission actor
    // The advance defines the custodian (advance.recipient_id)
    // Expense is submitted in status 'submitted' (NO auto-review, NO auto-approval, NO auto-settlement)
    const { data, error } = await supabase.rpc("submit_expense", {
      p_expense_number: null,
      p_context_type: advance.context_type,
      p_service_id: advance.service_id,
      p_expense_category: parsed.data.expense_category,
      p_description: parsed.data.description,
      p_amount: parsed.data.amount,
      p_expense_date: parsed.data.expense_date,
      p_origin_type: "company_direct",
      p_payment_method: "cash_advance",
      p_cash_advance_id: advance.id,
      p_petty_cash_fund_id: null,
      p_claimant_id: null,
      p_request_id: parsed.data.request_id,
      p_actor_id: user.id,
      p_actor_role: user.role,
    });

    if (error) {
      return { success: false, error: error.message, errorCode: error.code };
    }

    const row = data?.[0];
    if (row?.error_code) {
      return { success: false, error: row.error_code, errorCode: row.error_code };
    }

    const { data: expRow } = await supabase
      .from("expenses")
      .select("expense_number")
      .eq("id", row.expense_id)
      .single();

    return {
      success: true,
      data: {
        expense_id: row.expense_id,
        expense_number: expRow?.expense_number ?? "",
      },
      idempotentReplay: row.idempotent_replay,
    };
  } catch (err: unknown) {
    const message =
      err instanceof Error
        ? err.message
        : "Unexpected error during cash advance expense submission on behalf";
    return { success: false, error: message };
  }
}


// 1c. Submit Self-Service Expense with Receipt (Full & Partial Success Handling)
export async function submitSelfServiceExpenseWithReceiptAction(
  formData: FormData,
): Promise<W5ActionResult<SelfServiceExpenseSubmissionData>> {
  try {
    const user = await requirePermission(EXPENSE_PERMISSIONS.submitOwn);

    const contextType = formData.get("context_type") as string;
    const serviceIdRaw = formData.get("service_id");
    const serviceId =
      typeof serviceIdRaw === "string" && serviceIdRaw.trim() ? serviceIdRaw.trim() : null;
    const expenseCategory = (formData.get("expense_category") as string) ?? "";
    const description = (formData.get("description") as string) ?? "";
    const amountRaw = formData.get("amount");
    const amount = typeof amountRaw === "string" ? parseFloat(amountRaw) : Number(amountRaw);
    const expenseDate = (formData.get("expense_date") as string) ?? "";
    const requestIdRaw = formData.get("request_id") as string;
    const requestId =
      requestIdRaw && requestIdRaw.trim() ? requestIdRaw.trim() : randomUUID();

    const validationResult = selfServiceSubmitExpenseSchema.safeParse({
      context_type: contextType,
      service_id: serviceId,
      expense_category: expenseCategory,
      description,
      amount,
      expense_date: expenseDate,
      request_id: requestId,
    });

    if (!validationResult.success) {
      return {
        success: false,
        error: validationResult.error.issues[0]?.message ?? "Invalid expense submission payload",
        errorCode: "validation_error",
      };
    }

    const receiptFile = formData.get("receipt");
    const hasReceipt =
      receiptFile !== null &&
      typeof receiptFile === "object" &&
      "size" in receiptFile &&
      Number((receiptFile as { size: number }).size) > 0;

    // PREFLIGHT FILE VALIDATION: validate before creating Expense so bad files fail upfront
    if (hasReceipt) {
      try {
        await validateBusinessDocumentFile(receiptFile);
      } catch (fileErr) {
        const msg = fileErr instanceof Error ? fileErr.message : "Invalid receipt file";
        const code =
          fileErr instanceof BusinessDocumentError ? fileErr.code : "invalid_document_file";
        return {
          success: false,
          error: msg,
          errorCode: code,
        };
      }
    }

    // Call submit_expense RPC with p_expense_number = null for server-authoritative generation
    const supabase = getExpenseRpcClient();
    const { data: submitData, error: submitRpcError } = await supabase.rpc("submit_expense", {
      p_expense_number: null,
      p_context_type: validationResult.data.context_type,
      p_service_id: validationResult.data.service_id ?? null,
      p_expense_category: validationResult.data.expense_category,
      p_description: validationResult.data.description,
      p_amount: validationResult.data.amount,
      p_expense_date: validationResult.data.expense_date,
      p_origin_type: "employee_paid",
      p_payment_method: "personal_funds",
      p_cash_advance_id: null,
      p_petty_cash_fund_id: null,
      p_claimant_id: user.id,
      p_request_id: validationResult.data.request_id,
      p_actor_id: user.id,
      p_actor_role: user.role,
    });

    if (submitRpcError) {
      return { success: false, error: submitRpcError.message, errorCode: submitRpcError.code };
    }

    const submitRow = submitData?.[0];
    if (submitRow?.error_code) {
      return { success: false, error: submitRow.error_code, errorCode: submitRow.error_code };
    }

    const createdExpenseId = submitRow.expense_id;

    // Load authoritative generated expense_number from public.expenses
    const { data: expRow } = await supabase
      .from("expenses")
      .select("expense_number")
      .eq("id", createdExpenseId)
      .single();

    const authoritativeNumber = expRow?.expense_number ?? "";

    // If receipt was provided, upload and attach it
    if (hasReceipt) {
      const attachRes = await uploadAndAttachExpenseReceiptInternal({
        expenseId: createdExpenseId,
        file: receiptFile,
        user,
        requestId: randomUUID(),
      });

      if (!attachRes.success) {
        // PARTIAL SUCCESS: Expense is created and retained, but receipt failed
        return {
          success: true,
          data: {
            expenseId: createdExpenseId,
            expenseNumber: authoritativeNumber,
            outcome: "partial_success",
            warning: attachRes.error
              ? `Expense created successfully, but receipt attachment failed: ${attachRes.error}. You can attach the receipt using the retry option.`
              : "Expense created successfully, but receipt attachment failed. You can attach the receipt using the retry option.",
          },
        };
      }

      // FULL SUCCESS with receipt
      return {
        success: true,
        data: {
          expenseId: createdExpenseId,
          expenseNumber: authoritativeNumber,
          documentId: attachRes.documentId,
          outcome: "full_success",
        },
      };
    }

    // FULL SUCCESS without receipt
    return {
      success: true,
      data: {
        expenseId: createdExpenseId,
        expenseNumber: authoritativeNumber,
        outcome: "full_success",
      },
    };
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Unexpected error during self-service expense submission";
    return { success: false, error: message };
  }
}

// 1d. Attach Expense Receipt (Retry Workflow)
export async function attachExpenseReceiptAction(
  formData: FormData,
): Promise<W5ActionResult<{ expense_id: string; document_id: string }>> {
  try {
    const user = await requirePermission(EXPENSE_PERMISSIONS.submitOwn);
    const expenseId = formData.get("expense_id") as string;
    if (!expenseId || typeof expenseId !== "string") {
      return { success: false, error: "Expense ID is required", errorCode: "invalid_input" };
    }

    const supabase = getExpenseRpcClient();
    // Validate ownership: must be submitted_by or claimant_id of current user
    const { data: exp, error: expErr } = await supabase
      .from("expenses")
      .select("id, submitted_by, claimant_id, status")
      .eq("id", expenseId)
      .maybeSingle();

    if (expErr || !exp) {
      return { success: false, error: "Expense not found", errorCode: "expense_not_found" };
    }

    if (exp.submitted_by !== user.id && exp.claimant_id !== user.id) {
      return {
        success: false,
        error: "Receipt attachment is restricted to own expenses",
        errorCode: "forbidden",
      };
    }

    const receiptFile = formData.get("receipt") ?? formData.get("file");
    if (
      !receiptFile ||
      typeof receiptFile !== "object" ||
      !("size" in receiptFile) ||
      Number((receiptFile as { size: number }).size) === 0
    ) {
      return { success: false, error: "Receipt file is required", errorCode: "missing_file" };
    }

    const requestId = (formData.get("request_id") as string) || randomUUID();

    const result = await uploadAndAttachExpenseReceiptInternal({
      expenseId,
      file: receiptFile,
      user,
      requestId,
    });

    if (!result.success) {
      return {
        success: false,
        error: result.error ?? "Failed to attach receipt",
        errorCode: result.errorCode ?? "attachment_failed",
      };
    }

    return {
      success: true,
      data: {
        expense_id: expenseId,
        document_id: result.documentId!,
      },
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected error during receipt attachment";
    return { success: false, error: message };
  }
}

// 1e. Get Private Expense Receipt Signed URL
export async function getPrivateExpenseReceiptUrlAction(
  expenseId: string,
  documentId?: string,
): Promise<W5ActionResult<{ signedUrl: string; expiresInSeconds: number }>> {
  try {
    let user;
    let isBroadReader = false;
    try {
      user = await requirePermission(EXPENSE_PERMISSIONS.read);
      isBroadReader = true;
    } catch {
      user = await requirePermission(EXPENSE_PERMISSIONS.readOwn);
    }

    const supabase = getExpenseRpcClient();

    // If own-only reader, verify Expense ownership
    if (!isBroadReader) {
      const { data: exp, error: expErr } = await supabase
        .from("expenses")
        .select("submitted_by, claimant_id")
        .eq("id", expenseId)
        .maybeSingle();

      if (expErr || !exp) {
        return { success: false, error: "Expense not found", errorCode: "expense_not_found" };
      }

      if (exp.submitted_by !== user.id && exp.claimant_id !== user.id) {
        return {
          success: false,
          error: "Receipt access is restricted to own expenses",
          errorCode: "forbidden",
        };
      }
    }

    let targetDocId = documentId;
    if (!targetDocId) {
      // Find the most recent document attached to this expense
      const { data: link, error: linkErr } = await supabase
        .from("expense_documents")
        .select("document_id")
        .eq("expense_id", expenseId)
        .order("attached_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (linkErr || !link) {
        return {
          success: false,
          error: "No document attached to this expense",
          errorCode: "document_not_linked",
        };
      }
      targetDocId = link.document_id;
    } else {
      // Verify specified document is attached to this specific expense
      const { data: link, error: linkErr } = await supabase
        .from("expense_documents")
        .select("document_id")
        .eq("expense_id", expenseId)
        .eq("document_id", targetDocId)
        .maybeSingle();

      if (linkErr || !link) {
        return {
          success: false,
          error: "Document is not attached to this expense",
          errorCode: "document_not_linked",
        };
      }
    }

    // Load document from business_documents
    const { data: doc, error: docErr } = await supabase
      .from("business_documents")
      .select("bucket_id, object_path")
      .eq("id", targetDocId)
      .maybeSingle();

    if (docErr || !doc) {
      return { success: false, error: "Document not found", errorCode: "document_not_found" };
    }

    if (doc.bucket_id !== BUSINESS_DOCUMENT_BUCKET) {
      return { success: false, error: "Invalid document bucket", errorCode: "invalid_bucket" };
    }

    // Generate short-lived signed URL (300 seconds)
    const { data: signedData, error: signErr } = await supabase.storage
      .from(BUSINESS_DOCUMENT_BUCKET)
      .createSignedUrl(doc.object_path, 300);

    if (signErr || !signedData?.signedUrl) {
      return {
        success: false,
        error: "Failed to generate receipt access URL",
        errorCode: "signed_url_failed",
      };
    }

    return {
      success: true,
      data: {
        signedUrl: signedData.signedUrl,
        expiresInSeconds: 300,
      },
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected error retrieving receipt URL";
    return { success: false, error: message };
  }
}


// 2. Approve Expense
export async function approveExpenseAction(
  rawInput: unknown,
): Promise<W5ActionResult<{ expense_id: string }>> {
  try {
    const user = await requirePermission(EXPENSE_PERMISSIONS.approve);
    const parsed = approveExpenseSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Invalid approval payload",
        errorCode: "validation_error",
      };
    }

    const supabase = getExpenseRpcClient();
    const { data, error } = await supabase.rpc("approve_expense", {
      p_expense_id: parsed.data.expense_id,
      p_request_id: parsed.data.request_id,
      p_actor_id: user.id,
      p_actor_role: user.role,
    });

    if (error) {
      return { success: false, error: error.message, errorCode: error.code };
    }

    const row = data?.[0];
    if (row?.error_code) {
      return { success: false, error: row.error_code, errorCode: row.error_code };
    }

    return {
      success: true,
      data: { expense_id: row.expense_id },
      idempotentReplay: row.idempotent_replay,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected error during expense approval";
    return { success: false, error: message };
  }
}

// 3. Reject Expense
export async function rejectExpenseAction(
  rawInput: unknown,
): Promise<W5ActionResult<{ expense_id: string }>> {
  try {
    const user = await requirePermission(EXPENSE_PERMISSIONS.approve);
    const parsed = rejectExpenseSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Invalid rejection payload",
        errorCode: "validation_error",
      };
    }

    const supabase = getExpenseRpcClient();
    const { data, error } = await supabase.rpc("reject_expense", {
      p_expense_id: parsed.data.expense_id,
      p_rejection_reason: parsed.data.rejection_reason,
      p_request_id: parsed.data.request_id,
      p_actor_id: user.id,
      p_actor_role: user.role,
    });

    if (error) {
      return { success: false, error: error.message, errorCode: error.code };
    }

    const row = data?.[0];
    if (row?.error_code) {
      return { success: false, error: row.error_code, errorCode: row.error_code };
    }

    return {
      success: true,
      data: { expense_id: row.expense_id },
      idempotentReplay: row.idempotent_replay,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected error during expense rejection";
    return { success: false, error: message };
  }
}

// 4. Cancel Expense
export async function cancelExpenseAction(
  rawInput: unknown,
): Promise<W5ActionResult<{ expense_id: string }>> {
  try {
    const user = await requirePermission(EXPENSE_PERMISSIONS.write);
    const parsed = cancelExpenseSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Invalid cancellation payload",
        errorCode: "validation_error",
      };
    }

    const supabase = getExpenseRpcClient();
    const { data, error } = await supabase.rpc("cancel_expense", {
      p_expense_id: parsed.data.expense_id,
      p_cancellation_reason: parsed.data.cancellation_reason,
      p_request_id: parsed.data.request_id,
      p_actor_id: user.id,
      p_actor_role: user.role,
    });

    if (error) {
      return { success: false, error: error.message, errorCode: error.code };
    }

    const row = data?.[0];
    if (row?.error_code) {
      return { success: false, error: row.error_code, errorCode: row.error_code };
    }

    return {
      success: true,
      data: { expense_id: row.expense_id },
      idempotentReplay: row.idempotent_replay,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected error during expense cancellation";
    return { success: false, error: message };
  }
}

// 5. Record Evidence Exception
export async function recordEvidenceExceptionAction(
  rawInput: unknown,
): Promise<W5ActionResult<{ exception_id: string }>> {
  try {
    const user = await requirePermission(EXPENSE_PERMISSIONS.write);
    const parsed = recordEvidenceExceptionSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Invalid evidence exception payload",
        errorCode: "validation_error",
      };
    }

    const supabase = getExpenseRpcClient();
    const { data, error } = await supabase.rpc("record_expense_evidence_exception", {
      p_expense_id: parsed.data.expense_id,
      p_reason: parsed.data.reason,
      p_accountable_owner_id: parsed.data.accountable_owner_id,
      p_review_before: parsed.data.review_before,
      p_request_id: parsed.data.request_id,
      p_actor_id: user.id,
      p_actor_role: user.role,
    });

    if (error) {
      return { success: false, error: error.message, errorCode: error.code };
    }

    const row = data?.[0];
    if (row?.error_code) {
      return { success: false, error: row.error_code, errorCode: row.error_code };
    }

    return {
      success: true,
      data: { exception_id: row.exception_id },
      idempotentReplay: row.idempotent_replay,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected error during exception recording";
    return { success: false, error: message };
  }
}

// 6. Dispose Evidence Exception
export async function disposeEvidenceExceptionAction(
  rawInput: unknown,
): Promise<W5ActionResult<{ exception_id: string }>> {
  try {
    const user = await requirePermission(EXPENSE_PERMISSIONS.approve);
    const parsed = disposeEvidenceExceptionSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Invalid exception disposition payload",
        errorCode: "validation_error",
      };
    }

    const supabase = getExpenseRpcClient();
    const { data, error } = await supabase.rpc("dispose_expense_evidence_exception", {
      p_exception_id: parsed.data.exception_id,
      p_disposition: parsed.data.disposition,
      p_disposition_notes: parsed.data.disposition_notes,
      p_request_id: parsed.data.request_id,
      p_actor_id: user.id,
      p_actor_role: user.role,
    });

    if (error) {
      return { success: false, error: error.message, errorCode: error.code };
    }

    const row = data?.[0];
    if (row?.error_code) {
      return { success: false, error: row.error_code, errorCode: row.error_code };
    }

    return {
      success: true,
      data: { exception_id: row.exception_id },
      idempotentReplay: row.idempotent_replay,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected error during exception disposition";
    return { success: false, error: message };
  }
}

// 7. Attach Expense Document
export async function attachExpenseDocumentAction(
  rawInput: unknown,
): Promise<W5ActionResult<{ expense_id: string; document_id: string }>> {
  try {
    const parsed = attachExpenseDocumentSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Invalid document attachment payload",
        errorCode: "validation_error",
      };
    }

    const supabase = getExpenseRpcClient();
    let user;
    try {
      user = await requirePermission(EXPENSE_PERMISSIONS.write);
    } catch {
      user = await requirePermission(EXPENSE_PERMISSIONS.submitOwn);
      const { data: exp, error: expErr } = await supabase
        .from("expenses")
        .select("submitted_by, claimant_id")
        .eq("id", parsed.data.expense_id)
        .maybeSingle();

      if (expErr || !exp) {
        return { success: false, error: "Expense not found", errorCode: "expense_not_found" };
      }
      if (exp.submitted_by !== user.id && exp.claimant_id !== user.id) {
        return {
          success: false,
          error: "Self-service receipt attachment is restricted to own expenses",
          errorCode: "forbidden",
        };
      }
    }
    const { data, error } = await supabase.rpc("attach_expense_document", {
      p_expense_id: parsed.data.expense_id,
      p_document_id: parsed.data.document_id,
      p_request_id: parsed.data.request_id,
      p_actor_id: user.id,
      p_actor_role: user.role,
    });

    if (error) {
      return { success: false, error: error.message, errorCode: error.code };
    }

    const row = data?.[0];
    if (row?.error_code) {
      return { success: false, error: row.error_code, errorCode: row.error_code };
    }

    return {
      success: true,
      data: { expense_id: row.expense_id, document_id: row.document_id },
      idempotentReplay: row.idempotent_replay,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected error during document attachment";
    return { success: false, error: message };
  }
}

// 8. Settle Expense Reimbursement
export async function settleExpenseReimbursementAction(
  rawInput: unknown,
): Promise<W5ActionResult<{ settlement_id: string }>> {
  try {
    const user = await requirePermission(EXPENSE_PERMISSIONS.settle);
    const parsed = settleExpenseReimbursementSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Invalid reimbursement settlement payload",
        errorCode: "validation_error",
      };
    }

    const supabase = getExpenseRpcClient();
    const { data, error } = await supabase.rpc("settle_expense_reimbursement", {
      p_expense_id: parsed.data.expense_id,
      p_settlement_number: parsed.data.settlement_number,
      p_amount: parsed.data.amount,
      p_settlement_method: parsed.data.settlement_method,
      p_payment_reference: parsed.data.payment_reference ?? null,
      p_notes: parsed.data.notes ?? null,
      p_request_id: parsed.data.request_id,
      p_actor_id: user.id,
      p_actor_role: user.role,
    });

    if (error) {
      return { success: false, error: error.message, errorCode: error.code };
    }

    const row = data?.[0];
    if (row?.error_code) {
      return { success: false, error: row.error_code, errorCode: row.error_code };
    }

    return {
      success: true,
      data: { settlement_id: row.settlement_id },
      idempotentReplay: row.idempotent_replay,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected error during reimbursement settlement";
    return { success: false, error: message };
  }
}

// 9. Request Cash Advance
export async function requestCashAdvanceAction(
  rawInput: unknown,
): Promise<W5ActionResult<{ advance_id: string }>> {
  try {
    const user = await requirePermission(CASH_ADVANCE_PERMISSIONS.create);
    const parsed = requestCashAdvanceSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Invalid cash advance request payload",
        errorCode: "validation_error",
      };
    }

    const supabase = getExpenseRpcClient();
    const { data, error } = await supabase.rpc("request_cash_advance", {
      p_advance_number: parsed.data.advance_number,
      p_context_type: parsed.data.context_type,
      p_service_id: parsed.data.service_id ?? null,
      p_recipient_id: parsed.data.recipient_id,
      p_purpose: parsed.data.purpose,
      p_amount_issued: parsed.data.amount_issued,
      p_request_id: parsed.data.request_id,
      p_actor_id: user.id,
      p_actor_role: user.role,
    });

    if (error) {
      return { success: false, error: error.message, errorCode: error.code };
    }

    const row = data?.[0];
    if (row?.error_code) {
      return { success: false, error: row.error_code, errorCode: row.error_code };
    }

    return {
      success: true,
      data: { advance_id: row.advance_id },
      idempotentReplay: row.idempotent_replay,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected error during cash advance request";
    return { success: false, error: message };
  }
}

// 9b. Request Own Cash Advance (Self-Service)
export async function requestOwnCashAdvanceAction(
  rawInput: unknown,
): Promise<W5ActionResult<{ advance_id: string }>> {
  try {
    const user = await requirePermission(CASH_ADVANCE_PERMISSIONS.submitOwn);
    const parsed = requestOwnCashAdvanceSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Invalid cash advance request payload",
        errorCode: "validation_error",
      };
    }

    const supabase = getExpenseRpcClient();
    // Server-authoritative constraints forced by backend:
    // p_advance_number = null (database generates authoritative ADV-YYYY-0001)
    // p_recipient_id = user.id
    // p_actor_id = user.id
    // p_actor_role = user.role
    const { data, error } = await supabase.rpc("request_cash_advance", {
      p_advance_number: null,
      p_context_type: parsed.data.context_type,
      p_service_id: parsed.data.service_id ?? null,
      p_recipient_id: user.id,
      p_purpose: parsed.data.purpose,
      p_amount_issued: parsed.data.amount_issued,
      p_request_id: parsed.data.request_id,
      p_actor_id: user.id,
      p_actor_role: user.role,
    });

    if (error) {
      return { success: false, error: error.message, errorCode: error.code };
    }

    const row = data?.[0];
    if (row?.error_code) {
      return { success: false, error: row.error_code, errorCode: row.error_code };
    }

    return {
      success: true,
      data: { advance_id: row.advance_id },
      idempotentReplay: row.idempotent_replay,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected error during cash advance request";
    return { success: false, error: message };
  }
}

// 10. Approve Cash Advance
export async function approveCashAdvanceAction(
  rawInput: unknown,
): Promise<W5ActionResult<{ advance_id: string }>> {
  try {
    const user = await requirePermission(CASH_ADVANCE_PERMISSIONS.approve);
    const parsed = approveCashAdvanceSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Invalid advance approval payload",
        errorCode: "validation_error",
      };
    }

    const supabase = getExpenseRpcClient();
    const { data, error } = await supabase.rpc("approve_cash_advance", {
      p_advance_id: parsed.data.advance_id,
      p_request_id: parsed.data.request_id,
      p_actor_id: user.id,
      p_actor_role: user.role,
    });

    if (error) {
      return { success: false, error: error.message, errorCode: error.code };
    }

    const row = data?.[0];
    if (row?.error_code) {
      return { success: false, error: row.error_code, errorCode: row.error_code };
    }

    return {
      success: true,
      data: { advance_id: row.advance_id },
      idempotentReplay: row.idempotent_replay,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected error during advance approval";
    return { success: false, error: message };
  }
}

// 11. Reject Cash Advance
export async function rejectCashAdvanceAction(
  rawInput: unknown,
): Promise<W5ActionResult<{ advance_id: string }>> {
  try {
    const user = await requirePermission(CASH_ADVANCE_PERMISSIONS.approve);
    const parsed = rejectCashAdvanceSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Invalid advance rejection payload",
        errorCode: "validation_error",
      };
    }

    const supabase = getExpenseRpcClient();
    const { data, error } = await supabase.rpc("reject_cash_advance", {
      p_advance_id: parsed.data.advance_id,
      p_rejection_reason: parsed.data.rejection_reason,
      p_request_id: parsed.data.request_id,
      p_actor_id: user.id,
      p_actor_role: user.role,
    });

    if (error) {
      return { success: false, error: error.message, errorCode: error.code };
    }

    const row = data?.[0];
    if (row?.error_code) {
      return { success: false, error: row.error_code, errorCode: row.error_code };
    }

    return {
      success: true,
      data: { advance_id: row.advance_id },
      idempotentReplay: row.idempotent_replay,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected error during advance rejection";
    return { success: false, error: message };
  }
}

// 12. Cancel Cash Advance
export async function cancelCashAdvanceAction(
  rawInput: unknown,
): Promise<W5ActionResult<{ advance_id: string }>> {
  try {
    const user = await requirePermission(CASH_ADVANCE_PERMISSIONS.create);
    const parsed = cancelCashAdvanceSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Invalid advance cancellation payload",
        errorCode: "validation_error",
      };
    }

    const supabase = getExpenseRpcClient();
    const { data, error } = await supabase.rpc("cancel_cash_advance", {
      p_advance_id: parsed.data.advance_id,
      p_cancellation_reason: parsed.data.cancellation_reason,
      p_request_id: parsed.data.request_id,
      p_actor_id: user.id,
      p_actor_role: user.role,
    });

    if (error) {
      return { success: false, error: error.message, errorCode: error.code };
    }

    const row = data?.[0];
    if (row?.error_code) {
      return { success: false, error: row.error_code, errorCode: row.error_code };
    }

    return {
      success: true,
      data: { advance_id: row.advance_id },
      idempotentReplay: row.idempotent_replay,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected error during advance cancellation";
    return { success: false, error: message };
  }
}

// 13. Issue Cash Advance
export async function issueCashAdvanceAction(
  rawInput: unknown,
): Promise<W5ActionResult<{ advance_id: string }>> {
  try {
    const user = await requirePermission(CASH_ADVANCE_PERMISSIONS.issue);
    const parsed = issueCashAdvanceSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Invalid advance issue payload",
        errorCode: "validation_error",
      };
    }

    const supabase = getExpenseRpcClient();
    const { data, error } = await supabase.rpc("issue_cash_advance", {
      p_advance_id: parsed.data.advance_id,
      p_payment_reference: parsed.data.payment_reference ?? null,
      p_request_id: parsed.data.request_id,
      p_actor_id: user.id,
      p_actor_role: user.role,
    });

    if (error) {
      return { success: false, error: error.message, errorCode: error.code };
    }

    const row = data?.[0];
    if (row?.error_code) {
      return { success: false, error: row.error_code, errorCode: row.error_code };
    }

    return {
      success: true,
      data: { advance_id: row.advance_id },
      idempotentReplay: row.idempotent_replay,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected error during advance issue";
    return { success: false, error: message };
  }
}

// 14. Settle Cash Advance Spend
export async function settleCashAdvanceSpendAction(
  rawInput: unknown,
): Promise<W5ActionResult<{ allocation_id: string }>> {
  try {
    const user = await requirePermission(CASH_ADVANCE_PERMISSIONS.settle);
    const parsed = settleCashAdvanceSpendSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Invalid advance spend allocation payload",
        errorCode: "validation_error",
      };
    }

    const supabase = getExpenseRpcClient();
    const { data, error } = await supabase.rpc("settle_cash_advance_spend", {
      p_advance_id: parsed.data.advance_id,
      p_expense_id: parsed.data.expense_id,
      p_amount: parsed.data.amount,
      p_notes: parsed.data.notes ?? null,
      p_request_id: parsed.data.request_id,
      p_actor_id: user.id,
      p_actor_role: user.role,
    });

    if (error) {
      return { success: false, error: error.message, errorCode: error.code };
    }

    const row = data?.[0];
    if (row?.error_code) {
      return { success: false, error: row.error_code, errorCode: row.error_code };
    }

    return {
      success: true,
      data: { allocation_id: row.allocation_id },
      idempotentReplay: row.idempotent_replay,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected error during advance spend allocation";
    return { success: false, error: message };
  }
}

// 15. Record Cash Advance Return
export async function recordCashAdvanceReturnAction(
  rawInput: unknown,
): Promise<W5ActionResult<{ return_id: string }>> {
  try {
    const user = await requirePermission(CASH_ADVANCE_PERMISSIONS.settle);
    const parsed = recordCashAdvanceReturnSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Invalid cash advance return payload",
        errorCode: "validation_error",
      };
    }

    const supabase = getExpenseRpcClient();
    const { data, error } = await supabase.rpc("record_cash_advance_return", {
      p_advance_id: parsed.data.advance_id,
      p_amount: parsed.data.amount,
      p_receipt_reference: parsed.data.receipt_reference ?? null,
      p_notes: parsed.data.notes ?? null,
      p_request_id: parsed.data.request_id,
      p_actor_id: user.id,
      p_actor_role: user.role,
    });

    if (error) {
      return { success: false, error: error.message, errorCode: error.code };
    }

    const row = data?.[0];
    if (row?.error_code) {
      return { success: false, error: row.error_code, errorCode: row.error_code };
    }

    return {
      success: true,
      data: { return_id: row.return_id },
      idempotentReplay: row.idempotent_replay,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected error during advance return recording";
    return { success: false, error: message };
  }
}

// 16. Record Petty Cash Transaction
export async function recordPettyCashTransactionAction(
  rawInput: unknown,
): Promise<W5ActionResult<{ transaction_id: string }>> {
  try {
    const user = await requirePermission(PETTY_CASH_PERMISSIONS.transact);
    const parsed = recordPettyCashTransactionSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Invalid petty cash transaction payload",
        errorCode: "validation_error",
      };
    }

    const supabase = getExpenseRpcClient();
    const { data, error } = await supabase.rpc("record_petty_cash_transaction", {
      p_fund_id: parsed.data.fund_id,
      p_transaction_type: parsed.data.transaction_type,
      p_amount: parsed.data.amount,
      p_reference: parsed.data.reference ?? null,
      p_expense_id: parsed.data.expense_id ?? null,
      p_notes: parsed.data.notes ?? null,
      p_request_id: parsed.data.request_id,
      p_actor_id: user.id,
      p_actor_role: user.role,
    });

    if (error) {
      return { success: false, error: error.message, errorCode: error.code };
    }

    const row = data?.[0];
    if (row?.error_code) {
      return { success: false, error: row.error_code, errorCode: row.error_code };
    }

    return {
      success: true,
      data: { transaction_id: row.transaction_id },
      idempotentReplay: row.idempotent_replay,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected error during petty cash transaction recording";
    return { success: false, error: message };
  }
}

// 17. Review Expense Finance (W5B-1A Gate)
export async function reviewExpenseFinanceAction(
  rawInput: unknown,
): Promise<W5ActionResult<{ expense_id: string }>> {
  try {
    const user = await requirePermission(EXPENSE_PERMISSIONS.financeReview);
    const parsed = reviewExpenseFinanceSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Invalid finance review payload",
        errorCode: "validation_error",
      };
    }

    const supabase = getExpenseRpcClient();
    const { data, error } = await supabase.rpc("review_expense_finance", {
      p_expense_id: parsed.data.expense_id,
      p_request_id: parsed.data.request_id,
      p_actor_id: user.id,
      p_actor_role: user.role,
    });

    if (error) {
      return { success: false, error: error.message, errorCode: error.code };
    }

    const row = data?.[0];
    if (row?.error_code) {
      return { success: false, error: row.error_code, errorCode: row.error_code };
    }

    return {
      success: true,
      data: { expense_id: row.expense_id },
      idempotentReplay: row.idempotent_replay,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected error during finance review";
    return { success: false, error: message };
  }
}


// Fail-closed post-authoritative correction guard (Option B)
export async function updateExpenseAction(): Promise<W5ActionResult> {
  return {
    success: false,
    error: "Post-authoritative direct mutation of expenses is forbidden. Formal corrections fail closed in W5A.",
    errorCode: "post_authoritative_mutation_forbidden",
  };
}
