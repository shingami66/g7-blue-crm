import type { Locale } from "../locales";

export interface QuotationsDictionary {
  locale: Locale;
  states: {
    accessDenied: string;
    genericError: string;
    quotationsForbidden: string;
    quotationsLoadError: string;
    createForbidden: string;
    createDataLoadError: string;
    selectServiceTitle: string;
    selectServiceMessage: string;
    selectedServiceForbidden: string;
    selectedServiceLoadError: string;
    serviceUnavailableTitle: string;
    serviceUnavailableMessage: string;
    creationLockedTitle: string;
    creationLockedMessage: string;
  };
  actions: {
    goToServices: string;
    backToServices: string;
    backToService: string;
  };
  list: {
    title: string;
    subtitle: string;
    selectService: string;
    allStatuses: string;
    showingZero: string;
    showingRange: string;
    noFilteredQuotations: string;
    unknownCompany: string;
    table: {
      quotationNumber: string;
      clientEvent: string;
      issueDate: string;
      amountSar: string;
      status: string;
      actions: string;
    };
    actionTitles: {
      viewDetails: string;
      editQuotation: string;
      onlyDraftEditable: string;
      approvedCannotDelete: string;
      deleteQuotation: string;
    };
    deleteConfirm: string;
    deleteFailed: string;
  };
  form: {
    editTitle: string;
    newTitle: string;
    editSubtitle: string;
    newSubtitle: string;
    basicDetails: string;
    service: string;
    serviceTitle: string;
    status: string;
    customer: string;
    unknownCustomer: string;
    serviceSchedule: string;
    startDate: string;
    endDate: string;
    notSet: string;
    quotationEventLabel: string;
    quotationEventPlaceholder: string;
    documentDatesRates: string;
    issueDate: string;
    issueDateHint: string;
    validUntil: string;
    validUntilHint: string;
    discountSar: string;
    discountExceededHint: string;
    vat: string;
    notApplied: string;
    vatTitle: string;
    lineItems: string;
    addItem: string;
    description: string;
    descriptionPlaceholder: string;
    qty: string;
    unitPriceSar: string;
    detailsCategoryOptional: string;
    detailsPlaceholder: string;
    categoryPlaceholder: string;
    removeItem: string;
    minimumOneItem: string;
    previewOnly: string;
    subtotal: string;
    discount: string;
    discountGreaterThanSubtotal: string;
    grandTotal: string;
    saveChanges: string;
    createQuotation: string;
    validation: {
      serviceAlreadyStarted: string;
      validUntilRequired: string;
      validUntilBeforeIssueDate: string;
      validUntilAfterServiceStart: string;
      invalidItems: string;
      discountExceedsSubtotal: string;
      failedToUpdate: string;
      failedToCreate: string;
    };
    serviceStatuses: {
      Inquiry: string;
      Quoted: string;
    };
  };
  statuses: {
    draft: string;
    sent: string;
    approved: string;
    rejected: string;
    expired: string;
  };
}

