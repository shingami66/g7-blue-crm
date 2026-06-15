export type VatMode = "not_registered" | "vat_registered_phase_1" | "phase2_integrated";

export interface CompanySettingsBankDetails {
  bankName: string;
  bankIban: string;
  bankAccountHolder: string;
}

export interface CompanySettingsRecord {
  id: string | null;
  settingKey: "default";
  legalNameEn: string;
  legalNameAr: string;
  crNumber: string;
  tinNumber: string | null;
  vatMode: VatMode;
  vatEffectiveDate: string | null;
  vatNumber: string | null;
  officialEmail: string;
  officialPhone: string;
  nationalAddress: string;
  bank: CompanySettingsBankDetails | null;
  currency: "SAR";
  defaultVatPercent: number;
  defaultTerms: string;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface CompanySettingsPageData {
  settings: CompanySettingsRecord;
  canEdit: boolean;
  canViewBankDetails: boolean;
}

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

export type ZatcaSettings = Record<string, never>;

export interface Settings {
  company: CompanySettings;
  legal: LegalSettings;
  bank: BankDetails;
  finance: FinanceSettings;
}
