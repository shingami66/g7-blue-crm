import type { InvoiceStatus, InvoiceType, JsonValue } from "@/types/invoice";
import { sanitizeSearchTerm } from "@/lib/search/sanitize";
import type { BusinessYear } from "@/lib/business-year";
import {
  normalizeListPage,
  normalizeListPageSize,
  type ListPageSize,
} from "../pagination.ts";

export const INVOICE_LIST_PAGE_SIZE = 10;
export type InvoiceSearchMode = "invoiceNumber" | "customer";

export interface InvoiceListQuery {
  year?: BusinessYear;
  page?: number;
  pageSize?: ListPageSize;
  searchMode?: InvoiceSearchMode;
  search?: string;
  status?: string;
}

export interface InvoiceListPagination {
  page: number;
  pageSize: ListPageSize;
  total: number;
  totalPages: number;
}

/** Fields required by the authenticated invoice list UI only. */
export interface InvoiceListItem {
  id: string;
  invoice_number: string;
  invoice_type: InvoiceType;
  document_label: string;
  customer: string;
  issued_at: string | null;
  created_at: string;
  grand_total: number;
  status: InvoiceStatus;
}

export interface InvoicesListResult {
  invoices: InvoiceListItem[];
  pagination: InvoiceListPagination;
  error?: "invoices_load_failed";
}

export function normalizeInvoiceListPage(value: unknown): number {
  return normalizeListPage(value);
}

export function normalizeInvoiceListPageSize(value: unknown): ListPageSize {
  return normalizeListPageSize(value);
}

export function normalizeInvoiceSearchMode(value: unknown): InvoiceSearchMode | undefined {
  return value === "invoiceNumber" || value === "customer" ? value : undefined;
}

export function normalizeInvoiceListSearch(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const search = sanitizeSearchTerm(value);
  return search || undefined;
}

export interface CreateInvoiceInput {
  mutationKey: string;
  quotationId: string;
  serviceId: string;
  invoiceType: InvoiceType;
  requestedAmount?: number;
}

export interface CreateInvoiceResult {
  success: boolean;
  invoiceId?: string;
  invoiceNumber?: string;
  isReplayed?: boolean;
  error?: string;
}

export interface IssueInvoiceResult {
  success: boolean;
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
  approved_billing_scope_id: string | null;
  customer_id: string;
  invoice_type: string;
  service_id: string;
  date: string;
  due_date: string;
  status: string;
  subtotal: number;
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
  mutation_key?: string | null;
  mutation_payload?: JsonValue | null;
}

export type BillingInvoiceSummary = {
  id: string;
  invoiceNumber: string;
  invoiceType: "deposit" | "final";
  status: string;
  amount: number | null;
};

/** Provenance identity for an approved quotation — totals are the real QT amount. */
export type BillingApprovedQuotationSummary = {
  id: string;
  quotationNumber: string;
  status: "approved";
  grandTotal: number | null;
};

/**
 * Canonical Service Detail billing authority mode.
 * Historical ABS (any ABS row without an active approved scope) must never revive QT fallback.
 */
export type ServiceBillingAuthorityMode =
  | "active_abs"
  | "historical_abs_only"
  | "legacy_quotation"
  | "no_authority"
  | "unavailable";

export type ServiceBillingState = {
  serviceId: string;
  /** Authoritative scenario for Billing panel + Invoice action eligibility. */
  authorityMode: ServiceBillingAuthorityMode;
  /**
   * Source approved quotation identity and **actual quotation total**.
   * Never overwrite grandTotal with an ABS ceiling.
   */
  approvedQuotation: BillingApprovedQuotationSummary | null;
  /**
   * Billable ceiling when authority is active ABS or legacy QT.
   * Null when historical-only, no authority, or unavailable.
   */
  billingCeiling: number | null;
  /** Active ABS id when authorityMode is active_abs. */
  activeBillingScopeId: string | null;
  depositInvoice: BillingInvoiceSummary | null;
  finalInvoice: BillingInvoiceSummary | null;
  /** Service-lifetime applicable Invoice exposure; null means unavailable. */
  activePriorInvoiceTotal: number | null;
  /**
   * Remaining billable under active authority: max(0, ceiling - exposure).
   * Null when remaining is not authoritative (historical-only / unavailable / no authority).
   */
  remainingUninvoicedAmount: number | null;
  canCreateDepositInvoice: boolean;
  canCreateFinalInvoice: boolean;
  disabledReasons: string[];
};

/**
 * Service-scoped operational billing aggregates. This deliberately excludes
 * Invoice, quotation, and Approved Billing Scope identities and controls.
 */
export type ServiceBillingSummary = Pick<
  ServiceBillingState,
  | "billingCeiling"
  | "activePriorInvoiceTotal"
  | "remainingUninvoicedAmount"
>;
