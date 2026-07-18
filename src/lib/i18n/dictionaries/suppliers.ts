import type { Locale } from "../locales";
import type {
  SupplierStatus,
  SupplierType,
  SupplierVatRegistrationStatus,
} from "../../../types/supplier";
import { resolveDictionaryValue } from "../fallback.ts";

export type SupplierCategoryCode =
  | "transport"
  | "cars"
  | "cleaning"
  | "staff"
  | "security"
  | "sound"
  | "lighting"
  | "screens_led"
  | "decoration"
  | "photo_video"
  | "catering"
  | "logistics"
  | "furniture_tents_stage"
  | "printing"
  | "permits_support"
  | "other";

export interface SuppliersDictionary {
  locale: Locale;
  states: {
    accessDenied: string;
    genericError: string;
    listForbidden: string;
    listLoadError: string;
    detailForbidden: string;
    detailLoadError: string;
    createForbidden: string;
    createLoadError: string;
    editForbidden: string;
    editLoadError: string;
    listInlineError: string;
    noSuppliers: string;
    noFilteredSuppliers: string;
  };
  list: {
    title: string;
    subtitle: string;
    newSupplier: string;
    searchPlaceholder: string;
    allStatuses: string;
    allCategories: string;
    showingZero: string;
    showingRange: string;
    showDeleted: string;
    showCurrent: string;
    viewSupplier: string;
    columns: {
      supplier: string;
      category: string;
      type: string;
      location: string;
      rating: string;
      status: string;
      actions: string;
    };
  };
  detail: {
    title: string;
    subtitle: string;
    backToSuppliers: string;
    edit: string;
    contactInformation: string;
    directoryDetails: string;
    address: string;
    taxIdentity: string;
    internalDetails: string;
    bankDetails: string;
    rateCards: string;
    status: string;
    supplierType: string;
    category: string;
    preferred: string;
    legalName: string;
    contactName: string;
    phone: string;
    whatsappPhone: string;
    email: string;
    city: string;
    country: string;
    coverageArea: string;
    crNumber: string;
    vatRegistration: string;
    vatNumber: string;
    paymentTerms: string;
    notes: string;
    bankName: string;
    bankAccountName: string;
    iban: string;
    blacklistDetails: string;
    blacklistReason: string;
    blacklistedOn: string;
    noBankDetails: string;
    yes: string;
    no: string;
    deleted: string;
  };
  form: {
    newTitle: string;
    newSubtitle: string;
    editTitle: string;
    editSubtitle: string;
    backToSuppliers: string;
    directoryDetails: string;
    contactLegal: string;
    bankDetails: string;
    labels: {
      supplierName: string;
      legalName: string;
      supplierType: string;
      category: string;
      preferredSupplier: string;
      coverageArea: string;
      status: string;
      contactName: string;
      phone: string;
      whatsappPhone: string;
      email: string;
      city: string;
      country: string;
      crNumber: string;
      vatRegistration: string;
      vatNumber: string;
      paymentTerms: string;
      bankName: string;
      bankAccountName: string;
      iban: string;
      internalNotes: string;
    };
    placeholders: {
      selectType: string;
      selectCategory: string;
      notes: string;
    };
    buttons: { cancel: string; create: string; update: string };
    validation: {
      nameRequired: string;
      typeRequired: string;
      categoryRequired: string;
      contactRequired: string;
      phoneRequired: string;
      cityRequired: string;
      countryRequired: string;
      vatNumberRequired: string;
      createFailed: string;
      updateFailed: string;
    };
  };
  blacklist: {
    blacklist: string;
    removeBlacklist: string;
    blacklistTitle: string;
    unblacklistTitle: string;
    blacklistBody: string;
    unblacklistBody: string;
    reasonLabel: string;
    reasonPlaceholder: string;
    cancel: string;
    confirmBlacklist: string;
    blacklisting: string;
    confirmUnblacklist: string;
    processing: string;
    blacklistFailed: string;
    unblacklistFailed: string;
  };
  deleteRestore: {
    delete: string;
    restore: string;
    deleteTitle: string;
    restoreTitle: string;
    deleteBody: string;
    restoreBody: string;
    cancel: string;
    confirmDelete: string;
    confirmRestore: string;
    deleting: string;
    restoring: string;
    deleteFailed: string;
    restoreFailed: string;
  };
  rateCards: {
    loading: string;
    loadFailed: string;
    empty: string;
    perUnit: string;
    validFrom: string;
    validTo: string;
    current: string;
    active: string;
    inactive: string;
  };
  statuses: Record<SupplierStatus, string>;
  types: Record<SupplierType, string>;
  vatRegistration: Record<SupplierVatRegistrationStatus, string>;
  createStatuses: Record<"active" | "on_hold" | "inactive", string>;
  categories: Record<SupplierCategoryCode, string>;
}

