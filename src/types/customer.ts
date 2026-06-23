export type CustomerStatus = "active" | "inactive" | "lead";
export type CustomerType = "individual" | "company";

export interface Customer {
  id: string;
  customerNumber: string;
  company: string;
  contact: string;
  phone: string;
  email: string;
  city: string;
  status: CustomerStatus;
  servicesCount: number;
  quotationsCount: number;
  approvedQuotationsCount: number;
  draftQuotationsCount: number;
  totalQuotedAmount: number;
  customerType?: CustomerType | null;
  legalName?: string | null;
  commercialRegistrationNumber?: string | null;
  vatNumber?: string | null;
  nationalAddressBuildingNumber?: string | null;
  nationalAddressStreet?: string | null;
  nationalAddressDistrict?: string | null;
  nationalAddressCity?: string | null;
  nationalAddressPostalCode?: string | null;
  nationalAddressAdditionalNumber?: string | null;
  nationalAddressCountry?: string | null;
  billingEmail?: string | null;
  financeContactName?: string | null;
  financeContactPhone?: string | null;
  paymentTerms?: string | null;
  poRequired?: boolean;
}
