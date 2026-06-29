import { z } from "zod";
import {
  supplierAllocationCreateSchema,
  supplierAllocationUpdateSchema,
  supplierAllocationCancelSchema,
} from "./schemas";

export type SupplierAllocationStatus = "draft" | "planned" | "selected" | "cancelled";
export type SupplierAllocationCostSource = "rate_card" | "manual_estimate";

export type SupplierAllocationRateCardSnapshot = {
  rateCardId: string;
  supplierId: string;
  itemName: string;
  unit: string;
  currency: "SAR";
  baseCost: number;
  validFrom: string | null;
  validTo: string | null;
};

export interface SupplierAllocationRow {
  id: string;
  service_id: string;
  supplier_id: string;
  supplier_rate_card_id: string | null;
  approved_quotation_id: string | null;
  status: SupplierAllocationStatus;
  category: string;
  item_name: string;
  unit: string;
  quantity: number | string;
  currency: string;
  estimated_unit_cost: number | string;
  estimated_total_cost: number | string;
  cost_source: SupplierAllocationCostSource;
  rate_card_snapshot: SupplierAllocationRateCardSnapshot | null;
  scope_of_work: string | null;
  internal_notes: string | null;
  created_by: string | null;
  updated_by: string | null;
  cancelled_at: string | null;
  cancelled_by: string | null;
  cancelled_reason: string | null;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
}

export interface SupplierAllocation {
  id: string;
  serviceId: string;
  supplierId: string;
  supplierRateCardId: string | null;
  approvedQuotationId: string | null;
  status: SupplierAllocationStatus;
  category: string;
  itemName: string;
  unit: string;
  quantity: number;
  currency: string;
  // Redacted when user lacks read_cost permission
  estimatedUnitCost: number | null;
  estimatedTotalCost: number | null;
  costSource: SupplierAllocationCostSource;
  rateCardSnapshot: SupplierAllocationRateCardSnapshot | null;
  scopeOfWork: string | null;
  internalNotes: string | null;
  createdBy: string | null;
  updatedBy: string | null;
  cancelledAt: string | null;
  cancelledBy: string | null;
  cancelledReason: string | null;
  createdAt: string;
  updatedAt: string;
  isDeleted: boolean;
}

export type SupplierAllocationCreateInput = z.infer<typeof supplierAllocationCreateSchema>;
export type SupplierAllocationUpdateInput = z.infer<typeof supplierAllocationUpdateSchema>;
export type SupplierAllocationCancelInput = z.infer<typeof supplierAllocationCancelSchema>;

export type SupplierAllocationMapperOptions = {
  canReadCost: boolean;
};
