import type { Customer } from "@/types/customer";
import type { CustomerRow } from "./types";

/**
 * Maps a Supabase `customers` row to the frontend `Customer` shape.
 *
 * Key differences:
 * - `projects_count` (number)  →  `projects` (number)
 * - `revenue` (numeric)        →  `revenue` (formatted string, e.g. "SAR 1,200.00")
 */
export interface CustomerMetricsRow {
  services_count: number;
  quotations_count: number;
  approved_quotations_count: number;
  draft_quotations_count: number;
  total_quoted_amount: number;
}

export function mapRowToCustomer(row: CustomerRow, metrics?: CustomerMetricsRow): Customer {
  return {
    id: row.id,
    customerNumber: row.customer_number,
    company: row.company,
    contact: row.contact,
    phone: row.phone,
    email: row.email,
    city: row.city,
    status: row.status,
    servicesCount: metrics?.services_count ?? 0,
    quotationsCount: metrics?.quotations_count ?? 0,
    approvedQuotationsCount: metrics?.approved_quotations_count ?? 0,
    draftQuotationsCount: metrics?.draft_quotations_count ?? 0,
    totalQuotedAmount: metrics?.total_quoted_amount ?? 0,
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
