export type Currency = "SAR";

export const VAT_RATE = 0.15 as const;

export interface Money {
  amount: number;
  currency: Currency;
}

export interface Address {
  city: string;
  country: string;
  district?: string;
  street?: string;
  postalCode?: string;
  buildingNumber?: string;
  additionalNumber?: string;
}

export interface AuditFields {
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
  isDeleted?: boolean;
  deletedAt?: string;
}
