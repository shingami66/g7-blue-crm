import type { Locale } from "../locales";
import type { VatMode } from "../../../types/settings";

export interface SettingsDictionary {
  locale: Locale;
  page: {
    title: string;
    subtitle: string;
  };
  states: {
    accessDenied: string;
    accessDeniedMessage: string;
    unavailable: string;
    unavailableMessage: string;
    readOnly: string;
  };
  actions: {
    edit: string;
    cancel: string;
    save: string;
    saving: string;
  };
  sections: {
    companyProfile: string;
    legalVat: string;
    bankDetails: string;
    financeDefaults: string;
  };
  labels: {
    legalNameEn: string;
    legalNameAr: string;
    officialEmail: string;
    officialPhone: string;
    nationalAddress: string;
    crNumber: string;
    tinNumber: string;
    vatMode: string;
    defaultVatPercent: string;
    vatNumber: string;
    vatEffectiveDate: string;
    bankName: string;
    iban: string;
    accountHolder: string;
    currency: string;
    defaultTerms: string;
  };
  help: {
    historicalSnapshot: string;
    bankRestricted: string;
  };
  vatModes: {
    not_registered: string;
    vat_registered_phase_1: string;
  };
  actionResults: {
    saved: string;
    updateFailed: string;
    unauthorized: string;
    forbidden: string;
    unexpected: string;
    rateLimited: string;
    validationFailed: string;
  };
  /** Maps exact server/action error strings to localized display copy. */
  actionErrorMap: Record<string, string>;
}

const settingsDictionaryEn: SettingsDictionary = {
  locale: "en",
  page: {
    title: "Company Settings",
    subtitle:
      "Manage the company profile, VAT defaults, and banking details for future documents.",
  },
  states: {
    accessDenied: "Access Denied",
    accessDeniedMessage: "You do not have permission to view Company Settings.",
    unavailable: "Settings Unavailable",
    unavailableMessage: "Settings could not be loaded. Please contact your administrator.",
    readOnly: "Read only",
  },
  actions: {
    edit: "Edit Settings",
    cancel: "Cancel",
    save: "Save Changes",
    saving: "Saving...",
  },
  sections: {
    companyProfile: "Company Profile",
    legalVat: "Legal & VAT",
    bankDetails: "Bank Details",
    financeDefaults: "Finance Defaults",
  },
  labels: {
    legalNameEn: "English Legal Company Name",
    legalNameAr: "Arabic Legal Company Name",
    officialEmail: "Official Email",
    officialPhone: "Official Phone",
    nationalAddress: "National Address",
    crNumber: "Commercial Registration (CR)",
    tinNumber: "Tax Identification Number (TIN)",
    vatMode: "VAT Registration Status",
    defaultVatPercent: "Default VAT %",
    vatNumber: "VAT Number",
    vatEffectiveDate: "VAT Effective Date",
    bankName: "Bank Name",
    iban: "IBAN",
    accountHolder: "Account Holder",
    currency: "Currency",
    defaultTerms: "Default Terms",
  },
  help: {
    historicalSnapshot:
      "Changes apply to new records only and do not update previously created quotations, invoices, or generated documents.",
    bankRestricted: "Bank details are restricted to Admin and Accountant roles.",
  },
  vatModes: {
    not_registered: "Not registered",
    vat_registered_phase_1: "VAT registered - Phase 1",
  },
  actionResults: {
    saved: "Company settings saved.",
    updateFailed: "Failed to update company settings. Please try again.",
    unauthorized: "You must be signed in.",
    forbidden: "You do not have permission to update Company Settings.",
    unexpected: "An unexpected error occurred.",
    rateLimited: "Too many attempts. Please wait a moment and try again.",
    validationFailed: "Please check the settings values and try again.",
  },
  actionErrorMap: {
    "Company settings saved.": "Company settings saved.",
    "Failed to update company settings. Please try again.":
      "Failed to update company settings. Please try again.",
    Unauthorized: "You must be signed in.",
    Forbidden: "You do not have permission to update Company Settings.",
    "An unexpected error occurred.": "An unexpected error occurred.",
    "Too many attempts. Please wait a moment and try again.":
      "Too many attempts. Please wait a moment and try again.",
    "Validation failed": "Please check the settings values and try again.",
    "English legal company name is required": "English legal company name is required",
    "Arabic legal company name is required": "Arabic legal company name is required",
    "Official phone is required": "Official phone is required",
    "National address is required": "National address is required",
    "Bank name is required": "Bank name is required",
    "IBAN is required": "IBAN is required",
    "Bank account holder is required": "Bank account holder is required",
    "Default terms is required": "Default terms is required",
    "Invalid official email": "Invalid official email",
    "Default VAT percent must be 0 when the company is not VAT registered.":
      "Default VAT percent must be 0 when the company is not VAT registered.",
    "VAT number must be empty when the company is not VAT registered.":
      "VAT number must be empty when the company is not VAT registered.",
    "VAT effective date must be empty when the company is not VAT registered.":
      "VAT effective date must be empty when the company is not VAT registered.",
    "VAT number is required when the company is VAT registered.":
      "VAT number is required when the company is VAT registered.",
    "Default VAT percent must be greater than 0 when the company is VAT registered.":
      "Default VAT percent must be greater than 0 when the company is VAT registered.",
  },
};

