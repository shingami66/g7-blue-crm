import type { z } from "zod";
import type { Service, ServiceStatus } from "@/types/service";
import type { createServiceSchema, updateServiceSchema } from "./schemas";
import { sanitizeSearchTerm } from "@/lib/search/sanitize";
import {
  normalizeListPage,
  normalizeListPageSize,
  type ListPageSize,
} from "../pagination.ts";

export { SERVICE_STATUSES } from "@/types/service";
export type { ServiceCustomerSummary } from "@/types/service";
export type { ServiceStatus } from "@/types/service";

export const SERVICE_LIST_PAGE_SIZE = 10;
export type ServiceSearchMode = "serviceNumber" | "serviceName" | "customer";

export interface ServiceListQuery {
  page?: number;
  pageSize?: ListPageSize;
  searchMode?: ServiceSearchMode;
  search?: string;
  status?: ServiceStatus;
}

export interface ServiceListPagination {
  page: number;
  pageSize: ListPageSize;
  total: number;
  totalPages: number;
}

export interface ServicesListResult {
  services: Service[];
  pagination: ServiceListPagination;
  error?: "services_load_failed";
}

export function normalizeServiceListPage(value: unknown): number {
  return normalizeListPage(value);
}

export function normalizeServiceListPageSize(value: unknown): ListPageSize {
  return normalizeListPageSize(value);
}

export function normalizeServiceSearchMode(value: unknown): ServiceSearchMode | undefined {
  return value === "serviceNumber" || value === "serviceName" || value === "customer"
    ? value
    : undefined;
}

export function normalizeServiceListSearch(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const search = sanitizeSearchTerm(value);
  return search || undefined;
}

export interface ServiceRow {
  id: string;
  service_number: string;
  customer_id: string;
  service_title: string;
  event_name: string | null;
  event_type: string | null;
  event_start_date: string | null;
  event_end_date: string | null;
  event_location: string | null;
  description: string | null;
  estimated_budget: number | string | null;
  status: ServiceStatus;
  sales_owner_id: string | null;
  cancellation_reason: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

export interface ServiceRowWithCustomer extends ServiceRow {
  customers?: {
    company: string;
    contact: string;
    customer_number?: string;
  } | null;
}

export interface CreatedServiceResult {
  id: string;
  serviceNumber: string;
}

export type CreateServiceInput = z.infer<typeof createServiceSchema>;
export type UpdateServiceInput = z.infer<typeof updateServiceSchema>;
