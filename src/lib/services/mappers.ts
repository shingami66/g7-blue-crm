import type { Service } from "@/types/service";
import type { ServiceRowWithCustomer } from "./types";

export function mapRowToService(row: ServiceRowWithCustomer): Service {
  return {
    id: row.id,
    serviceNumber: row.service_number,
    customerId: row.customer_id,
    customer: row.customers
      ? {
          company: row.customers.company,
          contact: row.customers.contact,
          customerNumber: row.customers.customer_number,
        }
      : undefined,
    serviceTitle: row.service_title,
    eventName: row.event_name,
    eventType: row.event_type,
    eventStartDate: row.event_start_date,
    eventEndDate: row.event_end_date,
    eventLocation: row.event_location,
    description: row.description,
    estimatedBudget:
      row.estimated_budget === null ? null : Number(row.estimated_budget),
    status: row.status,
    salesOwnerId: row.sales_owner_id,
    cancellationReason: row.cancellation_reason,
    deletedAt: row.deleted_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    createdBy: row.created_by,
    updatedBy: row.updated_by,
  };
}