const suppliersDictionaryEn: SuppliersDictionary = {
  locale: "en",
  states: {
    accessDenied: "Access Denied",
    genericError: "Something went wrong",
    listForbidden: "You don't have permission to view the suppliers module.",
    listLoadError: "We couldn't load suppliers at this time. Please try again later.",
    detailForbidden: "You don't have permission to view this supplier.",
    detailLoadError: "We couldn't load this supplier at this time. Please try again later.",
    createForbidden: "You don't have permission to create suppliers.",
    createLoadError: "We couldn't load the supplier form at this time. Please try again later.",
    editForbidden: "You don't have permission to edit suppliers.",
    editLoadError: "We couldn't load the supplier for editing at this time. Please try again later.",
    listInlineError: "Suppliers could not be loaded right now.",
    noSuppliers: "No suppliers found.",
    noFilteredSuppliers: "No suppliers match the selected filters.",
  },
  list: {
    title: "Suppliers",
    subtitle: "Manage the supplier directory and operational supplier records.",
    newSupplier: "New Supplier",
    searchPlaceholder: "Search suppliers...",
    allStatuses: "All Statuses",
    allCategories: "All Categories",
    showingZero: "Showing 0 suppliers",
    showingRange: "Showing {start}-{end} of {total} suppliers",
    showDeleted: "Show deleted",
    showCurrent: "Show current",
    viewSupplier: "View supplier",
    columns: { supplier: "Supplier", category: "Category", type: "Type", location: "Location", rating: "Rating", status: "Status", actions: "Actions" },
  },
  detail: {
    title: "Supplier Details",
    subtitle: "Supplier directory record",
    backToSuppliers: "Back to suppliers",
    edit: "Edit",
    contactInformation: "Contact Information",
    directoryDetails: "Directory Details",
    address: "Address and Coverage",
    taxIdentity: "Tax Identity",
    internalDetails: "Internal Details",
    bankDetails: "Bank Details",
    rateCards: "Internal Rate Cards",
    status: "Status",
    supplierType: "Supplier Type",
    category: "Category",
    preferred: "Preferred",
    legalName: "Legal Name",
    contactName: "Primary Contact",
    phone: "Phone",
    whatsappPhone: "WhatsApp Phone",
    email: "Email",
    city: "City",
    country: "Country",
    coverageArea: "Coverage Area",
    crNumber: "CR Number",
    vatRegistration: "VAT Registration",
    vatNumber: "VAT Number",
    paymentTerms: "Payment Terms",
    notes: "Internal Notes",
    bankName: "Bank Name",
    bankAccountName: "Account Holder",
    iban: "IBAN",
    blacklistDetails: "Blacklist Details",
    blacklistReason: "Reason",
    blacklistedOn: "Blacklisted on {date}",
    noBankDetails: "No bank details recorded.",
    yes: "Yes",
    no: "No",
    deleted: "Deleted supplier",
  },
  form: {
    newTitle: "New Supplier",
    newSubtitle: "Create a supplier directory record for operational use.",
    editTitle: "Edit Supplier",
    editSubtitle: "Update this supplier directory record.",
    backToSuppliers: "Back to suppliers",
    directoryDetails: "Directory Details",
    contactLegal: "Contact and Legal Details",
    bankDetails: "Bank Details",
    labels: {
      supplierName: "Supplier Name", legalName: "Legal Name", supplierType: "Supplier Type", category: "Category", preferredSupplier: "Preferred Supplier", coverageArea: "Coverage Area", status: "Status", contactName: "Primary Contact", phone: "Phone", whatsappPhone: "WhatsApp Phone", email: "Email", city: "City", country: "Country", crNumber: "CR Number", vatRegistration: "VAT Registration", vatNumber: "VAT Number", paymentTerms: "Payment Terms", bankName: "Bank Name", bankAccountName: "Account Holder", iban: "IBAN", internalNotes: "Internal Notes",
    },
    placeholders: { selectType: "Select type", selectCategory: "Select category", notes: "Optional internal context for the supplier directory" },
    buttons: { cancel: "Cancel", create: "Create Supplier", update: "Update Supplier" },
    validation: { nameRequired: "Supplier name is required.", typeRequired: "Supplier type is required.", categoryRequired: "Supplier category is required.", contactRequired: "Primary contact name is required.", phoneRequired: "Phone is required.", cityRequired: "City is required.", countryRequired: "Country is required.", vatNumberRequired: "VAT number is required for a VAT-registered supplier.", createFailed: "Failed to create supplier.", updateFailed: "Failed to update supplier." },
  },
  blacklist: {
    blacklist: "Blacklist", removeBlacklist: "Remove Blacklist", blacklistTitle: "Blacklist Supplier", unblacklistTitle: "Remove Blacklist", blacklistBody: "You are about to blacklist {name}. This prevents future business operations with them. Provide a reason.", unblacklistBody: "You are about to remove the blacklist status for {name}. Their status will be set to inactive.", reasonLabel: "Reason for Blacklisting", reasonPlaceholder: "Provide a detailed reason...", cancel: "Cancel", confirmBlacklist: "Confirm Blacklist", blacklisting: "Blacklisting...", confirmUnblacklist: "Remove Blacklist", processing: "Processing...", blacklistFailed: "Failed to blacklist supplier", unblacklistFailed: "Failed to remove supplier blacklist",
  },
  deleteRestore: {
    delete: "Delete", restore: "Restore", deleteTitle: "Delete Supplier", restoreTitle: "Restore Supplier", deleteBody: "Delete {name} from the active supplier directory? Historical records are retained.", restoreBody: "Restore {name} to the supplier directory? Non-blacklisted suppliers return as inactive.", cancel: "Cancel", confirmDelete: "Delete Supplier", confirmRestore: "Restore Supplier", deleting: "Deleting...", restoring: "Restoring...", deleteFailed: "Failed to delete supplier", restoreFailed: "Failed to restore supplier",
  },
  rateCards: { loading: "Loading rate cards...", loadFailed: "Failed to load rate cards. Please try again.", empty: "No rate cards recorded for this supplier.", perUnit: "per {unit}", validFrom: "Valid From", validTo: "Valid To", current: "Current", active: "Active", inactive: "Inactive" },
  statuses: { active: "Active", on_hold: "On Hold", blacklisted: "Blacklisted", inactive: "Inactive" },
  types: { company: "Company", individual: "Individual" },
  vatRegistration: { unknown: "Unknown", not_registered: "Not Registered", registered: "VAT Registered" },
  createStatuses: { active: "Active", on_hold: "On Hold", inactive: "Inactive" },
  categories: { transport: "Transport", cars: "Cars", cleaning: "Cleaning", staff: "Staff", security: "Security", sound: "Sound", lighting: "Lighting", screens_led: "Screens LED", decoration: "Decoration", photo_video: "Photo Video", catering: "Catering", logistics: "Logistics", furniture_tents_stage: "Furniture Tents Stage", printing: "Printing", permits_support: "Permits Support", other: "Other" },
};

