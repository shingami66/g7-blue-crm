import { AuditFields } from "./common";

export interface CompanySettings {
  name: string;
  email: string;
  phone: string;
  address: string;
}

export interface LegalSettings {
  cr: string;
  vat: string;
}

export interface BankDetails {
  name: string;
  iban: string;
  accountName: string;
}

export interface FinanceSettings {
  currency: string;
  vatPercent: number;
  terms: string;
}

export interface ZatcaSettings {
  // Placeholder for ZATCA settings if needed
}

export interface Settings {
  company: CompanySettings;
  legal: LegalSettings;
  bank: BankDetails;
  finance: FinanceSettings;
}
