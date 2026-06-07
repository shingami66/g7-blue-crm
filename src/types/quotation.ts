import { AuditFields } from "./common";

export type QuotationStatus = "draft" | "sent" | "approved" | "rejected" | "expired";

export interface QuotationItem {
  description: string;
  details: string;
  category: string;
  qty: number;
  unitPrice: number;
  vat: number;
  total: number;
}

export interface QuotationTotals {
  subtotal: number;
  discount: number;
  vatAmount: number;
  grandTotal: number;
}

export interface Quotation {
  id: string;
  customer: string;
  event: string;
  date: string;
  validUntil: string;
  amount: string;
  status: QuotationStatus;
  items: QuotationItem[];
}