const suppliersDictionaryAr: SuppliersDictionary = {
  locale: "ar",
  states: {
    accessDenied: "تم رفض الوصول",
    genericError: "حدث خطأ ما",
    listForbidden: "ليس لديك صلاحية لعرض وحدة الموردين.",
    listLoadError: "تعذر تحميل الموردين في الوقت الحالي. يرجى المحاولة مرة أخرى لاحقًا.",
    detailForbidden: "ليس لديك صلاحية لعرض هذا المورد.",
    detailLoadError: "تعذر تحميل هذا المورد في الوقت الحالي. يرجى المحاولة مرة أخرى لاحقًا.",
    createForbidden: "ليس لديك صلاحية لإنشاء موردين.",
    createLoadError: "تعذر تحميل نموذج المورد في الوقت الحالي. يرجى المحاولة مرة أخرى لاحقًا.",
    editForbidden: "ليس لديك صلاحية لتعديل الموردين.",
    editLoadError: "تعذر تحميل المورد للتعديل في الوقت الحالي. يرجى المحاولة مرة أخرى لاحقًا.",
    listInlineError: "تعذر تحميل الموردين الآن.",
    noSuppliers: "لم يتم العثور على موردين في الدليل المباشر.",
    noFilteredSuppliers: "لا يوجد موردون مطابقون للفلاتر المحددة.",
  },
  list: {
    title: "الموردون",
    subtitle: "إدارة دليل الموردين وبياناتهم التشغيلية.",
    newSupplier: "مورد جديد",
    searchPlaceholder: "ابحث عن الموردين...",
    allStatuses: "كل الحالات",
    allCategories: "كل الفئات",
    showingZero: "عرض 0 موردين",
    showingRange: "عرض {start}-{end} من {total} موردين",
    showDeleted: "عرض المحذوفين",
    showCurrent: "عرض الحاليين",
    viewSupplier: "عرض المورد",
    columns: { supplier: "المورد", category: "الفئة", type: "النوع", location: "الموقع", rating: "التقييم", status: "الحالة", actions: "إجراءات" },
  },
  detail: {
    title: "تفاصيل المورد", subtitle: "سجل دليل المورد", backToSuppliers: "العودة إلى الموردين", edit: "تعديل", contactInformation: "معلومات التواصل", directoryDetails: "تفاصيل الدليل", address: "العنوان ونطاق التغطية", taxIdentity: "الهوية الضريبية", internalDetails: "بيانات داخلية", bankDetails: "البيانات البنكية", rateCards: "بطاقات الأسعار الداخلية", status: "الحالة", supplierType: "نوع المورد", category: "الفئة", preferred: "مفضل", legalName: "الاسم القانوني", contactName: "جهة الاتصال الرئيسية", phone: "الهاتف", whatsappPhone: "هاتف واتساب", email: "البريد الإلكتروني", city: "المدينة", country: "الدولة", coverageArea: "منطقة التغطية", crNumber: "رقم السجل التجاري", vatRegistration: "تسجيل ضريبة القيمة المضافة", vatNumber: "الرقم الضريبي", paymentTerms: "شروط الدفع", notes: "ملاحظات داخلية", bankName: "اسم البنك", bankAccountName: "اسم صاحب الحساب", iban: "الآيبان", blacklistDetails: "تفاصيل القائمة السوداء", blacklistReason: "السبب", blacklistedOn: "تمت الإضافة إلى القائمة السوداء في {date}", noBankDetails: "لا توجد بيانات بنكية مسجلة.", yes: "نعم", no: "لا", deleted: "مورد محذوف",
  },
  form: {
    newTitle: "مورد جديد", newSubtitle: "إنشاء سجل مورد في الدليل للاستخدام التشغيلي.", editTitle: "تعديل المورد", editSubtitle: "تحديث سجل المورد في الدليل.", backToSuppliers: "العودة إلى الموردين", directoryDetails: "تفاصيل الدليل", contactLegal: "التواصل والبيانات النظامية", bankDetails: "البيانات البنكية",
    labels: { supplierName: "اسم المورد", legalName: "الاسم القانوني", supplierType: "نوع المورد", category: "الفئة", preferredSupplier: "مورد مفضل", coverageArea: "منطقة التغطية", status: "الحالة", contactName: "اسم جهة الاتصال الرئيسية", phone: "الهاتف", whatsappPhone: "هاتف واتساب", email: "البريد الإلكتروني", city: "المدينة", country: "الدولة", crNumber: "رقم السجل التجاري", vatRegistration: "تسجيل ضريبة القيمة المضافة", vatNumber: "الرقم الضريبي", paymentTerms: "شروط الدفع", bankName: "اسم البنك", bankAccountName: "اسم صاحب الحساب", iban: "الآيبان", internalNotes: "ملاحظات داخلية" },
    placeholders: { selectType: "اختر النوع", selectCategory: "اختر الفئة", notes: "سياق داخلي اختياري لدليل الموردين" },
    buttons: { cancel: "إلغاء", create: "إنشاء المورد", update: "تحديث المورد" },
    validation: { nameRequired: "اسم المورد مطلوب.", typeRequired: "نوع المورد مطلوب.", categoryRequired: "فئة المورد مطلوبة.", contactRequired: "اسم جهة الاتصال الرئيسية مطلوب.", phoneRequired: "الهاتف مطلوب.", cityRequired: "المدينة مطلوبة.", countryRequired: "الدولة مطلوبة.", vatNumberRequired: "الرقم الضريبي مطلوب للمورد المسجل في ضريبة القيمة المضافة.", createFailed: "تعذر إنشاء المورد.", updateFailed: "تعذر تحديث المورد." },
  },
  blacklist: {
    blacklist: "إضافة للقائمة السوداء", removeBlacklist: "إزالة من القائمة السوداء", blacklistTitle: "إضافة المورد للقائمة السوداء", unblacklistTitle: "إزالة من القائمة السوداء", blacklistBody: "أنت على وشك إضافة {name} إلى القائمة السوداء. سيمنع هذا أي عمليات تجارية مستقبلية معهم. يرجى إدخال سبب.", unblacklistBody: "أنت على وشك إزالة حالة القائمة السوداء عن {name}. ستصبح حالته غير نشط.", reasonLabel: "سبب الإدراج في القائمة السوداء", reasonPlaceholder: "أدخل سببًا مفصلاً...", cancel: "إلغاء", confirmBlacklist: "تأكيد الإدراج", blacklisting: "جارٍ الإدراج...", confirmUnblacklist: "إزالة من القائمة السوداء", processing: "جارٍ المعالجة...", blacklistFailed: "تعذر إدراج المورد في القائمة السوداء", unblacklistFailed: "تعذر إزالة المورد من القائمة السوداء",
  },
  deleteRestore: {
    delete: "حذف", restore: "استعادة", deleteTitle: "حذف المورد", restoreTitle: "استعادة المورد", deleteBody: "هل تريد حذف {name} من دليل الموردين الحالي؟ ستبقى السجلات التاريخية محفوظة.", restoreBody: "هل تريد استعادة {name} إلى دليل الموردين؟ سيعود المورد غير المدرج بالقائمة السوداء بحالة غير نشط.", cancel: "إلغاء", confirmDelete: "حذف المورد", confirmRestore: "استعادة المورد", deleting: "جارٍ الحذف...", restoring: "جارٍ الاستعادة...", deleteFailed: "تعذر حذف المورد", restoreFailed: "تعذر استعادة المورد",
  },
  rateCards: { loading: "جارٍ تحميل بطاقات الأسعار...", loadFailed: "تعذر تحميل بطاقات الأسعار. يرجى المحاولة مرة أخرى.", empty: "لا توجد بطاقات أسعار مسجلة لهذا المورد.", perUnit: "لكل {unit}", validFrom: "ساري من", validTo: "ساري حتى", current: "حالي", active: "نشط", inactive: "غير نشط" },
  statuses: { active: "نشط", on_hold: "موقوف مؤقتًا", blacklisted: "قائمة سوداء", inactive: "غير نشط" },
  types: { company: "شركة", individual: "فرد" },
  vatRegistration: { unknown: "غير معروف", not_registered: "غير مسجل", registered: "مسجل في ضريبة القيمة المضافة" },
  createStatuses: { active: "نشط", on_hold: "موقوف مؤقتًا", inactive: "غير نشط" },
  categories: { transport: "نقل", cars: "سيارات", cleaning: "تنظيف", staff: "طاقم عمل", security: "أمن", sound: "صوت", lighting: "إضاءة", screens_led: "شاشات LED", decoration: "ديكور", photo_video: "تصوير", catering: "تموين", logistics: "لوجستيات", furniture_tents_stage: "أثاث وخيام ومنصات", printing: "طباعة", permits_support: "تصاريح ودعم", other: "أخرى" },
};

