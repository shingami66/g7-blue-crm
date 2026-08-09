import type { Locale } from "../locales";
import type { CustomerStatus, CustomerType } from "../../../types/customer";
import type { ServiceStatus } from "../../../types/service";
import { resolveDictionaryValue } from "../fallback.ts";

export interface CustomersDictionary {
  locale: Locale;
  states: {
    accessDenied: string;
    customersForbidden: string;
    customerForbidden: string;
    customerServicesForbidden: string;
    genericError: string;
    customersLoadError: string;
    customerLoadError: string;
    relatedServicesLoadError: string;
    noCustomers: string;
    noFilteredCustomers: string;
    noRelatedServices: string;
    unknownError: string;
    validationFailed: string;
    actionFailed: string;
    unauthorized: string;
    forbidden: string;
  };
  list: {
    title: string;
    subtitle: string;
    export: string;
    addCustomer: string;
    createCustomer: string;
    creatingCustomer: string;
    customersSummaryZero: string;
    /** Template with `{range}` and `{total}` placeholders (Western digits supplied at call site). */
    customersSummary: string;
    searchPlaceholder: string;
    allStatuses: string;
    allCities: string;
    actions: {
      view: string;
      opening: string;
    };
    table: {
      company: string;
      contactPerson: string;
      location: string;
      status: string;
      services: string;
      quotedValue: string;
    };
    report: {
      title: string;
      statusFilter: string;
      cityFilter: string;
      /** Workbook chrome labels (meta/filter rows + defaults). */
      chrome: {
        filteredView: string;
        generatedAtLabel: string;
        generatedByLabel: string;
        totalRecordsLabel: string;
        filtersLabel: string;
        allRecords: string;
        systemGenerated: string;
        defaultSheetName: string;
      };
      columns: {
        customerNumber: string;
        company: string;
        contactPerson: string;
        email: string;
        phone: string;
        city: string;
        status: string;
        servicesCount: string;
        quotationsCount: string;
        totalQuotedAmount: string;
      };
    };
  };
  profile: {
    backToCustomers: string;
    customerNumber: string;
    customerProfile: string;
    primaryContact: string;
    servicesCount: string;
    totalQuotedAmount: string;
    officialBillingDetails: string;
    relatedServices: string;
    relatedServicesSubtitle: string;
    totalServices: string;
    serviceTable: {
      serviceNumber: string;
      serviceTitle: string;
      eventDate: string;
      status: string;
      budget: string;
    };
  };
  actions: {
    editProfile: string;
    saveChanges: string;
    cancel: string;
    closeAddCustomer: string;
    closeEditCustomerProfile: string;
  };
  form: {
    core: {
      company: string;
      companyPlaceholder: string;
      contactPerson: string;
      contactPersonPlaceholder: string;
      phone: string;
      phonePlaceholder: string;
      email: string;
      emailPlaceholder: string;
      city: string;
      cityPlaceholder: string;
      status: string;
    };
    officialBilling: {
      title: string;
      customerType: string;
      notSpecified: string;
      individual: string;
      company: string;
      individualHint: string;
      legalName: string;
      legalNamePlaceholder: string;
      crNumber: string;
      crNumberPlaceholder: string;
      vatNumber: string;
      vatNumberPlaceholder: string;
      billingEmail: string;
      billingEmailPlaceholder: string;
      financeContactName: string;
      financeContactNamePlaceholder: string;
      financeContactPhone: string;
      financeContactPhonePlaceholder: string;
      paymentTerms: string;
      paymentTermsPlaceholder: string;
      poRequired: string;
      nationalAddress: string;
      buildingNumber: string;
      buildingNumberPlaceholder: string;
      street: string;
      streetPlaceholder: string;
      district: string;
      districtPlaceholder: string;
      addressCity: string;
      addressCityPlaceholder: string;
      postalCode: string;
      postalCodePlaceholder: string;
      additionalNumber: string;
      additionalNumberPlaceholder: string;
      country: string;
      countryPlaceholder: string;
    };
  };
  customerStatuses: Record<CustomerStatus, string>;
  serviceStatuses: Record<ServiceStatus, string>;
  customerTypes: Record<CustomerType, string>;
  booleans: {
    yes: string;
    no: string;
  };
}

