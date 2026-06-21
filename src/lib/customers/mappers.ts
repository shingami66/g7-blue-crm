import type { Customer } from "@/types/customer";
import type { CustomerRow } from "./types";

/**
 * Maps a Supabase `customers` row to the frontend `Customer` shape.
 *
 * Key differences:
 * - `projects_count` (number)  →  `projects` (number)
 * - `revenue` (numeric)        →  `revenue` (formatted string, e.g. "SAR 1,200.00")
 */
export function mapRowToCustomer(row: CustomerRow): Customer {
  return {
    id: row.id,
    company: row.company,
    contact: row.contact,
    phone: row.phone,
    email: row.email,
    city: row.city,
    status: row.status,
    projects: row.projects_count,
    revenue: formatRevenue(row.revenue),
    customerType: row.customer_type,
    legalName: row.legal_name,
    commercialRegistrationNumber: row.commercial_registration_number,
    vatNumber: row.vat_number,
    nationalAddressBuildingNumber: row.national_address_building_number,
    nationalAddressStreet: row.national_address_street,
    nationalAddressDistrict: row.national_address_district,
    nationalAddressCity: row.national_address_city,
    nationalAddressPostalCode: row.national_address_postal_code,
    nationalAddressAdditionalNumber: row.national_address_additional_number,
    nationalAddressCountry: row.national_address_country,
    billingEmail: row.billing_email,
    financeContactName: row.finance_contact_name,
    financeContactPhone: row.finance_contact_phone,
    paymentTerms: row.payment_terms,
    poRequired: row.po_required,
  };
}

/** Formats a numeric revenue value to a display string (e.g. SAR 1,200.00). */
function formatRevenue(amount: number): string {
  if (amount === 0) return "SAR 0";
  if (amount >= 1_000_000) {
    return `SAR ${(amount / 1_000_000).toFixed(1)}M`;
  }
  if (amount >= 1_000) {
    return `SAR ${(amount / 1_000).toFixed(0)}K`;
  }
  return `SAR ${amount.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}