const suppliersDictionaries: Record<Locale, SuppliersDictionary> = { en: suppliersDictionaryEn, ar: suppliersDictionaryAr };

export function getSuppliersDictionary(locale: Locale): SuppliersDictionary {
  return suppliersDictionaries[locale];
}

export function getSupplierStatusLabel(locale: Locale, status: SupplierStatus): string {
  const active = getSuppliersDictionary(locale);
  const english = getSuppliersDictionary("en");
  return resolveDictionaryValue({ activeValue: active.statuses[status], category: "label", englishValue: english.statuses[status], key: `statuses.${status}`, locale, namespace: "suppliers", surface: "supplier-status" });
}

export function getSupplierTypeLabel(locale: Locale, type: SupplierType): string {
  const active = getSuppliersDictionary(locale);
  const english = getSuppliersDictionary("en");
  return resolveDictionaryValue({ activeValue: active.types[type], category: "label", englishValue: english.types[type], key: `types.${type}`, locale, namespace: "suppliers", surface: "supplier-type" });
}

export function getSupplierCategoryLabel(locale: Locale, category: string | null | undefined): string {
  if (!category) return "—";
  const active = getSuppliersDictionary(locale);
  const english = getSuppliersDictionary("en");
  if (isSupplierCategoryCode(category, active.categories)) {
    const key = category;
    return resolveDictionaryValue({ activeValue: active.categories[key], category: "label", englishValue: english.categories[key], key: `categories.${key}`, locale, namespace: "suppliers", surface: "supplier-category" });
  }
  return category;
}

function isSupplierCategoryCode(
  value: string,
  categories: Record<SupplierCategoryCode, string>,
): value is SupplierCategoryCode {
  return Object.prototype.hasOwnProperty.call(categories, value);
}

export function getSupplierVatRegistrationLabel(locale: Locale, value: SupplierVatRegistrationStatus | null | undefined): string {
  if (!value) return "—";
  return getSuppliersDictionary(locale).vatRegistration[value];
}

export function formatSupplierCopy(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => String(values[key] ?? ""));
}