const customersDictionaryEn: CustomersDictionary = {
  locale: "en",
  states: {
    accessDenied: "Access denied",
    customersForbidden: "You do not have permission to view the customers module.",
    customerForbidden: "You do not have permission to view customers.",
    customerServicesForbidden: "You do not have permission to view services for this customer.",
    genericError: "Something went wrong",
    customersLoadError: "We could not load the customers at this time. Please try again later.",
    customerLoadError: "We could not load the customer at this time. Please try again later.",
    relatedServicesLoadError: "We could not load the related services at this time. Please try again later.",
    noCustomers: "No customers found. Click \"Add Customer\" to get started.",
    noFilteredCustomers: "No customers match the selected filters.",
    noRelatedServices: "No related services",
    unknownError: "Unknown error",
    validationFailed: "Please check the highlighted fields and try again.",
    actionFailed: "Unable to save the customer. Please try again.",
    unauthorized: "You are not authorized to perform this action.",
    forbidden: "You do not have permission to perform this action.",
  },
  list: {
    title: "Customers",
    subtitle: "Manage your client relationships and contact information.",
    export: "Export",
    addCustomer: "Add Customer",
    createCustomer: "Create Customer",
    creatingCustomer: "Creating...",
    customersSummaryZero: "Showing 0 of 0 customers",
    customersSummary: "Showing {range} of {total} customers",
    searchPlaceholder: "Search customer number, name, contact, phone, or email",
    allStatuses: "All Statuses",
    allCities: "All Cities",
    actions: {
      view: "View",
      opening: "Opening customer…",
    },
    table: {
      company: "Company",
      contactPerson: "Contact Person",
      location: "City",
      status: "Status",
      services: "Related Services",
      quotedValue: "Quoted Value",
    },
    report: {
      title: "Customers Report",
      statusFilter: "Status",
      cityFilter: "City",
      chrome: {
        filteredView: "Filtered View",
        generatedAtLabel: "Generated At",
        generatedByLabel: "Generated By",
        totalRecordsLabel: "Total Records",
        filtersLabel: "Filters",
        allRecords: "All records",
        systemGenerated: "System Generated",
        defaultSheetName: "Report",
      },
      columns: {
        customerNumber: "Customer Number",
        company: "Company",
        contactPerson: "Contact Person",
        email: "Email",
        phone: "Phone",
        city: "City",
        status: "Status",
        servicesCount: "Services Count",
        quotationsCount: "Quotations Count",
        totalQuotedAmount: "Total Quoted Amount (SAR)",
      },
    },
  },
  profile: {
    backToCustomers: "Back to customers",
    customerNumber: "Customer Number",
    customerProfile: "Customer Profile",
    primaryContact: "Contact Person",
    servicesCount: "Services Count",
    totalQuotedAmount: "Quoted Value",
    officialBillingDetails: "Official and Billing Details",
    relatedServices: "Related Services",
    relatedServicesSubtitle: "Services linked to this customer.",
    totalServices: "Total services",
    serviceTable: {
      serviceNumber: "Service Number",
      serviceTitle: "Service Title / Event Name",
      eventDate: "Event Date",
      status: "Status",
      budget: "Budget",
    },
  },
  actions: {
    editProfile: "Edit Profile",
    saveChanges: "Save Changes",
    cancel: "Cancel",
    closeAddCustomer: "Close add customer",
    closeEditCustomerProfile: "Close edit customer profile",
  },
  form: {
    core: {
      company: "Company *",
      companyPlaceholder: "Company name",
      contactPerson: "Contact Person *",
      contactPersonPlaceholder: "Contact name",
      phone: "Phone *",
      phonePlaceholder: "+966 5X XXX XXXX",
      email: "Email *",
      emailPlaceholder: "email@company.com",
      city: "City *",
      cityPlaceholder: "Riyadh",
      status: "Status",
    },
    officialBilling: {
      title: "Official & Billing Details",
      customerType: "Customer Type",
      notSpecified: "Not specified",
      individual: "Individual",
      company: "Company",
      individualHint: "Individual customer - company registration and billing fields are not required.",
      legalName: "Legal Name",
      legalNamePlaceholder: "Legal billing name",
      crNumber: "Commercial Registration Number",
      crNumberPlaceholder: "Commercial Registration",
      vatNumber: "VAT Number",
      vatNumberPlaceholder: "VAT number",
      billingEmail: "Billing Email",
      billingEmailPlaceholder: "billing@company.com",
      financeContactName: "Finance Contact",
      financeContactNamePlaceholder: "Finance contact",
      financeContactPhone: "Finance Contact Phone",
      financeContactPhonePlaceholder: "+966 5X XXX XXXX",
      paymentTerms: "Payment Terms",
      paymentTermsPlaceholder: "Optional payment terms",
      poRequired: "Purchase Order Required",
      nationalAddress: "National Address",
      buildingNumber: "Building Number",
      buildingNumberPlaceholder: "Building number",
      street: "Street",
      streetPlaceholder: "Street",
      district: "District",
      districtPlaceholder: "District",
      addressCity: "City",
      addressCityPlaceholder: "City",
      postalCode: "Postal Code",
      postalCodePlaceholder: "Postal code",
      additionalNumber: "Additional Number",
      additionalNumberPlaceholder: "Additional number",
      country: "Country",
      countryPlaceholder: "Saudi Arabia",
    },
  },
  customerStatuses: {
    lead: "Lead",
    active: "Active",
    inactive: "Inactive",
  },
  serviceStatuses: {
    Inquiry: "Inquiry",
    Quoted: "Quoted",
    Approved: "Approved",
    "Deposit Paid": "Deposit Paid",
    "In Progress": "In Progress",
    Completed: "Completed",
    Cancelled: "Cancelled",
  },
  customerTypes: {
    individual: "Individual",
    company: "Company",
  },
  booleans: {
    yes: "Yes",
    no: "No",
  },
};

