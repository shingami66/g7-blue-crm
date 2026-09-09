export type ExpenseContextType = "company" | "event";
export type ExpenseOriginType = "company_direct" | "employee_paid";
export type ExpensePaymentMethod =
  | "company_funds"
  | "petty_cash"
  | "cash_advance"
  | "personal_funds";
export type ExpenseStatus =
  | "draft"
  | "submitted"
  | "approved"
  | "rejected"
  | "cancelled";

export type ReimbursementStatus =
  | "not_applicable"
  | "pending"
  | "partially_settled"
  | "fully_settled";

export type EvidenceStatus =
  | "receipt_attached"
  | "exception_pending"
  | "exception_accepted"
  | "exception_rejected"
  | "exception_rectified"
  | "no_evidence";

export type ExceptionDisposition =
  | "pending"
  | "accepted"
  | "rejected"
  | "rectified";

export type CashAdvanceStatus =
  | "draft"
  | "submitted"
  | "approved"
  | "issued"
  | "settled"
  | "rejected"
  | "cancelled";

export type SettlementMethod = "bank_transfer" | "cash" | "advance_offset";

export type PettyCashFundStatus = "active" | "suspended" | "closed";
export type PettyCashTransactionType =
  | "replenishment"
  | "disbursement"
  | "return"
  | "treasury_withdrawal";

