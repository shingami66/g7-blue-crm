import type {
  CompanySettingsBankDetails,
  CompanySettingsRecord,
} from "@/types/settings";
import type { CompanySettingsRow } from "./types";

export const EMPTY_COMPANY_SETTINGS: CompanySettingsRecord = {
  id: null,
  settingKey: "default",
  legalNameEn: "",
  legalNameAr: "",
  crNumber: "",
  tinNumber: null,
  vatMode: "not_registered",
  vatEffectiveDate: null,
  vatNumber: null,
  officialEmail: "",
  officialPhone: "",
  nationalAddress: "",
  bank: null,
  currency: "SAR",
  defaultVatPercent: 0,
  defaultTerms: "",
  createdAt: null,
  updatedAt: null,
};

function mapBankDetails(row: CompanySettingsRow): CompanySettingsBankDetails {
  return {
    bankName: row.bank_name ?? "",
    bankIban: row.bank_iban ?? "",
    bankAccountHolder: row.bank_account_holder ?? "",
  };
}

export function mapRowToCompanySettings(
  row: CompanySettingsRow,
  canViewBankDetails: boolean
): CompanySettingsRecord {
  return {
    id: row.id ?? null,
    settingKey: row.setting_key ?? "default",
    legalNameEn: row.legal_name_en ?? "",
    legalNameAr: row.legal_name_ar ?? "",
    crNumber: row.cr_number ?? "",
    tinNumber: row.tin_number ?? null,
    vatMode: row.vat_mode ?? "not_registered",
    vatEffectiveDate: row.vat_effective_date ?? null,
    vatNumber: row.vat_number ?? null,
    officialEmail: row.official_email ?? "",
    officialPhone: row.official_phone ?? "",
    nationalAddress: row.national_address ?? "",
    bank: canViewBankDetails ? mapBankDetails(row) : null,
    currency: row.currency ?? "SAR",
    defaultVatPercent: Number(row.default_vat_percent ?? 0),
    defaultTerms: row.default_terms ?? "",
    createdAt: row.created_at ?? null,
    updatedAt: row.updated_at ?? null,
  };
}
