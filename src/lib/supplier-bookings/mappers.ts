import type {
  SupplierBookingRow,
  SupplierBooking,
  SupplierBookingMapperOptions,
} from "./types";

/**
 * Supplier booking costs and internal details are internal only.
 * Use canReadCost=false and canReadInternalDetails=false unless permissions are checked.
 * Customer-facing routes/PDFs must not import booking mappers.
 */
export function mapSupplierBookingRow(
  row: SupplierBookingRow,
  options?: SupplierBookingMapperOptions
): SupplierBooking {
  const canReadCost = options?.canReadCost ?? false;
  const canReadInternalDetails = options?.canReadInternalDetails ?? false;

  let computedSupplierName: string | null = null;
  if (row.supplier) {
    computedSupplierName =
      row.supplier.display_name ||
      row.supplier.name ||
      row.supplier.legal_name ||
      row.supplier.contact ||
      row.supplier_id;
  }

  return {
    id: row.id,
    serviceId: row.service_id,
    supplierId: row.supplier_id,
    sourceAllocationId: row.source_allocation_id,
    bookingNumber: row.booking_number,
    status: row.status,
    category: row.category,
    itemName: row.item_name,
    unit: row.unit,
    quantity: Number(row.quantity),
    currency: row.currency,
    // Redact costs if user lacks permission
    estimatedUnitCost: canReadCost ? Number(row.estimated_unit_cost) : null,
    estimatedTotalCost: canReadCost ? Number(row.estimated_total_cost) : null,
    scopeOfWork: row.scope_of_work,
    // Redact internal details if user lacks permission
    internalNotes: canReadInternalDetails ? row.internal_notes : null,
    allocationSnapshot: canReadInternalDetails ? (row.allocation_snapshot as Record<string, unknown>) : null,
    cancelledAt: row.cancelled_at,
    cancelledBy: row.cancelled_by,
    cancelledReason: row.cancelled_reason,
    createdBy: row.created_by,
    updatedBy: row.updated_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    isDeleted: row.is_deleted,
    supplierName: computedSupplierName,
  };
}

export function mapSupplierBookingRows(
  rows: SupplierBookingRow[],
  options?: SupplierBookingMapperOptions
): SupplierBooking[] {
  return rows.map((row) => mapSupplierBookingRow(row, options));
}