export interface Expense {
  id: string;
  expense_number: string;
  context_type: ExpenseContextType;
  service_id: string | null;
  expense_category: string;
  description: string;
  amount: number;
  currency: string;
  expense_date: string;
  origin_type: ExpenseOriginType;
  payment_method: ExpensePaymentMethod;
  cash_advance_id: string | null;
  petty_cash_fund_id: string | null;
  claimant_id: string | null;
  submitted_by: string;
  submitted_at: string;
  status: ExpenseStatus;
  approved_by: string | null;
  approved_at: string | null;
  rejected_by: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
  cancelled_by: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  finance_reviewed_by: string | null;
  finance_reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ExpenseEvidenceException {
  id: string;
  expense_id: string;
  reason: string;
  accountable_owner_id: string;
  review_before: string;
  disposition: ExceptionDisposition;
  disposition_notes: string | null;
  disposed_by: string | null;
  disposed_at: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ExpenseDocumentLink {
  expense_id: string;
  document_id: string;
  attached_by: string;
  attached_at: string;
}

export interface ExpenseReimbursementSettlement {
  id: string;
  settlement_number: string;
  expense_id: string;
  amount: number;
  settlement_method: SettlementMethod;
  payment_reference: string | null;
  request_id: string;
  settled_by: string;
  settled_at: string;
  notes: string | null;
}

export interface CashAdvanceExpenseSettlement {
  id: string;
  cash_advance_id: string;
  expense_id: string;
  amount: number;
  request_id: string;
  settled_by: string;
  settled_at: string;
  notes: string | null;
}

export interface EmployeeCashAdvance {
  id: string;
  advance_number: string;
  context_type: ExpenseContextType;
  service_id: string | null;
  recipient_id: string;
  purpose: string;
  amount_issued: number;
  amount_spent_settled: number;
  amount_returned: number;
  remaining_balance: number;
  status: CashAdvanceStatus;
  requested_by: string;
  requested_at: string;
  approved_by: string | null;
  approved_at: string | null;
  rejected_by: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
  issued_by: string | null;
  issued_at: string | null;
  payment_reference: string | null;
  settled_at: string | null;
  cancelled_by: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface CashAdvanceReturn {
  id: string;
  cash_advance_id: string;
  amount: number;
  receipt_reference: string | null;
  request_id: string;
  returned_by: string;
  returned_at: string;
  notes: string | null;
}

export interface EnrichedCashAdvance extends EmployeeCashAdvance {
  recipientName?: string;
  serviceNumber?: string;
  serviceTitle?: string;
  eventName?: string | null;
}

export interface EnrichedCashAdvanceExpenseSettlement extends CashAdvanceExpenseSettlement {
  expenseNumber?: string;
}

export interface PettyCashFund {
  id: string;
  fund_name: string;
  custodian_id: string;
  float_limit: number;
  current_balance: number;
  status: PettyCashFundStatus;
  created_at: string;
  updated_at: string;
  custodian_name?: string;
  custodian_email?: string;
  last_activity_at?: string | null;
}

export interface PettyCashTransaction {
  id: string;
  fund_id: string;
  transaction_type: PettyCashTransactionType;
  amount: number;
  balance_before: number;
  balance_after: number;
  expense_id: string | null;
  reference: string | null;
  request_id: string;
  recorded_by: string;
  recorded_at: string;
  notes: string | null;
}

export interface PettyCashCustodianOption {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface PettyCashExpenseSummary {
  id: string;
  expense_number: string;
  status: ExpenseStatus;
  expense_date: string;
  context_type: ExpenseContextType;
  expense_category: string;
  description: string;
  amount: number;
  finance_reviewed_at: string | null;
  approved_at: string | null;
  petty_cash_allocated_amount: number;
  remaining_petty_cash_amount: number;
}

export interface ExpenseAccountabilitySummary {
  id: string;
  expense_number: string;
  context_type: ExpenseContextType;
  service_id: string | null;
  expense_category: string;
  description: string;
  amount: number;
  currency: string;
  expense_date: string;
  origin_type: ExpenseOriginType;
  payment_method: ExpensePaymentMethod;
  cash_advance_id: string | null;
  petty_cash_fund_id: string | null;
  claimant_id: string | null;
  submitted_by: string;
  submitted_at: string;
  status: ExpenseStatus;
  approved_by: string | null;
  approved_at: string | null;
  rejected_by: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
  cancelled_by: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  created_at: string;
  updated_at: string;
  reimbursed_amount: number;
  advance_allocated_amount: number;
  petty_cash_allocated_amount: number;
  total_settled_amount: number;
  remaining_unsettled_amount: number;
  reimbursement_status: ReimbursementStatus;
  evidence_status: EvidenceStatus;
  document_count: number;
  exception_id: string | null;
  exception_disposition: ExceptionDisposition | null;
  exception_review_before: string | null;
  exception_accountable_owner_id: string | null;
  finance_reviewed_by: string | null;
  finance_reviewed_at: string | null;
  is_finance_reviewed?: boolean;
}

export interface ExpenseRowCapabilities {
  canFinanceReview: boolean;
  canApprove: boolean;
  canReject: boolean;
}

export interface W5ActionResult<T = Record<string, unknown>> {
  success: boolean;
  data?: T;
  error?: string;
  errorCode?: string;
  idempotentReplay?: boolean;
}

export type PettyCashExpenseSubmissionOutcome = "full_success" | "partial_success";
export type PettyCashExpenseSubmissionWarningCode = "receipt_attachment_failed";

export interface PettyCashExpenseSubmissionData {
  expense_id: string;
  expense_number: string;
  outcome: PettyCashExpenseSubmissionOutcome;
  warning_code?: PettyCashExpenseSubmissionWarningCode;
  receipt_request_id?: string;
}

export interface ExpenseServiceOption {
  id: string;
  serviceNumber: string;
  serviceTitle: string;
  eventName: string | null;
  status: string;
}

export interface ExpenseDocumentDetail {
  documentId: string;
  originalFilename: string;
  mimeType: string;
  fileSize: number;
  attachedAt: string;
  attachedBy: string;
}

export type SelfServiceSubmissionOutcome =
  | "full_success"
  | "partial_success"
  | "validation_error";

export interface SelfServiceExpenseSubmissionData {
  expenseId: string;
  expenseNumber: string;
  documentId?: string;
  outcome: SelfServiceSubmissionOutcome;
  warning?: string;
}

export interface LinkedCashAdvanceExpense {
  expense_id: string;
  expense_number: string;
  status: ExpenseStatus;
  expense_category: string;
  description: string;
  amount: number;
  expense_date: string;
  finance_reviewed_at: string | null;
  approved_at: string | null;
  rejected_at: string | null;
  cash_advance_id: string;
  settled_amount: number;
  unsettled_amount: number;
}

export interface CashAdvanceBalanceSummary {
  advance_id: string;
  advance_number: string;
  recipient_id: string;
  context_type: ExpenseContextType;
  service_id: string | null;
  status: CashAdvanceStatus;
  amount_issued: number;
  amount_spent_settled: number;
  amount_returned: number;
  remaining_balance: number;
  reserved_unsettled_spend: number;
  available_uncommitted_balance: number;
}