const quotationsDictionaryEn: QuotationsDictionary = {
  locale: "en",
  states: {
    accessDenied: "Access Denied",
    genericError: "Something went wrong",
    quotationsForbidden: "You don't have permission to view the quotations module.",
    quotationsLoadError: "We couldn't load the quotations at this time. Please try again later.",
    createForbidden: "You don't have permission to create quotations.",
    createDataLoadError: "We couldn't load the necessary data at this time. Please try again later.",
    selectServiceTitle: "Select a Service First",
    selectServiceMessage: "Quotations must be created from an active Service.",
    selectedServiceForbidden: "You don't have permission to view the selected Service.",
    selectedServiceLoadError: "We couldn't load the selected Service at this time. Please try again later.",
    serviceUnavailableTitle: "Service Not Available",
    serviceUnavailableMessage: "The selected Service does not exist or is no longer available.",
    creationLockedTitle: "Quotation Creation Locked",
    creationLockedMessage: "Quotations can only be created for Services in Inquiry or Quoted status.",
  },
  actions: {
    goToServices: "Go to Services",
    backToServices: "Back to Services",
    backToService: "Back to Service",
  },
  list: {
    title: "Quotations",
    subtitle: "Manage client proposals, event estimates, and approvals.",
    selectService: "Select Service",
    allStatuses: "All Statuses",
    showingZero: "Showing 0 of 0 quotations",
    showingRange: "Showing {start}-{end} of {count} quotations",
    noFilteredQuotations: "No quotations match the selected filters.",
    unknownCompany: "Unknown Company",
    table: {
      quotationNumber: "Quote Number",
      clientEvent: "Client / Event",
      issueDate: "Issue Date",
      amountSar: "Amount (SAR)",
      status: "Status",
      actions: "Actions",
    },
    actionTitles: {
      viewDetails: "View Details",
      editQuotation: "Edit Quotation",
      onlyDraftEditable: "Only draft quotations can be edited",
      approvedCannotDelete: "Approved quotations cannot be deleted",
      deleteQuotation: "Delete Quotation",
    },
    deleteConfirm: "Are you sure you want to delete this quotation?",
    deleteFailed: "Failed to delete quotation.",
  },
  form: {
    editTitle: "Edit Quotation",
    newTitle: "New Quotation",
    editSubtitle: "Modify draft quotation details.",
    newSubtitle: "Create a new service-scoped quotation.",
    basicDetails: "Basic Details",
    service: "Service",
    serviceTitle: "Service Title",
    status: "Status",
    customer: "Customer",
    unknownCustomer: "Unknown Customer",
    serviceSchedule: "Service Schedule",
    startDate: "Start Date",
    endDate: "End Date",
    notSet: "Not set",
    quotationEventLabel: "Quotation / Event Label",
    quotationEventPlaceholder: "e.g. Annual Tech Conference 2026",
    documentDatesRates: "Quotation Document Dates & Rates",
    issueDate: "Issue Date",
    issueDateHint: "Issue Date is the quotation document date. Service execution dates are shown in Service Schedule.",
    validUntil: "Quotation Valid Until",
    validUntilHint: "Offer expiry date - not related to service execution dates.",
    discountSar: "Discount (SAR)",
    discountExceededHint: "Discount cannot exceed subtotal. Server totals will reject this value.",
    vat: "Tax/VAT",
    notApplied: "Not applied",
    vatTitle: "G7 BLUE is not VAT registered. Final totals are calculated on the server.",
    lineItems: "Line Items",
    addItem: "Add Item",
    description: "Description",
    descriptionPlaceholder: "Service or product name",
    qty: "Qty",
    unitPriceSar: "Unit Price (SAR)",
    detailsCategoryOptional: "Details / Category (Optional)",
    detailsPlaceholder: "Additional details...",
    categoryPlaceholder: "Category",
    removeItem: "Remove item",
    minimumOneItem: "At least one item is required",
    previewOnly: "Preview only. Final totals are calculated securely on the server.",
    subtotal: "Subtotal",
    discount: "Discount",
    discountGreaterThanSubtotal: "Discount is greater than subtotal.",
    grandTotal: "Grand Total",
    saveChanges: "Save Changes",
    createQuotation: "Create Quotation",
    validation: {
      serviceAlreadyStarted: "Cannot create a quotation because the service has already started.",
      validUntilRequired: "Please select a valid until date.",
      validUntilBeforeIssueDate: "Valid until date must be on or after the quotation date.",
      validUntilAfterServiceStart: "Quotation cannot remain valid after the service begins.",
      invalidItems: "All items must have a description, positive quantity, and non-negative unit price.",
      discountExceedsSubtotal: "Discount cannot exceed subtotal. Reduce the discount or adjust line items.",
      failedToUpdate: "Failed to update quotation.",
      failedToCreate: "Failed to create quotation.",
    },
    serviceStatuses: {
      Inquiry: "Inquiry",
      Quoted: "Quoted",
    },
  },
  statuses: {
    draft: "Draft",
    sent: "Sent",
    approved: "Approved",
    rejected: "Rejected",
    expired: "Expired",
  },
};

