import { z } from "zod";
import {
  createSupplierBookingSchema,
  cancelSupplierBookingSchema,
} from "./schemas";

export type SupplierBookingStatus = "draft" | "cancelled";

export interface SupplierBookingRow {
  id: string;
  service_id: string;
  supplier_id: string;
  source_allocation_id: string;
  booking_number: string;
  status: SupplierBookingStatus;
  category: string;
  item_name: string;
  unit: string;
  quantity: number | string;
  currency: string;
  estimated_unit_cost: number | string;
  estimated_total_cost: number | string;
  scope_of_work: string | null;
  internal_notes: string | null;
  allocation_snapshot: Record<string, unknown>;
  cancelled_at: string | null;
  cancelled_by: string | null;
  cancelled_reason: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
  supplier?: {
    name: string;
    display_name: string | null;
    legal_name: string | null;
    contact: string | null;
  } | null;
}

export interface SupplierBooking {
  id: string;
  serviceId: string;
  supplierId: string;
  sourceAllocationId: string;
  bookingNumber: string;
  status: SupplierBookingStatus;
  category: string;
  itemName: string;
  unit: string;
  quantity: number;
  currency: string;
  // Redacted when user lacks read_cost permission
  estimatedUnitCost: number | null;
  estimatedTotalCost: number | null;
  scopeOfWork: string | null;
  // Redacted when user lacks internal details permission
  internalNotes: string | null;
  allocationSnapshot: Record<string, unknown> | null;
  cancelledAt: string | null;
  cancelledBy: string | null;
  cancelledReason: string | null;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
  isDeleted: boolean;
  supplierName?: string | null;
}

export type SupplierBookingCreateInput = z.infer<typeof createSupplierBookingSchema>;
export type SupplierBookingCancelInput = z.infer<typeof cancelSupplierBookingSchema>;

export type SupplierBookingMapperOptions = {
  canReadCost?: boolean;
  canReadInternalDetails?: boolean;
};
