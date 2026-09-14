import type { SupplierBillPaymentHistoryItem, SupplierBillPaymentSummary } from "@/lib/supplier-payments/types";

export type SupplierBillStatus = "pending" | "approved";

export interface SupplierBill {
  id: string;
  bill_number: string;
  service_id: string;
  supplier_id: string;
  commitment_id: string;
  service_receipt_id: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string | null;
  currency: string;
  subtotal: number;
  vat_amount: number;
  total_amount: number;
  supplier_name_snapshot: string;
  supplier_legal_name_snapshot: string;
  supplier_cr_number_snapshot: string | null;
  supplier_vat_registration_status_snapshot: string | null;
  supplier_vat_number_snapshot: string | null;
  status: SupplierBillStatus;
  recorded_by: string;
  recorded_at: string;
  updated_by: string;
  updated_at: string;
  approved_by: string | null;
  approved_at: string | null;
  record_request_id: string;
}

export interface SupplierBillListItem extends SupplierBill {
  supplier_name: string;
  service_number: string;
  service_title: string;
  event_name: string | null;
}

export interface SupplierBillDocument {
  document_id: string;
  original_filename: string;
  mime_type: string;
  file_size: number;
  attached_at: string;
  attached_by: string;
}

export interface SupplierBillDetail extends SupplierBill {
  supplier_name: string;
  supplier_legal_name: string;
  service_number: string;
  service_title: string;
  event_name: string | null;
  commitment_currency: string;
  commitment_source: string;
  commitment_source_reference: string | null;
  commitment_quotation_reference: string | null;
  commitment_status: string;
  authorized_amount: number;
  accepted_amount: number;
  receipt_acceptance_status: string;
  receipt_performance_date: string;
  receipt_received_amount: number | null;
  receipt_delivered_scope: string;
  receipt_reviewed_at: string | null;
  receipt_reviewed_by: string | null;
  documents: SupplierBillDocument[];
  paymentSummary: SupplierBillPaymentSummary | null;
  paymentHistory: SupplierBillPaymentHistoryItem[];
}

export interface SupplierBillSupplierOption {
  id: string;
  name: string;
  legalName: string | null;
  crNumber: string | null;
  vatRegistrationStatus: string | null;
  vatNumber: string | null;
}

export interface SupplierBillServiceOption {
  id: string;
  serviceNumber: string;
  serviceTitle: string;
  eventName: string | null;
}

export interface SupplierBillCommitmentOption {
  id: string;
  serviceId: string;
  supplierId: string;
  currency: string;
  status: string;
  authorizedAmount: number;
  openCommitmentAmount: number;
}

export interface SupplierBillReceiptOption {
  id: string;
  serviceId: string;
  supplierId: string;
  commitmentId: string;
  acceptanceStatus: string;
  performanceDate: string;
  receivedAmount: number | null;
  deliveredScope: string;
}

export interface SupplierBillFormOptions {
  suppliers: SupplierBillSupplierOption[];
  services: SupplierBillServiceOption[];
  commitments: SupplierBillCommitmentOption[];
  receipts: SupplierBillReceiptOption[];
}

export interface SupplierBillActionResult<T = Record<string, unknown>> {
  success: boolean;
  data?: T;
  error?: string;
  errorCode?: string;
  idempotentReplay?: boolean;
}
