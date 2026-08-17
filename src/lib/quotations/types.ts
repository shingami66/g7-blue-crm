import { z } from "zod";
import { sanitizeSearchTerm } from "@/lib/search/sanitize";
import {
  normalizeListPage,
  normalizeListPageSize,
  type ListPageSize,
} from "../pagination.ts";
import {
  createQuotationSchema,
  updateQuotationSchema,
  quotationItemInputSchema,
} from "./schemas";
import type { BusinessYear } from "@/lib/business-year";

export type QuotationStatus = "draft" | "sent" | "approved" | "rejected" | "expired";

export const QUOTATION_LIST_PAGE_SIZE = 10;
export type QuotationSearchMode = "quotationNumber" | "customer" | "service";

export interface QuotationListQuery {
  year?: BusinessYear;
  page?: number;
  pageSize?: ListPageSize;
  searchMode?: QuotationSearchMode;
  search?: string;
  status?: QuotationStatus;
  month?: string;
}

export interface QuotationListPagination {
  page: number;
  pageSize: ListPageSize;
  total: number;
  totalPages: number;
}

export interface QuotationsListResult {
  quotations: QuotationListItem[];
  pagination: QuotationListPagination;
  error?: "quotations_load_failed";
}

export function normalizeQuotationListPage(value: unknown): number {
  return normalizeListPage(value);
}

export function normalizeQuotationListPageSize(value: unknown): ListPageSize {
  return normalizeListPageSize(value);
}

export function normalizeQuotationSearchMode(value: unknown): QuotationSearchMode | undefined {
  return value === "quotationNumber" || value === "customer" || value === "service"
    ? value
    : undefined;
}

export function normalizeQuotationListSearch(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const search = sanitizeSearchTerm(value);
  return search || undefined;
}

export function normalizeQuotationMonth(value: unknown): string | undefined {
  return typeof value === "string" && /^\d{4}-\d{2}$/.test(value) ? value : undefined;
}

/** Raw row shape returned by Supabase for the `quotations` table. */
export interface QuotationRow {
  id: string;
  quotation_number: string;
  service_id: string;
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
  mutation_key?: string | null;
  mutation_payload?: unknown | null;
  created_by: string;
  updated_by: string;
  snapshot_seller: QuotationSnapshotSeller | null;
  snapshot_buyer: QuotationSnapshotBuyer | null;
}

export interface QuotationServiceSummary {
  serviceNumber: string;
  serviceTitle: string;
  status: string;
  eventName: string | null;
}

export interface QuotationCustomerSummary {
  company: string;
  contact: string;
}

export interface QuotationServiceRowSummary {
  service_number: string;
  service_title: string;
  status: string;
  event_name: string | null;
}

export interface QuotationRowWithRelations extends QuotationRow {
  customers?: QuotationCustomerSummary | null;
  services?: QuotationServiceRowSummary | null;
}

export interface QuotationDetailRow extends QuotationRowWithRelations {
  quotation_items?: QuotationItemRow[] | null;
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
  serviceId: string;
  service?: QuotationServiceSummary;
  customerId: string;
  customer?: { company: string; contact: string };
  event: string;
  date: string;
  validUntil: string | null;
  grandTotal: number;
  status: QuotationStatus;
  createdAt: string;
  updatedAt: string;
  snapshotSeller?: QuotationSnapshotSeller | null;
  snapshotBuyer?: QuotationSnapshotBuyer | null;
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
  is_replayed?: boolean;
  isReplayed?: boolean;
}

export type CreateQuotationItemInput = z.infer<typeof quotationItemInputSchema>;
export type UpdateQuotationItemInput = z.infer<typeof quotationItemInputSchema>;
export type CreateQuotationInput = z.infer<typeof createQuotationSchema>;
export type UpdateQuotationInput = z.infer<typeof updateQuotationSchema>;

export interface QuotationSnapshotSeller {
  snapshotVersion: number;
  snapshotSource: string;
  snapshotCapturedAt: string;
  snapshotNote: string | null;
  legalNameEn: string;
  legalNameAr: string | null;
  brandName: string | null;
  tin: string | null;
  entityUnifiedNumber: string | null;
  crNumber: string | null;
  vatMode: "not_registered" | "vat_registered_phase_1" | "phase2_integrated";
  vatNumber: string | null;
  vatEffectiveDate: string | null;
  vatRate: number;
  officialEmail: string | null;
  officialPhone: string | null;
  website: string | null;
  address: {
    shortAddress: string | null;
    buildingNo: string | null;
    street: string | null;
    district: string | null;
    secondaryNo: string | null;
    postalCode: string | null;
    city: string | null;
    country: string | null;
    display: string | null;
  };
  bank: {
    bankName: string | null;
    accountName: string | null;
    accountNo: string | null;
    iban: string | null;
  };
  logoPath: string | null;
  currency: string | null;
  terms: string | null;
}

export interface QuotationSnapshotBuyer {
  snapshotVersion: number;
  snapshotSource: string;
  snapshotCapturedAt: string;
  snapshotNote: string | null;
  customerId: string;
  customerType: string | null;
  name: string;
  legalName: string | null;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  crNumber: string | null;
  vatNumber: string | null;
  billingEmail: string | null;
  financeContact: string | null;
  paymentTerms: string | null;
  poRequired: boolean | null;
  address: {
    shortAddress: string | null;
    buildingNo: string | null;
    street: string | null;
    district: string | null;
    secondaryNo: string | null;
    postalCode: string | null;
    city: string | null;
    country: string | null;
    display: string | null;
  };
}
