import { z } from "zod";
import {
  createQuotationSchema,
  updateQuotationSchema,
  quotationItemInputSchema,
} from "./schemas";

export type QuotationStatus = "draft" | "sent" | "approved" | "rejected" | "expired";

/** Raw row shape returned by Supabase for the `quotations` table. */
export interface QuotationRow {
  id: string;
  quotation_number: string;
  customer_id: string;
  event: string;
  date: string;
  valid_until: string | null;
  subtotal: number;
  discount: number;
  vat_rate: number;
  vat_amount: number;
  grand_total: number;
  status: QuotationStatus;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
  deleted_at: string | null;
  created_by: string;
  updated_by: string;
}

/** Raw row shape returned by Supabase for the `quotation_items` table. */
export interface QuotationItemRow {
  id: string;
  quotation_id: string;
  description: string;
  details: string | null;
  category: string;
  qty: number;
  unit_price: number;
  vat: number;
  total: number;
  created_at: string;
  updated_at: string;
}

export interface QuotationListItem {
  id: string;
  quotationNumber: string;
  customerId: string;
  customer?: { company: string; contact: string };
  event: string;
  date: string;
  validUntil: string | null;
  grandTotal: number;
  status: QuotationStatus;
  createdAt: string;
  updatedAt: string;
}

export interface QuotationItem {
  id: string;
  quotationId: string;
  description: string;
  details: string | null;
  category: string;
  qty: number;
  unitPrice: number;
  vat: number;
  total: number;
}

export interface QuotationDetail extends QuotationListItem {
  subtotal: number;
  discount: number;
  vatRate: number;
  vatAmount: number;
  items: QuotationItem[];
}

export interface QuotationRpcResult {
  quotation_id: string;
  quotation_number: string;
  subtotal: number;
  discount: number;
  vat_amount: number;
  grand_total: number;
}

export type CreateQuotationItemInput = z.infer<typeof quotationItemInputSchema>;
export type UpdateQuotationItemInput = z.infer<typeof quotationItemInputSchema>;
export type CreateQuotationInput = z.infer<typeof createQuotationSchema>;
export type UpdateQuotationInput = z.infer<typeof updateQuotationSchema>;
