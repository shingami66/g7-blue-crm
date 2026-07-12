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
    columns: {
      supplier: string;
      category: string;
      type: string;
      location: string;
      rating: string;
      status: string;
    };
  };
  panel: {
    edit: string;
    closeDetails: string;
    contactInformation: string;
    blacklistDetails: string;
    reason: string;
    blacklistedOn: string;
    directoryDetails: string;
    status: string;
    vatRegistration: string;
    preferred: string;
    yes: string;
    no: string;
    coverage: string;
    noCoverage: string;
    recentActivity: string;
    servicePrefix: string;
    noRecentService: string;
    liveRecord: string;
    internalRateCards: string;
  };
  form: {
    newTitle: string;
    newSubtitle: string;
    editTitle: string;
    editSubtitle: string;
    backToSuppliers: string;
    directoryDetails: string;
    contactLegal: string;
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
      internalNotes: string;
    };
    placeholders: {
      selectType: string;
      selectCategory: string;
      notes: string;
    };
    buttons: {
      cancel: string;
      create: string;
      update: string;
    };
    validation: {
      nameRequired: string;
      phoneRequired: string;
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
  vatRegistration: Record<
    NonNullable<SupplierVatRegistrationStatus> | "not_registered" | "registered" | "unknown",
    string
  >;
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
    createForbidden: "You don't have permission to create suppliers.",
    createLoadError: "We couldn't load the supplier form at this time. Please try again later.",
    editForbidden: "You don't have permission to edit suppliers.",
    editLoadError: "We couldn't load the supplier for editing at this time. Please try again later.",
    listInlineError: "Suppliers could not be loaded right now.",
    noSuppliers: "No suppliers found in the live directory.",
    noFilteredSuppliers: "No suppliers match the selected filters.",
  },
  list: {
    title: "Suppliers",
    subtitle: "Review live supplier directory records from the database.",
    newSupplier: "New Supplier",
    searchPlaceholder: "Search suppliers...",
    allStatuses: "All Statuses",
    allCategories: "All Categories",
    showingZero: "Showing 0 suppliers",
    showingRange: "Showing {filtered} of {total} suppliers",
    columns: {
      supplier: "Supplier",
      category: "Category",
      type: "Type",
      location: "Location",
      rating: "Rating",
      status: "Status",
    },
  },
  panel: {
    edit: "Edit",
    closeDetails: "Close supplier details",
    contactInformation: "Contact Information",
    blacklistDetails: "Blacklist Details",
    reason: "Reason:",
    blacklistedOn: "Blacklisted on {date}",
    directoryDetails: "Directory Details",
    status: "Status",
    vatRegistration: "VAT Registration",
    preferred: "Preferred",
    yes: "Yes",
    no: "No",
    coverage: "Coverage",
    noCoverage: "No coverage area recorded.",
    recentActivity: "Recent Activity",
    servicePrefix: "Service {id}",
    noRecentService: "No recent service recorded",
    liveRecord: "Live supplier directory record",
    internalRateCards: "Internal Rate Cards",
  },
  form: {
    newTitle: "New Supplier",
    newSubtitle: "Create a supplier directory record for operational lookup.",
    editTitle: "Edit Supplier",
    editSubtitle: "Update supplier directory record.",
    backToSuppliers: "Back to suppliers",
    directoryDetails: "Directory Details",
    contactLegal: "Contact & Legal",
    labels: {
      supplierName: "Supplier Name",
      legalName: "Legal Name",
      supplierType: "Supplier Type",
      category: "Category",
      preferredSupplier: "Preferred Supplier",
      coverageArea: "Coverage Area",
      status: "Status",
      contactName: "Contact Name",
      phone: "Phone",
      whatsappPhone: "WhatsApp Phone",
      email: "Email",
      city: "City",
      country: "Country",
      crNumber: "CR Number",
      vatRegistration: "VAT Registration",
      vatNumber: "VAT Number",
      internalNotes: "Internal Notes",
    },
    placeholders: {
      selectType: "Select type",
      selectCategory: "Select category",
      notes: "Optional internal context for the supplier directory",
    },
    buttons: {
      cancel: "Cancel",
      create: "Create Supplier",
      update: "Update Supplier",
    },
    validation: {
      nameRequired: "Supplier name is required.",
      phoneRequired: "Phone is required.",
      createFailed: "Failed to create supplier.",
      updateFailed: "Failed to update supplier.",
    },
  },
  blacklist: {
    blacklist: "Blacklist",
    removeBlacklist: "Remove Blacklist",
    blacklistTitle: "Blacklist Supplier",
    unblacklistTitle: "Remove Blacklist",
    blacklistBody:
      "You are about to blacklist {name}. This will prevent any future business operations with them. Please provide a mandatory reason.",
    unblacklistBody:
      "You are about to remove the blacklist status for {name}. Their status will be set to inactive, and they will be eligible for business operations again.",
    reasonLabel: "Reason for Blacklisting",
    reasonPlaceholder: "Provide a detailed reason...",
    cancel: "Cancel",
    confirmBlacklist: "Confirm Blacklist",
    blacklisting: "Blacklisting...",
    confirmUnblacklist: "Remove Blacklist",
    processing: "Processing...",
    blacklistFailed: "Failed to blacklist supplier",
    unblacklistFailed: "Failed to unblacklist supplier",
  },
  rateCards: {
    loading: "Loading rate cards...",
    loadFailed: "Failed to load rate cards. Please try again.",
    empty: "No rate cards recorded for this supplier.",
    perUnit: "per {unit}",
    validFrom: "Valid From",
    validTo: "Valid To",
    current: "Current",
    active: "Active",
    inactive: "Inactive",
  },
  statuses: {
    active: "Active",
    on_hold: "On Hold",
    blacklisted: "Blacklisted",
    inactive: "Inactive",
  },
  types: {
    company: "Company",
    individual: "Individual",
  },
  vatRegistration: {
    not_registered: "Not Registered",
    registered: "VAT Registered",
    unknown: "Unknown",
  },
  createStatuses: {
    active: "Active",
    on_hold: "On Hold",
    inactive: "Inactive",
  },
  categories: {
    transport: "Transport",
    cars: "Cars",
    cleaning: "Cleaning",
    staff: "Staff",
    security: "Security",
    sound: "Sound",
    lighting: "Lighting",
    screens_led: "Screens LED",
    decoration: "Decoration",
    photo_video: "Photo Video",
    catering: "Catering",
    logistics: "Logistics",
    furniture_tents_stage: "Furniture Tents Stage",
    printing: "Printing",
    permits_support: "Permits Support",
    other: "Other",
  },
};