const quotationsDictionaryAr: QuotationsDictionary = {
  locale: "ar",
  states: {
    accessDenied: "تم رفض الوصول",
    genericError: "حدث خطأ ما",
    quotationsForbidden: "ليس لديك صلاحية لعرض وحدة عروض السعر.",
    quotationsLoadError: "تعذر تحميل عروض السعر في الوقت الحالي. يرجى المحاولة مرة أخرى لاحقًا.",
    createForbidden: "ليس لديك صلاحية لإنشاء عروض السعر.",
    createDataLoadError: "تعذر تحميل البيانات المطلوبة في الوقت الحالي. يرجى المحاولة مرة أخرى لاحقًا.",
    selectServiceTitle: "اختر خدمة أولًا",
    selectServiceMessage: "يجب إنشاء عروض السعر من خدمة نشطة.",
    selectedServiceForbidden: "ليس لديك صلاحية لعرض الخدمة المحددة.",
    selectedServiceLoadError: "تعذر تحميل الخدمة المحددة في الوقت الحالي. يرجى المحاولة مرة أخرى لاحقًا.",
    serviceUnavailableTitle: "الخدمة غير متاحة",
    serviceUnavailableMessage: "الخدمة المحددة غير موجودة أو لم تعد متاحة.",
    creationLockedTitle: "إنشاء عرض السعر غير متاح",
    creationLockedMessage: "يمكن إنشاء عروض السعر فقط للخدمات التي حالتها استفسار أو تم تقديم عرض سعر.",
  },
  actions: {
    goToServices: "الانتقال إلى الخدمات",
    backToServices: "العودة إلى الخدمات",
    backToService: "العودة إلى الخدمة",
  },
  list: {
    title: "عروض السعر",
    subtitle: "إدارة عروض العملاء وتقديرات الفعاليات وحالات الاعتماد.",
    selectService: "اختر خدمة",
    allStatuses: "كل الحالات",
    showingZero: "عرض 0 من 0 من عروض السعر",
    showingRange: "عرض {start}-{end} من {count} من عروض السعر",
    noFilteredQuotations: "لا توجد عروض سعر مطابقة للفلاتر المحددة.",
    unknownCompany: "جهة غير معروفة",
    table: {
      quotationNumber: "رقم عرض السعر",
      clientEvent: "العميل / الفعالية",
      issueDate: "تاريخ الإصدار",
      amountSar: "القيمة (SAR)",
      status: "الحالة",
      actions: "الإجراءات",
    },
    actionTitles: {
      viewDetails: "عرض التفاصيل",
      editQuotation: "تعديل عرض السعر",
      onlyDraftEditable: "يمكن تعديل عروض السعر المسودة فقط",
      approvedCannotDelete: "لا يمكن حذف عروض السعر المعتمدة",
      deleteQuotation: "حذف عرض السعر",
    },
    deleteConfirm: "هل أنت متأكد من رغبتك في حذف عرض السعر هذا؟",
    deleteFailed: "تعذر حذف عرض السعر.",
  },
  form: {
    editTitle: "تعديل عرض السعر",
    newTitle: "عرض سعر جديد",
    editSubtitle: "تعديل تفاصيل عرض السعر المسودة.",
    newSubtitle: "إنشاء عرض سعر جديد مرتبط بالخدمة.",
    basicDetails: "التفاصيل الأساسية",
    service: "الخدمة",
    serviceTitle: "عنوان الخدمة",
    status: "الحالة",
    customer: "العميل",
    unknownCustomer: "عميل غير معروف",
    serviceSchedule: "جدول الخدمة",
    startDate: "تاريخ البداية",
    endDate: "تاريخ النهاية",
    notSet: "غير محدد",
    quotationEventLabel: "عنوان عرض السعر / الفعالية",
    quotationEventPlaceholder: "مثال: المؤتمر التقني السنوي 2026",
    documentDatesRates: "تواريخ وأسعار عرض السعر",
    issueDate: "تاريخ الإصدار",
    issueDateHint: "تاريخ الإصدار هو تاريخ مستند عرض السعر. تواريخ تنفيذ الخدمة تظهر ضمن جدول الخدمة.",
    validUntil: "صالح حتى",
    validUntilHint: "تاريخ انتهاء العرض، ولا يرتبط بتواريخ تنفيذ الخدمة.",
    discountSar: "الخصم (SAR)",
    discountExceededHint: "لا يمكن أن يتجاوز الخصم المجموع الفرعي. سيرفض الخادم هذه القيمة عند احتساب الإجماليات.",
    vat: "ضريبة القيمة المضافة",
    notApplied: "غير مطبقة",
    vatTitle: "G7 BLUE غير مسجلة في ضريبة القيمة المضافة. يتم احتساب الإجماليات النهائية على الخادم.",
    lineItems: "بنود العرض",
    addItem: "إضافة بند",
    description: "الوصف",
    descriptionPlaceholder: "اسم الخدمة أو المنتج",
    qty: "الكمية",
    unitPriceSar: "سعر الوحدة (SAR)",
    detailsCategoryOptional: "التفاصيل / الفئة (اختياري)",
    detailsPlaceholder: "تفاصيل إضافية...",
    categoryPlaceholder: "الفئة",
    removeItem: "إزالة البند",
    minimumOneItem: "مطلوب بند واحد على الأقل",
    previewOnly: "المعاينة فقط. يتم احتساب الإجماليات النهائية بأمان على الخادم.",
    subtotal: "المجموع الفرعي",
    discount: "الخصم",
    discountGreaterThanSubtotal: "الخصم أكبر من المجموع الفرعي.",
    grandTotal: "الإجمالي",
    saveChanges: "حفظ التغييرات",
    createQuotation: "إنشاء عرض سعر",
    validation: {
      serviceAlreadyStarted: "لا يمكن إنشاء عرض سعر لأن الخدمة بدأت بالفعل.",
      validUntilRequired: "يرجى اختيار تاريخ صالح حتى.",
      validUntilBeforeIssueDate: "يجب أن يكون تاريخ صالح حتى في تاريخ عرض السعر أو بعده.",
      validUntilAfterServiceStart: "لا يمكن أن يظل عرض السعر صالحًا بعد بدء الخدمة.",
      invalidItems: "يجب أن تحتوي جميع البنود على وصف وكمية موجبة وسعر وحدة غير سالب.",
      discountExceedsSubtotal: "لا يمكن أن يتجاوز الخصم المجموع الفرعي. قلل قيمة الخصم أو عدل البنود.",
      failedToUpdate: "تعذر تحديث عرض السعر.",
      failedToCreate: "تعذر إنشاء عرض السعر.",
    },
    serviceStatuses: {
      Inquiry: "استفسار",
      Quoted: "تم تقديم عرض سعر",
    },
  },
  statuses: {
    draft: "مسودة",
    sent: "مرسل",
    approved: "معتمد",
    rejected: "مرفوض",
    expired: "منتهي الصلاحية",
  },
};

const quotationsDictionaries: Record<Locale, QuotationsDictionary> = {
  en: quotationsDictionaryEn,
  ar: quotationsDictionaryAr,
};

export function getQuotationsDictionary(locale: Locale): QuotationsDictionary {
  return quotationsDictionaries[locale];
}
