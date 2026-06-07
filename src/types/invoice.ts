import { AuditFields } from "./common";

export type InvoiceStatus = "draft" | "sent" | "paid" | "partial" | "overdue" | "cancelled" | "unpaid";

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
  customerId: string;
  customer: string;
  quotationId?: string;
  relatedQuote?: string; // Kept for UI compatibility, although quotationId is preferred
  date: string;
  dueDate: string;
  amount: string;
  status: InvoiceStatus;
  type: string;
  items: InvoiceItem[];
}
