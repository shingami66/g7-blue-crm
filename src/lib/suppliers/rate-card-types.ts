export type SupplierRateCardStatus = "active" | "inactive";

export interface SupplierRateCard {
  id: string;
  supplierId: string;
  category: string | null;
  itemName: string;
  unit: string;
  pricingBasis: string | null;
  currency: string;
  baseCost: number;
  validFrom: string;
  validTo: string | null;
  status: SupplierRateCardStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SupplierRateCardRow {
  id: string;
  supplier_id: string;
  category: string | null;
  item_name: string;
  unit: string;
  pricing_basis?: string | null;
  currency: string;
  base_cost: number;
  valid_from: string;
  valid_to: string | null;
  status: SupplierRateCardStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
  is_deleted?: boolean;
}

export type ServiceUsagePeriod = {
  startDate?: string | null;
  endDate?: string | null;
};

export type SupplierRateCardsListResult = {
  rateCards: SupplierRateCard[];
  error?: string;
};

export type SupplierRateCardActionResult = {
  success: boolean;
  error?: "validation_failed" | "not_found" | "overlap" | "write_failed" | "unauthorized" | "forbidden";
  conflict?: { itemName: string; category: string | null; unit: string; pricingBasis?: string | null; currency: string; validFrom: string; validTo: string | null };
};
