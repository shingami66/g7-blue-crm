/**
 * Customer types for the data layer.
 *
 * - `CustomerRow` mirrors the Supabase `customers` table exactly (snake_case).
 * - `Customer` is the existing frontend shape re-exported from @/types.
 */

export type { Customer, CustomerStatus, CustomerType } from "@/types/customer";

/** Raw row shape returned by Supabase for the `customers` table. */
export interface CustomerRow {
  id: string;
  company: string;
  contact: string;
  phone: string;
  email: string;
  city: string;
  status: "active" | "inactive" | "lead";
  projects_count: number;
  revenue: number;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
  deleted_at: string | null;
  created_by: string | null;
  updated_by: string | null;
  customer_type: "individual" | "company" | null;
  legal_name: string | null;
  commercial_registration_number: string | null;
  vat_number: string | null;
  national_address_building_number: string | null;
  national_address_street: string | null;
  national_address_district: string | null;
  national_address_city: string | null;
  national_address_postal_code: string | null;
  national_address_additional_number: string | null;
  national_address_country: string | null;
  billing_email: string | null;
  finance_contact_name: string | null;
  finance_contact_phone: string | null;
  payment_terms: string | null;
  po_required: boolean;
}
