import type { Supplier } from "@/types/supplier";
import type { SupplierRow } from "./types";

function normalizeRating(value: SupplierRow["rating"]): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function mapRowToSupplier(row: SupplierRow): Supplier {
  return {
    id: row.id,
    supplierNumber: row.supplier_number,
    name: row.display_name || row.name || row.legal_name || "Unnamed Supplier",
    legalName: row.legal_name,
    displayName: row.display_name,
    supplierType: row.supplier_type,
    category: row.category,
    service: row.category || row.service,
    contactName: row.contact_name || row.contact,
    phone: row.phone,
    whatsappPhone: row.whatsapp_phone,
    email: row.email,
    city: row.city,
    country: row.country,
    coverageArea: row.coverage_area,
    vatRegistrationStatus: row.vat_registration_status,
    isPreferred: row.is_preferred ?? false,
    rating: normalizeRating(row.rating),
    status: row.status,
    recentProject: row.recent_project,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
