import type { VatMode } from "@/types/settings";
import type { QuotationSnapshotSeller, QuotationSnapshotBuyer } from "@/lib/quotations/types";

export type InvoiceStatus = "draft" | "sent" | "paid" | "partial" | "overdue" | "cancelled" | "voided";

export type InvoiceType = "deposit" | "final";

export type JsonValue = string | number | boolean | null | { [key: string]: JsonValue } | JsonValue[];

export interface InvoiceItem {
  description: string;
  details: string;
  qty: number;
  unitPrice: number;
  vat: number;
  total: number;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  approved_quotation_id: string;
  invoice_type: InvoiceType;
  service_id: string;
  status: InvoiceStatus;
  subtotal: number;
  discount_amount: number;
  vat_rate: number;
  vat_amount: number;
  grand_total: number;
  amount_paid: number;
  balance_due: number;
  currency: string;
  document_label: string;
  vat_mode: VatMode;
  snapshot_seller: QuotationSnapshotSeller | JsonValue | null;
  snapshot_buyer: QuotationSnapshotBuyer | JsonValue | null;
  snapshot_quotation: JsonValue | null;
  snapshot_bank_details: JsonValue | null;
  snapshot_document_rules: JsonValue | null;
  issued_at: string | null;
  voided_at: string | null;
  void_reason: string | null;
  created_at: string;
  updated_at: string;

  // Kept for backward compatibility with existing static UI
  customerId?: string;
  customer?: string;
  relatedQuote?: string;
  date?: string;
  dueDate?: string;
  amount?: string;
  items?: InvoiceItem[];
}