const customersDictionaryAr: CustomersDictionary = {
  locale: "ar",
  states: {
    accessDenied: "تم رفض الوصول",
    customersForbidden: "ليس لديك صلاحية لعرض وحدة العملاء.",
    customerForbidden: "ليس لديك صلاحية لعرض العملاء.",
    customerServicesForbidden: "ليس لديك صلاحية لعرض الخدمات المرتبطة بهذا العميل.",
    genericError: "حدث خطأ ما",
    customersLoadError: "تعذر تحميل العملاء في الوقت الحالي. يرجى المحاولة مرة أخرى لاحقًا.",
    customerLoadError: "تعذر تحميل العميل في الوقت الحالي. يرجى المحاولة مرة أخرى لاحقًا.",
    relatedServicesLoadError: "تعذر تحميل الخدمات المرتبطة في الوقت الحالي. يرجى المحاولة مرة أخرى لاحقًا.",
    noCustomers: "لم يتم العثور على عملاء. اضغط \"إضافة عميل\" للبدء.",
    noFilteredCustomers: "لا يوجد عملاء مطابقون للفلاتر المحددة.",
    noRelatedServices: "لا توجد خدمات مرتبطة",
    unknownError: "خطأ غير معروف",
    validationFailed: "يرجى التحقق من الحقول المطلوبة والمحاولة مرة أخرى.",
    actionFailed: "تعذر حفظ بيانات العميل. يرجى المحاولة مرة أخرى.",
    unauthorized: "ليس لديك صلاحية لتنفيذ هذا الإجراء.",
    forbidden: "لا تملك الإذن لتنفيذ هذا الإجراء.",
  },
  list: {
    title: "العملاء",
    subtitle: "إدارة علاقات العملاء وبيانات التواصل الخاصة بهم.",
    export: "تصدير",
    addCustomer: "إضافة عميل",
    createCustomer: "إنشاء عميل",
    creatingCustomer: "جارٍ إنشاء العميل...",
    customersSummaryZero: "عرض 0 من 0 عميل",
    customersSummary: "عرض {range} من إجمالي {total} عميل",
    searchPlaceholder: "ابحث برقم العميل أو الاسم أو جهة الاتصال أو الهاتف أو البريد الإلكتروني",
    allStatuses: "جميع الحالات",
    allCities: "كل المدن",
    actions: {
      view: "عرض",
      opening: "جارٍ فتح العميل…",
    },
    table: {
      company: "الشركة",
      contactPerson: "مسؤول التواصل",
      location: "المدينة",
      status: "الحالة",
      services: "الخدمات المرتبطة",
      quotedValue: "قيمة العروض",
    },
    report: {
      title: "تقرير العملاء",
      statusFilter: "الحالة",
      cityFilter: "المدينة",
      chrome: {
        filteredView: "عرض مُصفّى",
        generatedAtLabel: "تاريخ الإنشاء",
        generatedByLabel: "تم الإنشاء بواسطة",
        totalRecordsLabel: "إجمالي السجلات",
        filtersLabel: "عوامل التصفية",
        allRecords: "كل السجلات",
        systemGenerated: "تم إنشاؤه بواسطة النظام",
        defaultSheetName: "تقرير",
      },
      columns: {
        customerNumber: "رقم العميل",
        company: "الشركة",
        contactPerson: "مسؤول التواصل",
        email: "البريد الإلكتروني",
        phone: "رقم الهاتف",
        city: "المدينة",
        status: "الحالة",
        servicesCount: "عدد الخدمات",
        quotationsCount: "عدد عروض الأسعار",
        totalQuotedAmount: "قيمة العروض (SAR)",
      },
    },
  },
  profile: {
    backToCustomers: "العودة إلى العملاء",
    customerNumber: "رقم العميل",
    customerProfile: "ملف العميل",
    primaryContact: "مسؤول التواصل",
    servicesCount: "عدد الخدمات",
    totalQuotedAmount: "قيمة العروض",
    officialBillingDetails: "البيانات الرسمية وبيانات الفوترة",
    relatedServices: "الخدمات المرتبطة",
    relatedServicesSubtitle: "الخدمات المرتبطة بهذا العميل.",
    totalServices: "إجمالي الخدمات",
    serviceTable: {
      serviceNumber: "رقم الخدمة",
      serviceTitle: "عنوان الخدمة / اسم الفعالية",
      eventDate: "تاريخ الفعالية",
      status: "الحالة",
      budget: "الميزانية",
    },
  },
  actions: {
    editProfile: "تعديل الملف",
    saveChanges: "حفظ التغييرات",
    cancel: "إلغاء",
    closeAddCustomer: "إغلاق إضافة عميل",
    closeEditCustomerProfile: "إغلاق تعديل ملف العميل",
  },
  form: {
    core: {
      company: "الشركة *",
      companyPlaceholder: "اسم الشركة",
      contactPerson: "مسؤول التواصل *",
      contactPersonPlaceholder: "اسم مسؤول التواصل",
      phone: "رقم الهاتف *",
      phonePlaceholder: "+966 5X XXX XXXX",
      email: "البريد الإلكتروني *",
      emailPlaceholder: "email@company.com",
      city: "المدينة *",
      cityPlaceholder: "الرياض",
      status: "الحالة",
    },
    officialBilling: {
      title: "البيانات الرسمية وبيانات الفوترة",
      customerType: "نوع العميل",
      notSpecified: "غير محدد",
      individual: "فرد",
      company: "شركة",
      individualHint: "العميل الفرد لا يتطلب بيانات السجل التجاري أو بيانات الفوترة الخاصة بالشركة.",
      legalName: "الاسم القانوني",
      legalNamePlaceholder: "الاسم القانوني للفوترة",
      crNumber: "رقم السجل التجاري",
      crNumberPlaceholder: "رقم السجل التجاري",
      vatNumber: "الرقم الضريبي",
      vatNumberPlaceholder: "الرقم الضريبي",
      billingEmail: "بريد الفوترة الإلكتروني",
      billingEmailPlaceholder: "billing@company.com",
      financeContactName: "مسؤول الحسابات",
      financeContactNamePlaceholder: "اسم مسؤول الحسابات",
      financeContactPhone: "هاتف مسؤول الحسابات",
      financeContactPhonePlaceholder: "+966 5X XXX XXXX",
      paymentTerms: "شروط الدفع",
      paymentTermsPlaceholder: "أدخل شروط الدفع إن وجدت",
      poRequired: "يتطلب أمر شراء",
      nationalAddress: "العنوان الوطني",
      buildingNumber: "رقم المبنى",
      buildingNumberPlaceholder: "رقم المبنى",
      street: "الشارع",
      streetPlaceholder: "اسم الشارع",
      district: "الحي",
      districtPlaceholder: "اسم الحي",
      addressCity: "المدينة",
      addressCityPlaceholder: "المدينة",
      postalCode: "الرمز البريدي",
      postalCodePlaceholder: "الرمز البريدي",
      additionalNumber: "الرقم الإضافي",
      additionalNumberPlaceholder: "الرقم الإضافي",
      country: "الدولة",
      countryPlaceholder: "المملكة العربية السعودية",
    },
  },
  customerStatuses: {
    lead: "عميل محتمل",
    active: "نشط",
    inactive: "غير نشط",
  },
  serviceStatuses: {
    Inquiry: "استفسار",
    Quoted: "تم التسعير",
    Approved: "معتمد",
    "Deposit Paid": "تم دفع الدفعة المقدمة",
    "In Progress": "قيد التنفيذ",
    Completed: "مكتمل",
    Cancelled: "ملغى",
  },
  customerTypes: {
    individual: "فرد",
    company: "شركة",
  },
  booleans: {
    yes: "نعم",
    no: "لا",
  },
};

