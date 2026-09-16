import type { ListPageSize } from "@/lib/pagination";
import type { SupplierPaymentMethod } from "@/lib/supplier-payments/types";

export type SupplierAdvanceStatus = "authorized" | "partially_paid" | "paid";

export interface SupplierAdvanceBalance {
  supplier_advance_id: string;
  advance_number: string;
  commitment_id: string;
  supplier_id: string;
  service_id: string;
  currency: string;
  authorized_amount: number;
  paid_amount: number;
  allocated_amount: number;
  refunded_amount: number;
  reversed_amount: number;
  remaining_unallocated_amount: number;
  status: SupplierAdvanceStatus;
}

export interface SupplierAdvanceListItem {
  supplier_advance_id: string;
  advance_number: string;
  commitment_id: string;
  supplier_id: string;
  service_id: string;
  currency: string;
  authorized_amount: number;
  status: SupplierAdvanceStatus;
  supplier_name: string;
  service_number: string;
  service_title: string;
  commitment_source: string;
  commitment_reference: string | null;
  authorized_at: string;
}

export interface SupplierAdvanceListQuery {
  page?: number;
  pageSize?: ListPageSize;
}

export interface SupplierAdvanceListPagination {
  page: number;
  pageSize: ListPageSize;
  total: number;
  totalPages: number;
}

export interface SupplierAdvancesListResult {
  advances: SupplierAdvanceListItem[];
  pagination: SupplierAdvanceListPagination;
  error?: "supplier_advances_load_failed";
}

export interface SupplierAdvanceDocument {
  document_id: string;
  original_filename: string;
  mime_type: string;
  file_size: number;
  attached_at: string;
  kind: "authorization" | "payment" | "refund";
  event_id: string;
}

export interface SupplierAdvancePayment {
  id: string;
  payment_number: string;
  payment_date: string;
  amount: number;
  method: SupplierPaymentMethod;
  reference: string | null;
  notes: string | null;
  bank_name_snapshot: string | null;
  bank_account_name_snapshot: string | null;
  iban_snapshot_masked: string | null;
  recorded_at: string;
  recorded_by_name: string;
  reversal_reason: string | null;
  reversed_at: string | null;
  reversed_by_name: string | null;
  documents: SupplierAdvanceDocument[];
}

export interface SupplierAdvanceAllocation {
  id: string;
  bill_id: string;
  bill_number: string;
  amount: number;
  allocated_at: string;
  allocated_by_name: string;
  correction_reason: string | null;
  corrected_at: string | null;
  corrected_by_name: string | null;
}

export interface SupplierAdvanceRefund {
  id: string;
  refund_number: string;
  business_date: string;
  amount: number;
  reason: string;
  reference: string | null;
  recorded_at: string;
  recorded_by_name: string;
  documents: SupplierAdvanceDocument[];
}

export interface SupplierAdvanceDetail extends SupplierAdvanceBalance {
  supplier_name: string;
  service_number: string;
  service_title: string;
  commitment_source: string;
  commitment_reference: string | null;
  authorized_at: string;
  reason: string;
  authorized_by_name: string;
  commitment_authorized_amount: number;
  commitment_open_amount: number;
  commitment_reserved_amount: number;
  commitment_available_authorization_amount: number;
  documents: SupplierAdvanceDocument[];
  payments: SupplierAdvancePayment[];
  allocations: SupplierAdvanceAllocation[];
  refunds: SupplierAdvanceRefund[];
}

export interface SupplierAdvanceCommitmentOption {
  id: string;
  supplier_id: string;
  service_id: string;
  supplier_name: string;
  service_number: string;
  service_title: string;
  commitment_source: string;
  commitment_reference: string | null;
  currency: string;
  authorized_amount: number;
  open_commitment_amount: number;
  existing_advance_reserve: number;
  available_authorization_amount: number;
}

export interface SupplierAdvanceBillOption {
  id: string;
  bill_number: string;
  invoice_number: string;
  invoice_date: string;
  currency: string;
  payable_amount: number;
  paid_amount: number;
  advance_allocated_amount: number;
  outstanding_amount: number;
}

export interface SupplierAdvanceActionResult<T = Record<string, unknown>> {
  success: boolean;
  data?: T;
  error?: string;
  errorCode?: string;
  idempotentReplay?: boolean;
}

export interface SupplierBillAdvanceAllocationHistoryItem {
  id: string;
  advance_id: string;
  advance_number: string;
  amount: number;
  allocated_at: string;
  status: "allocated" | "corrected";
}
