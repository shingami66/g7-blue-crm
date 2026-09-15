export type SupplierPaymentMethod = "bank_transfer" | "cash" | "cheque";
export type SupplierPaymentRecordStatus = "recorded" | "reversed";
export type SupplierBillPaymentStatus = "unpaid" | "partially_paid" | "paid";

export interface SupplierBillPaymentSummary {
  supplier_bill_id: string;
  bill_number: string;
  currency: string;
  payable_amount: number;
  paid_amount: number;
  advance_allocated_amount: number;
  outstanding_amount: number;
  payment_status: SupplierBillPaymentStatus;
}

export interface SupplierPaymentDocument {
  document_id: string;
  original_filename: string;
  mime_type: string;
  file_size: number;
  attached_at: string;
}

export interface SupplierPayment {
  id: string;
  payment_number: string;
  supplier_bill_id: string;
  supplier_id: string;
  service_id: string;
  payment_date: string;
  amount: number;
  method: SupplierPaymentMethod;
  reference: string | null;
  bank_name_snapshot: string | null;
  bank_account_name_snapshot: string | null;
  iban_snapshot: string | null;
  notes: string | null;
  recorded_by: string;
  recorded_at: string;
  record_request_id: string;
  reversed_at: string | null;
  reversal_reason: string | null;
  status: SupplierPaymentRecordStatus;
}

export interface SupplierPaymentListItem extends SupplierPayment {
  bill_number: string;
  supplier_name: string;
  service_number: string;
  service_title: string;
}

export interface SupplierPaymentDetail extends SupplierPayment {
  bill_number: string;
  supplier_name: string;
  service_number: string;
  service_title: string;
  bill_currency: string;
  bill_total: number;
  outstanding_amount: number;
  documents: SupplierPaymentDocument[];
  reversed_by_name: string | null;
}

export interface SupplierBillPaymentHistoryItem {
  id: string;
  payment_number: string;
  payment_date: string;
  amount: number;
  method: SupplierPaymentMethod;
  reference: string | null;
  status: SupplierPaymentRecordStatus;
  reversed_at: string | null;
}

export interface SupplierPaymentActionResult<T = Record<string, unknown>> {
  success: boolean;
  data?: T;
  error?: string;
  errorCode?: string;
  idempotentReplay?: boolean;
}