const suppliersDictionaryAr: SuppliersDictionary = {
  locale: "ar",
  states: {
    accessDenied: "تم رفض الوصول",
    genericError: "حدث خطأ ما",
    listForbidden: "ليس لديك صلاحية لعرض وحدة الموردين.",
    listLoadError: "تعذر تحميل الموردين في الوقت الحالي. يرجى المحاولة مرة أخرى لاحقًا.",
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
    subtitle: "مراجعة سجلات دليل الموردين المباشرة من قاعدة البيانات.",
    newSupplier: "مورد جديد",
    searchPlaceholder: "ابحث عن الموردين...",
    allStatuses: "كل الحالات",
    allCategories: "كل الفئات",
    showingZero: "عرض 0 موردين",
    showingRange: "عرض {filtered} من {total} موردين",
    columns: {
      supplier: "المورد",
      category: "الفئة",
      type: "النوع",
      location: "الموقع",
      rating: "التقييم",
      status: "الحالة",
    },
  },
  panel: {
    edit: "تعديل",
    closeDetails: "إغلاق تفاصيل المورد",
    contactInformation: "معلومات التواصل",
    blacklistDetails: "تفاصيل القائمة السوداء",
    reason: "السبب:",
    blacklistedOn: "تمت الإضافة إلى القائمة السوداء في {date}",
    directoryDetails: "تفاصيل الدليل",
    status: "الحالة",
    vatRegistration: "تسجيل ضريبة القيمة المضافة",
    preferred: "مفضل",
    yes: "نعم",
    no: "لا",
    coverage: "نطاق التغطية",
    noCoverage: "لم يتم تسجيل منطقة تغطية.",
    recentActivity: "النشاط الأخير",
    servicePrefix: "الخدمة {id}",
    noRecentService: "لا توجد خدمة حديثة مسجلة",
    liveRecord: "سجل دليل مورد مباشر",
    internalRateCards: "بطاقات الأسعار الداخلية",
  },
  form: {
    newTitle: "مورد جديد",
    newSubtitle: "إنشاء سجل مورد في الدليل للاستخدام التشغيلي.",
    editTitle: "تعديل المورد",
    editSubtitle: "تحديث سجل المورد في الدليل.",
    backToSuppliers: "العودة إلى الموردين",
    directoryDetails: "تفاصيل الدليل",
    contactLegal: "التواصل والبيانات النظامية",
    labels: {
      supplierName: "اسم المورد",
      legalName: "الاسم القانوني",
      supplierType: "نوع المورد",
      category: "الفئة",
      preferredSupplier: "مورد مفضل",
      coverageArea: "منطقة التغطية",
      status: "الحالة",
      contactName: "اسم جهة الاتصال",
      phone: "الهاتف",
      whatsappPhone: "هاتف واتساب",
      email: "البريد الإلكتروني",
      city: "المدينة",
      country: "الدولة",
      crNumber: "رقم السجل التجاري",
      vatRegistration: "تسجيل ضريبة القيمة المضافة",
      vatNumber: "الرقم الضريبي",
      internalNotes: "ملاحظات داخلية",
    },
    placeholders: {
      selectType: "اختر النوع",
      selectCategory: "اختر الفئة",
      notes: "سياق داخلي اختياري لدليل الموردين",
    },
    buttons: {
      cancel: "إلغاء",
      create: "إنشاء المورد",
      update: "تحديث المورد",
    },
    validation: {
      nameRequired: "اسم المورد مطلوب.",
      phoneRequired: "الهاتف مطلوب.",
      createFailed: "تعذر إنشاء المورد.",
      updateFailed: "تعذر تحديث المورد.",
    },
  },
  blacklist: {
    blacklist: "إضافة للقائمة السوداء",
    removeBlacklist: "إزالة من القائمة السوداء",
    blacklistTitle: "إضافة المورد للقائمة السوداء",
    unblacklistTitle: "إزالة من القائمة السوداء",
    blacklistBody:
      "أنت على وشك إضافة {name} إلى القائمة السوداء. سيمنع هذا أي عمليات تجارية مستقبلية معهم. يرجى إدخال سبب إلزامي.",
    unblacklistBody:
      "أنت على وشك إزالة حالة القائمة السوداء عن {name}. ستصبح حالته غير نشط، وسيكون مؤهلاً للعمليات التجارية مرة أخرى.",
    reasonLabel: "سبب الإدراج في القائمة السوداء",
    reasonPlaceholder: "أدخل سببًا مفصلاً...",
    cancel: "إلغاء",
    confirmBlacklist: "تأكيد الإدراج",
    blacklisting: "جارٍ الإدراج...",
    confirmUnblacklist: "إزالة من القائمة السوداء",
    processing: "جارٍ المعالجة...",
    blacklistFailed: "تعذر إدراج المورد في القائمة السوداء",
    unblacklistFailed: "تعذر إزالة المورد من القائمة السوداء",
  },
  rateCards: {
    loading: "جارٍ تحميل بطاقات الأسعار...",
    loadFailed: "تعذر تحميل بطاقات الأسعار. يرجى المحاولة مرة أخرى.",
    empty: "لا توجد بطاقات أسعار مسجلة لهذا المورد.",
    perUnit: "لكل {unit}",
    validFrom: "ساري من",
    validTo: "ساري حتى",
    current: "حالي",
    active: "نشط",
    inactive: "غير نشط",
  },
  statuses: {
    active: "نشط",
    on_hold: "موقوف مؤقتًا",
    blacklisted: "قائمة سوداء",
    inactive: "غير نشط",
  },
  types: {
    company: "شركة",
    individual: "فرد",
  },
  vatRegistration: {
    not_registered: "غير مسجل",
    registered: "مسجل في ضريبة القيمة المضافة",
    unknown: "غير معروف",
  },
  createStatuses: {
    active: "نشط",
    on_hold: "موقوف مؤقتًا",
    inactive: "غير نشط",
  },
  categories: {
    transport: "نقل",
    cars: "سيارات",
    cleaning: "تنظيف",
    staff: "طاقم عمل",
    security: "أمن",
    sound: "صوت",
    lighting: "إضاءة",
    screens_led: "شاشات LED",
    decoration: "ديكور",
    photo_video: "تصوير",
    catering: "تموين",
    logistics: "لوجستيات",
    furniture_tents_stage: "أثاث وخيام ومنصات",
    printing: "طباعة",
    permits_support: "تصاريح ودعم",
    other: "أخرى",
  },
};

