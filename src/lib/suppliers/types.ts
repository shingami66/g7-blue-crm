import type {
  SupplierDirectoryItem,
  SupplierStatus,
  SupplierType,
  SupplierVatRegistrationStatus,
} from "@/types/supplier";
import { sanitizeSearchTerm } from "../search/sanitize.ts";
import {
  normalizeListPage,
  normalizeListPageSize,
  type ListPageSize,
} from "../pagination.ts";

export type {
  Supplier,
  SupplierDirectoryItem,
  SupplierStatus,
  SupplierType,
  SupplierVatRegistrationStatus,
} from "@/types/supplier";

export interface SupplierDirectoryRow {
  id: string;
  supplier_number: string | null;
  supplier_type: SupplierType | null;
  phone: string | null;
  category: string | null;
  display_name: string | null;
  name: string;
  city: string | null;
  coverage_area?: string | null;
  country: string | null;
  rating: number | string | null;
  status: SupplierStatus;
  is_preferred: boolean | null;
  is_deleted: boolean | null;
}

export interface SupplierDetailRow extends SupplierDirectoryRow {
  legal_name?: string | null;
  contact_name?: string | null;
  contact?: string | null;
  phone: string | null;
  whatsapp_phone?: string | null;
  email?: string | null;
  coverage_area?: string | null;
  vat_registration_status?: SupplierVatRegistrationStatus | null;
  vat_number?: string | null;
  cr_number?: string | null;
  payment_terms?: string | null;
  notes?: string | null;
  blacklisted_reason?: string | null;
  blacklisted_at?: string | null;
  bank_name?: string | null;
  bank_account_name?: string | null;
  iban?: string | null;
}

export type SupplierRow = SupplierDetailRow;

export const SUPPLIER_PAGE_SIZE = 10;

export interface SupplierListQuery {
  includeDeleted?: boolean;
  page?: number;
  pageSize?: ListPageSize;
  search?: string;
  status?: SupplierStatus;
  category?: string;
}

export interface SupplierListPagination {
  page: number;
  pageSize: ListPageSize;
  total: number;
  totalPages: number;
}

export interface SuppliersListResult {
  suppliers: SupplierDirectoryItem[];
  pagination: SupplierListPagination;
  error?: "suppliers_load_failed";
}

export interface SupplierOption {
  id: string;
  name: string;
}

export function normalizeSupplierListPage(value: unknown): number {
  return normalizeListPage(value);
}

export function normalizeSupplierListPageSize(value: unknown): ListPageSize {
  return normalizeListPageSize(value);
}

export function normalizeSupplierListSearch(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;

  const search = sanitizeSearchTerm(value)
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .slice(0, 100);
  return search || undefined;
}
