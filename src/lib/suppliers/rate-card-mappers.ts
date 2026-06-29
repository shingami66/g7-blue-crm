import type { SupplierRateCard, SupplierRateCardRow } from "./rate-card-types";

export function mapRowToSupplierRateCard(row: SupplierRateCardRow): SupplierRateCard {
  return {
    id: row.id,
    supplierId: row.supplier_id,
    category: row.category,
    itemName: row.item_name,
    unit: row.unit,
    currency: row.currency,
    baseCost: Number(row.base_cost),
    validFrom: row.valid_from,
    validTo: row.valid_to,
    status: row.status,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
