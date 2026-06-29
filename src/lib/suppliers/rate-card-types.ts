export type SupplierRateCardStatus = "active" | "inactive";

export interface SupplierRateCard {
  id: string;
  supplierId: string;
  category: string | null;
  itemName: string;
  unit: string;
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
  currency: string;
  base_cost: number;
  valid_from: string;
  valid_to: string | null;
  status: SupplierRateCardStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type SupplierRateCardsListResult = {
  rateCards: SupplierRateCard[];
  error?: string;
};
