export interface RecordPaymentInput {
  invoiceId: string;
  requestId: string;
  amount: number;
  date: string;
  method: "bank_transfer" | "cash" | "cheque" | "online";
  reference?: string;
}

export interface RecordPaymentResult {
  success: boolean;
  paymentId?: string;
  paymentNumber?: string;
  newAmountPaid?: number;
  newBalanceDue?: number;
  newStatus?: string;
  error?: string;
}

export type PaymentMethod = "bank_transfer" | "cash" | "cheque" | "online";

export type PaymentStatus = "pending" | "confirmed" | "failed" | "refunded";

export interface PaymentsListQuery {
  year?: number;
  page?: number;
  pageSize?: ListPageSize;
  search?: string;
  status?: PaymentStatus;
}

export interface PaymentsListPagination {
  page: number;
  pageSize: ListPageSize;
  total: number;
  totalPages: number;
}

export function normalizePaymentsListPage(value: unknown): number {
  return normalizeListPage(value);
}

export function normalizePaymentsListPageSize(value: unknown): ListPageSize {
  return normalizeListPageSize(value);
}

export function normalizePaymentsListSearch(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const search = sanitizeSearchTerm(value);
  return search || undefined;
}

export function normalizePaymentStatus(value: unknown): PaymentStatus | undefined {
  return value === "pending" || value === "confirmed" || value === "failed" || value === "refunded"
    ? value
    : undefined;
}

export interface PaymentListRow {
  id: string;
  payment_number: string;
  invoice_id: string;
  customer_id: string;
  date: string;
  amount: number | string;
  method: PaymentMethod;
  reference: string | null;
  status: PaymentStatus;
  created_at: string;
  created_by: string | null;
  invoices?: {
    invoice_number?: string | null;
    invoice_type?: string | null;
    service_id?: string | null;
    services?: {
      service_number?: string | null;
      service_title?: string | null;
    } | null;
  } | null;
  customers?: {
    company?: string | null;
    contact?: string | null;
  } | null;
}

export interface PaymentListItem {
  id: string;
  paymentNumber: string;
  invoiceId: string;
  invoiceNumber: string | null;
  customerName: string;
  serviceLabel: string | null;
  date: string;
  amount: number;
  method: PaymentMethod;
  reference: string | null;
  status: PaymentStatus;
  createdAt: string;
  recordedBy: string | null;
}

export interface PaymentsListResult {
  payments: PaymentListItem[];
  pagination: PaymentsListPagination;
  error?: "payments_load_failed";
}
import { sanitizeSearchTerm } from "@/lib/search/sanitize";
import {
  normalizeListPage,
  normalizeListPageSize,
  type ListPageSize,
} from "@/lib/pagination";
