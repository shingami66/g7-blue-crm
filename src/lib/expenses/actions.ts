"use server";

import "server-only";

import { requirePermission } from "@/lib/auth/permissions";
import {
  EXPENSE_PERMISSIONS,
  CASH_ADVANCE_PERMISSIONS,
  PETTY_CASH_PERMISSIONS,
} from "@/lib/auth/role-permissions";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  submitExpenseSchema,
  approveExpenseSchema,
  rejectExpenseSchema,
  cancelExpenseSchema,
  recordEvidenceExceptionSchema,
  disposeEvidenceExceptionSchema,
  attachExpenseDocumentSchema,
  settleExpenseReimbursementSchema,
  requestCashAdvanceSchema,
  approveCashAdvanceSchema,
  rejectCashAdvanceSchema,
  cancelCashAdvanceSchema,
  issueCashAdvanceSchema,
  settleCashAdvanceSpendSchema,
  recordCashAdvanceReturnSchema,
  recordPettyCashTransactionSchema,
} from "./schemas";
import type { W5ActionResult } from "./types";

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
    const user = await requirePermission(EXPENSE_PERMISSIONS.write);
    const parsed = submitExpenseSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Invalid expense submission payload",
        errorCode: "validation_error",
      };
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
    const user = await requirePermission(EXPENSE_PERMISSIONS.write);
    const parsed = attachExpenseDocumentSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Invalid document attachment payload",
        errorCode: "validation_error",
      };
    }

    const supabase = getExpenseRpcClient();
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
    const message = err instanceof Error ? err.message : "Unexpected error during petty cash transaction";
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
