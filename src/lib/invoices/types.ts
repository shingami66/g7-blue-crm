import type { InvoiceType, JsonValue } from "@/types/invoice";

export interface CreateInvoiceInput {
  quotationId: string;
  serviceId: string;
  invoiceType: InvoiceType;
  requestedAmount?: number;
}

export interface CreateInvoiceResult {
  success: boolean;
  invoiceId?: string;
  invoiceNumber?: string;
  error?: string;
}

export interface InvoiceSnapshotData {
  snapshot_seller: JsonValue | null;
  snapshot_buyer: JsonValue | null;
  snapshot_quotation: JsonValue | null;
  snapshot_bank_details: JsonValue | null;
  snapshot_document_rules: JsonValue | null;
}

export interface InvoiceRow {
  id: string;
  invoice_number: string;
  approved_quotation_id: string;
  invoice_type: string;
  service_id: string;
  status: string;
  subtotal: number;
  discount_amount: number;
  vat_rate: number;
  vat_amount: number;
  grand_total: number;
  amount_paid: number;
  balance_due: number;
  currency: string;
  document_label: string;
  vat_mode: string;
  snapshot_seller: JsonValue | null;
  snapshot_buyer: JsonValue | null;
  snapshot_quotation: JsonValue | null;
  snapshot_bank_details: JsonValue | null;
  snapshot_document_rules: JsonValue | null;
  issued_at: string | null;
  voided_at: string | null;
  void_reason: string | null;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
  deleted_at: string | null;
}