const suppliersDictionaries: Record<Locale, SuppliersDictionary> = {
  en: suppliersDictionaryEn,
  ar: suppliersDictionaryAr,
};

export function getSuppliersDictionary(locale: Locale): SuppliersDictionary {
  return suppliersDictionaries[locale];
}

export function getSupplierStatusLabel(locale: Locale, status: SupplierStatus): string {
  const active = getSuppliersDictionary(locale);
  const english = getSuppliersDictionary("en");
  return resolveDictionaryValue({
    activeValue: active.statuses[status],
    category: "label",
    englishValue: english.statuses[status],
    key: `statuses.${status}`,
    locale,
    namespace: "suppliers",
    surface: "supplier-status",
  });
}

export function getSupplierTypeLabel(locale: Locale, type: SupplierType): string {
  const active = getSuppliersDictionary(locale);
  const english = getSuppliersDictionary("en");
  return resolveDictionaryValue({
    activeValue: active.types[type],
    category: "label",
    englishValue: english.types[type],
    key: `types.${type}`,
    locale,
    namespace: "suppliers",
    surface: "supplier-type",
  });
}

export function getSupplierCategoryLabel(locale: Locale, category: string | null | undefined): string {
  if (!category) return "—";
  const active = getSuppliersDictionary(locale);
  const english = getSuppliersDictionary("en");
  if (category in active.categories) {
    const key = category as SupplierCategoryCode;
    return resolveDictionaryValue({
      activeValue: active.categories[key],
      category: "label",
      englishValue: english.categories[key],
      key: `categories.${key}`,
      locale,
      namespace: "suppliers",
      surface: "supplier-category",
    });
  }
  // Stored free-text or unknown codes: show as-is (not translated).
  return category;
}

export function getSupplierVatRegistrationLabel(
  locale: Locale,
  value: SupplierVatRegistrationStatus | null | undefined,
): string {
  if (!value) return "—";
  const active = getSuppliersDictionary(locale);
  return active.vatRegistration[value] ?? value;
}

export function formatSupplierCopy(
  template: string,
  values: Record<string, string | number>,
): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => String(values[key] ?? ""));
}
