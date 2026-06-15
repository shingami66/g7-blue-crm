import type { VatMode } from "@/types/settings";

export interface CompanySettingsRow {
  id: string;
  setting_key: "default";
  legal_name_en: string;
  legal_name_ar: string;
  cr_number: string;
  tin_number: string | null;
  vat_mode: VatMode;
  vat_effective_date: string | null;
  vat_number: string | null;
  official_email: string;
  official_phone: string;
  national_address: string;
  bank_name: string;
  bank_iban: string;
  bank_account_holder: string;
  currency: "SAR";
  default_vat_percent: number;
  default_terms: string;
  created_at: string | null;
  updated_at: string | null;
  created_by: string | null;
  updated_by: string | null;
}
