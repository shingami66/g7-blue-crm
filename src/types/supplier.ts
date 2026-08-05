export type SupplierStatus = "active" | "on_hold" | "blacklisted" | "inactive";
export type SupplierType = "company" | "individual";
export type SupplierVatRegistrationStatus = "unknown" | "not_registered" | "registered";

export interface SupplierDirectoryItem {
  id: string;
  supplierNumber: string | null;
  name: string;
  supplierType: SupplierType | null;
  phone: string | null;
  category: string | null;
  city: string | null;
  coverageArea: string | null;
  country: string | null;
  isPreferred: boolean;
  rating: number;
  status: SupplierStatus;
  isDeleted: boolean;
}

export interface Supplier extends SupplierDirectoryItem {
  legalName: string | null;
  displayName: string | null;
  contactName: string;
  phone: string;
  whatsappPhone: string | null;
  email: string | null;
  coverageArea: string | null;
  vatRegistrationStatus: SupplierVatRegistrationStatus | null;
  vatNumber: string | null;
  crNumber: string | null;
  paymentTerms: string | null;
  notes: string | null;
  blacklistedReason: string | null;
  blacklistedAt: string | null;
  canViewSensitive: boolean;
  canReadBank: boolean;
  bankName: string | null;
  bankAccountName: string | null;
  iban: string | null;
}