const settingsDictionaryAr: SettingsDictionary = {
  locale: "ar",
  page: {
    title: "إعدادات الشركة",
    subtitle:
      "إدارة ملف الشركة وإعدادات ضريبة القيمة المضافة الافتراضية والبيانات البنكية للمستندات المستقبلية.",
  },
  states: {
    accessDenied: "تم رفض الوصول",
    accessDeniedMessage: "ليس لديك صلاحية لعرض إعدادات الشركة.",
    unavailable: "الإعدادات غير متاحة",
    unavailableMessage: "تعذر تحميل الإعدادات. يرجى التواصل مع المسؤول.",
    readOnly: "للقراءة فقط",
  },
  actions: {
    edit: "تعديل الإعدادات",
    cancel: "إلغاء",
    save: "حفظ التغييرات",
    saving: "جارٍ الحفظ...",
  },
  sections: {
    companyProfile: "ملف الشركة",
    legalVat: "البيانات النظامية وضريبة القيمة المضافة",
    bankDetails: "البيانات البنكية",
    financeDefaults: "الإعدادات المالية الافتراضية",
  },
  labels: {
    legalNameEn: "الاسم القانوني للشركة (إنجليزي)",
    legalNameAr: "الاسم القانوني للشركة (عربي)",
    officialEmail: "البريد الإلكتروني الرسمي",
    officialPhone: "الهاتف الرسمي",
    nationalAddress: "العنوان الوطني",
    crNumber: "السجل التجاري",
    tinNumber: "الرقم المميز (TIN)",
    vatMode: "حالة تسجيل ضريبة القيمة المضافة",
    defaultVatPercent: "نسبة ضريبة القيمة المضافة الافتراضية %",
    vatNumber: "الرقم الضريبي",
    vatEffectiveDate: "تاريخ سريان ضريبة القيمة المضافة",
    bankName: "اسم البنك",
    iban: "رقم الآيبان",
    accountHolder: "اسم صاحب الحساب",
    currency: "العملة",
    defaultTerms: "الشروط الافتراضية",
  },
  help: {
    historicalSnapshot:
      "تُطبَّق التغييرات على السجلات الجديدة فقط، ولا تُحدِّث عروض الأسعار أو الفواتير أو المستندات المُنشأة سابقاً.",
    bankRestricted: "البيانات البنكية مقيدة بأدوار المسؤول والمحاسب.",
  },
  vatModes: {
    not_registered: "غير مسجل",
    vat_registered_phase_1: "مسجل في ضريبة القيمة المضافة - المرحلة 1",
  },
  actionResults: {
    saved: "تم حفظ إعدادات الشركة.",
    updateFailed: "تعذر تحديث إعدادات الشركة. يرجى المحاولة مرة أخرى.",
    unauthorized: "يجب تسجيل الدخول أولاً.",
    forbidden: "ليس لديك صلاحية لتحديث إعدادات الشركة.",
    unexpected: "حدث خطأ غير متوقع.",
    rateLimited: "محاولات كثيرة جدًا. يرجى الانتظار لحظة ثم المحاولة مرة أخرى.",
    validationFailed: "يرجى التحقق من قيم الإعدادات ثم المحاولة مرة أخرى.",
  },
  actionErrorMap: {
    "Company settings saved.": "تم حفظ إعدادات الشركة.",
    "Failed to update company settings. Please try again.":
      "تعذر تحديث إعدادات الشركة. يرجى المحاولة مرة أخرى.",
    Unauthorized: "يجب تسجيل الدخول أولاً.",
    Forbidden: "ليس لديك صلاحية لتحديث إعدادات الشركة.",
    "An unexpected error occurred.": "حدث خطأ غير متوقع.",
    "Too many attempts. Please wait a moment and try again.":
      "محاولات كثيرة جدًا. يرجى الانتظار لحظة ثم المحاولة مرة أخرى.",
    "Validation failed": "يرجى التحقق من قيم الإعدادات ثم المحاولة مرة أخرى.",
    "English legal company name is required": "الاسم القانوني للشركة بالإنجليزية مطلوب",
    "Arabic legal company name is required": "الاسم القانوني للشركة بالعربية مطلوب",
    "Official phone is required": "الهاتف الرسمي مطلوب",
    "National address is required": "العنوان الوطني مطلوب",
    "Bank name is required": "اسم البنك مطلوب",
    "IBAN is required": "رقم الآيبان مطلوب",
    "Bank account holder is required": "اسم صاحب الحساب مطلوب",
    "Default terms is required": "الشروط الافتراضية مطلوبة",
    "Invalid official email": "البريد الإلكتروني الرسمي غير صالح",
    "Default VAT percent must be 0 when the company is not VAT registered.":
      "يجب أن تكون نسبة ضريبة القيمة المضافة الافتراضية 0 عندما تكون الشركة غير مسجلة.",
    "VAT number must be empty when the company is not VAT registered.":
      "يجب أن يكون الرقم الضريبي فارغًا عندما تكون الشركة غير مسجلة.",
    "VAT effective date must be empty when the company is not VAT registered.":
      "يجب أن يكون تاريخ سريان الضريبة فارغًا عندما تكون الشركة غير مسجلة.",
    "VAT number is required when the company is VAT registered.":
      "الرقم الضريبي مطلوب عندما تكون الشركة مسجلة في ضريبة القيمة المضافة.",
    "Default VAT percent must be greater than 0 when the company is VAT registered.":
      "يجب أن تكون نسبة ضريبة القيمة المضافة أكبر من 0 عندما تكون الشركة مسجلة.",
  },
};

const settingsDictionaries: Record<Locale, SettingsDictionary> = {
  en: settingsDictionaryEn,
  ar: settingsDictionaryAr,
};

export function getSettingsDictionary(locale: Locale): SettingsDictionary {
  return settingsDictionaries[locale];
}

export function getSettingsVatModeLabel(
  locale: Locale,
  mode: Extract<VatMode, "not_registered" | "vat_registered_phase_1">,
): string {
  return getSettingsDictionary(locale).vatModes[mode];
}

export function mapSettingsActionMessage(
  locale: Locale,
  message: string | undefined | null,
): string {
  if (!message) return "";
  const dictionary = getSettingsDictionary(locale);
  return dictionary.actionErrorMap[message] ?? message;
}
