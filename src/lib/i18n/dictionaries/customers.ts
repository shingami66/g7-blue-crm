import type { Locale } from "../locales";
import type { CustomerStatus, CustomerType } from "../../../types/customer";

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
  };
  list: {
    title: string;
    subtitle: string;
    export: string;
    addCustomer: string;
    createCustomer: string;
    creatingCustomer: string;
    customersSummaryZero: string;
    allStatuses: string;
    allCities: string;
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
  customerTypes: Record<CustomerType, string>;
  booleans: {
    yes: string;
    no: string;
  };
}

const customersDictionaryEn: CustomersDictionary = {
  locale: "en",
  states: {
    accessDenied: "Access Denied",
    customersForbidden: "You don't have permission to view the customers module.",
    customerForbidden: "You do not have permission to view customers.",
    customerServicesForbidden: "You do not have permission to view services for this customer.",
    genericError: "Something went wrong",
    customersLoadError: "We couldn't load the customers at this time. Please try again later.",
    customerLoadError: "We couldn't load the customer at this time. Please try again later.",
    relatedServicesLoadError: "We couldn't load the related services at this time. Please try again later.",
    noCustomers: "No customers yet. Click \"Add Customer\" to get started.",
    noFilteredCustomers: "No customers match the selected filters.",
    noRelatedServices: "No services are linked to this customer yet.",
    unknownError: "Unknown error",
  },
  list: {
    title: "Customers",
    subtitle: "Manage your client relationships and contact information.",
    export: "Export",
    addCustomer: "Add Customer",
    createCustomer: "Create Customer",
    creatingCustomer: "Creating...",
    customersSummaryZero: "Showing 0 of 0 customers",
    allStatuses: "All Statuses",
    allCities: "All Cities",
    table: {
      company: "Company",
      contactPerson: "Contact Person",
      location: "Location",
      status: "Status",
      services: "Services",
      quotedValue: "Quoted Value",
    },
    report: {
      title: "Customers Report",
      statusFilter: "Status",
      cityFilter: "City",
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
    customerNumber: "Customer No",
    customerProfile: "Customer Profile",
    primaryContact: "Primary Contact",
    servicesCount: "Services Count",
    totalQuotedAmount: "Total Quoted Amount",
    officialBillingDetails: "Official & Billing Details",
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
      crNumber: "CR Number",
      crNumberPlaceholder: "Commercial Registration",
      vatNumber: "VAT Number",
      vatNumberPlaceholder: "VAT number",
      billingEmail: "Billing Email",
      billingEmailPlaceholder: "billing@company.com",
      financeContactName: "Finance Contact Name",
      financeContactNamePlaceholder: "Finance contact",
      financeContactPhone: "Finance Contact Phone",
      financeContactPhonePlaceholder: "+966 5X XXX XXXX",
      paymentTerms: "Payment Terms",
      paymentTermsPlaceholder: "Optional payment terms",
      poRequired: "PO Required",
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
    noCustomers: "لا يوجد عملاء بعد. اضغط \"إضافة عميل\" للبدء.",
    noFilteredCustomers: "لا يوجد عملاء مطابقون للفلاتر المحددة.",
    noRelatedServices: "لا توجد خدمات مرتبطة بهذا العميل حتى الآن.",
    unknownError: "خطأ غير معروف",
  },
  list: {
    title: "العملاء",
    subtitle: "إدارة علاقات العملاء وبيانات التواصل الخاصة بهم.",
    export: "تصدير",
    addCustomer: "إضافة عميل",
    createCustomer: "إنشاء عميل",
    creatingCustomer: "جارٍ إنشاء العميل...",
    customersSummaryZero: "عرض 0 من 0 عميل",
    allStatuses: "كل الحالات",
    allCities: "كل المدن",
    table: {
      company: "الجهة",
      contactPerson: "جهة الاتصال",
      location: "المدينة",
      status: "الحالة",
      services: "الخدمات",
      quotedValue: "قيمة العروض",
    },
    report: {
      title: "تقرير العملاء",
      statusFilter: "الحالة",
      cityFilter: "المدينة",
      columns: {
        customerNumber: "رقم العميل",
        company: "الجهة",
        contactPerson: "جهة الاتصال",
        email: "البريد الإلكتروني",
        phone: "الهاتف",
        city: "المدينة",
        status: "الحالة",
        servicesCount: "عدد الخدمات",
        quotationsCount: "عدد عروض السعر",
        totalQuotedAmount: "إجمالي قيمة العروض (SAR)",
      },
    },
  },
  profile: {
    backToCustomers: "العودة إلى العملاء",
    customerNumber: "رقم العميل",
    customerProfile: "ملف العميل",
    primaryContact: "جهة الاتصال الأساسية",
    servicesCount: "عدد الخدمات",
    totalQuotedAmount: "إجمالي قيمة العروض",
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
      company: "الجهة *",
      companyPlaceholder: "اسم الجهة",
      contactPerson: "جهة الاتصال *",
      contactPersonPlaceholder: "اسم جهة الاتصال",
      phone: "الهاتف *",
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
      legalName: "الاسم النظامي",
      legalNamePlaceholder: "الاسم النظامي للفوترة",
      crNumber: "رقم السجل التجاري",
      crNumberPlaceholder: "رقم السجل التجاري",
      vatNumber: "ضريبة القيمة المضافة",
      vatNumberPlaceholder: "الرقم الضريبي",
      billingEmail: "البريد الإلكتروني للفوترة",
      billingEmailPlaceholder: "billing@company.com",
      financeContactName: "اسم جهة الاتصال المالية",
      financeContactNamePlaceholder: "اسم جهة الاتصال المالية",
      financeContactPhone: "هاتف جهة الاتصال المالية",
      financeContactPhonePlaceholder: "+966 5X XXX XXXX",
      paymentTerms: "شروط السداد",
      paymentTermsPlaceholder: "أدخل شروط السداد إن وجدت",
      poRequired: "أمر الشراء مطلوب",
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
