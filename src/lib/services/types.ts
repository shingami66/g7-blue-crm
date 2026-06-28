import type { z } from "zod";
import type { ServiceStatus } from "@/types/service";
import type { createServiceSchema, updateServiceSchema } from "./schemas";

export { SERVICE_STATUSES } from "@/types/service";
export type { Service, ServiceCustomerSummary, ServiceStatus } from "@/types/service";

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
