import type {
  Supplier,
  SupplierStatus,
  SupplierType,
  SupplierVatRegistrationStatus,
} from "@/types/supplier";

export type {
  Supplier,
  SupplierStatus,
  SupplierType,
  SupplierVatRegistrationStatus,
} from "@/types/supplier";

export interface SupplierRow {
  id: string;
  supplier_number: string | null;
  supplier_type: SupplierType | null;
  category: string | null;
  legal_name: string | null;
  display_name: string | null;
  contact_name: string | null;
  whatsapp_phone: string | null;
  email: string | null;
  city: string | null;
  country: string | null;
  coverage_area: string | null;
  name: string;
  service: string;
  contact: string;
  phone: string;
  rating: number | string | null;
  status: SupplierStatus;
  recent_project: string | null;
  vat_registration_status: SupplierVatRegistrationStatus | null;
  vat_number: string | null;
  cr_number: string | null;
  is_preferred: boolean | null;
  created_at: string;
  updated_at: string;
  notes: string | null;
  blacklisted_reason: string | null;
  blacklisted_by: string | null;
  blacklisted_at: string | null;
}

export interface SuppliersListResult {
  suppliers: Supplier[];
  error?: "suppliers_load_failed";
}
