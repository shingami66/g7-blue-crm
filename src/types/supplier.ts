export type SupplierStatus = "active" | "on_hold" | "blacklisted" | "inactive";
export type SupplierType = "company" | "individual";
export type SupplierVatRegistrationStatus = "not_registered" | "registered" | "unknown";

export interface Supplier {
  id: string;
  supplierNumber: string | null;
  name: string;
  legalName: string | null;
  displayName: string | null;
  supplierType: SupplierType | null;
  category: string | null;
  service: string;
  contactName: string;
  phone: string;
  whatsappPhone: string | null;
  email: string | null;
  city: string | null;
  country: string | null;
  coverageArea: string | null;
  vatRegistrationStatus: SupplierVatRegistrationStatus | null;
  isPreferred: boolean;
  rating: number;
  status: SupplierStatus;
  recentProject: string | null;
  createdAt: string;
  updatedAt: string;
}