const customersDictionaries: Record<Locale, CustomersDictionary> = {
  en: customersDictionaryEn,
  ar: customersDictionaryAr,
};

export function getCustomersDictionary(locale: Locale): CustomersDictionary {
  return customersDictionaries[locale];
}

export function getCustomerStatusLabel(locale: Locale, status: CustomerStatus): string {
  const activeDictionary = getCustomersDictionary(locale);
  const englishDictionary = getCustomersDictionary("en");

  return resolveDictionaryValue({
    activeValue: activeDictionary.customerStatuses[status],
    category: "label",
    englishValue: englishDictionary.customerStatuses[status],
    key: `customers.statuses.${status}`,
    locale,
    namespace: "customers",
    surface: "customers",
  });
}

export function getCustomerServiceStatusLabel(locale: Locale, status: ServiceStatus): string {
  const activeDictionary = getCustomersDictionary(locale);
  const englishDictionary = getCustomersDictionary("en");

  return resolveDictionaryValue({
    activeValue: activeDictionary.serviceStatuses[status],
    category: "label",
    englishValue: englishDictionary.serviceStatuses[status],
    key: `customers.serviceStatuses.${status}`,
    locale,
    namespace: "customers",
    surface: "customers",
  });
}

/** Inserts Western-digit range/total placeholders into the list summary template. */
export function formatCustomersSummaryCopy(
  template: string,
  values: { range: string; total: string },
): string {
  return template
    .replaceAll("{range}", values.range)
    .replaceAll("{total}", values.total);
}
