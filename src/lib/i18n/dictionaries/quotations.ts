import type { Locale } from "../locales";
import type { QuotationStatus } from "../../quotations/types";
import { resolveDictionaryValue } from "../fallback.ts";

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
    backToDashboard: string;
  };
  list: {
    title: string;
    subtitle: string;
    selectService: string;
    allStatuses: string;
    showingZero: string;
    showingRange: string;
    noQuotations: string;
    noFilteredQuotations: string;
    unknownCompany: string;
    selector: {
      title: string;
      description: string;
      searchPlaceholder: string;
      service: string;
      customer: string;
      eventDate: string;
      location: string;
      select: string;
      resultsCount: string;
      noEligibleServices: string;
      noSearchResults: string;
      close: string;
      navigationPending: string;
    };
    table: {
      quotationNumber: string;
      clientEvent: string;
      issueDate: string;
      amountSar: string;
      status: string;
      printPdf: string;
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
  detail: {
    sections: {
      details: string;
      lineItems: string;
      financialSummary: string;
      depositInvoice: string;
      billingAuthority: string;
    };
    labels: {
      client: string;
      eventName: string;
      issueDate: string;
      validUntil: string;
      service: string;
      qty: string;
      unitSar: string;
      totalSar: string;
      subtotal: string;
      discount: string;
      taxVat: string;
      grandTotal: string;
    };
    actions: {
      edit: string;
      printPdf: string;
    };
    states: {
      detailForbidden: string;
      unknownCompany: string;
      noLineItems: string;
      notApplied: string;
    };
    depositInvoice: {
      alreadyCreated: string;
      openFromInvoices: string;
    };
    billingAuthority: {
      activeAbsTitle: string;
      activeAbsNotice: string;
      historicalTitle: string;
      historicalNotice: string;
      legacyTitle: string;
      legacyNotice: string;
      noAuthorityTitle: string;
      noAuthorityNotice: string;
      unavailableTitle: string;
      unavailableNotice: string;
      differentQuotationNotice: string;
      sourceQuotationTotal: string;
      billingCeiling: string;
      invoiceExposure: string;
      remainingBillable: string;
      amountUnavailable: string;
      fullyAllocated: string;
      openServiceBilling: string;
    };
    vatWithRate: string;
  };
  statuses: {
    draft: string;
    sent: string;
    approved: string;
    rejected: string;
    expired: string;
  };
  approval: {
    approve: string;
    reject: string;
    approveFailed: string;
    rejectFailed: string;
    unexpectedError: string;
  };
  editStates: {
    notFound: string;
    notFoundMessage: string;
    locked: string;
    lockedMessage: string;
    serviceContextRequired: string;
    serviceContextMessage: string;
    backToQuotations: string;
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
    backToDashboard: "Back to Dashboard",
  },
  list: {
    title: "Quotations",
    subtitle: "Manage client proposals, event estimates, and approvals.",
    selectService: "Select Service",
    allStatuses: "All Statuses",
    showingZero: "Showing 0 of 0 quotations",
    showingRange: "Showing {start}-{end} of {count} quotations",
    noQuotations: "No quotations found.",
    noFilteredQuotations: "No quotations match the current filters.",
    unknownCompany: "Unknown Company",
    selector: {
      title: "Select an eligible Service",
      description: "Choose a Service to continue to the existing quotation form.",
      searchPlaceholder: "Search Services, customers, event details, or locations",
      service: "Service",
      customer: "Customer",
      eventDate: "Service date",
      location: "Location",
      select: "Select",
      resultsCount: "Showing {count} eligible Services",
      noEligibleServices: "No eligible Services are available for quotation creation.",
      noSearchResults: "No eligible Services match your search.",
      close: "Close Service selector",
      navigationPending: "Opening quotation form…",
    },
    table: {
      quotationNumber: "Quotation Number",
      clientEvent: "Client / Event",
      issueDate: "Issue Date",
      amountSar: "Amount (SAR)",
      status: "Status",
      printPdf: "Print / PDF",
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
    validUntil: "Valid Until",
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
    removeItem: "Remove Item",
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
  detail: {
    sections: {
      details: "Details",
      lineItems: "Line Items",
      financialSummary: "Financial Summary",
      depositInvoice: "Deposit Invoice",
      billingAuthority: "Billing Authority",
    },
    labels: {
      client: "Client",
      eventName: "Event Name",
      issueDate: "Issue Date",
      validUntil: "Valid Until",
      service: "Service",
      qty: "Qty",
      unitSar: "Unit (SAR)",
      totalSar: "Total (SAR)",
      subtotal: "Subtotal",
      discount: "Discount",
      taxVat: "Tax/VAT",
      grandTotal: "Grand Total",
    },
    actions: {
      edit: "Edit",
      printPdf: "Print / Save as PDF",
    },
    states: {
      detailForbidden: "You do not have permission to view quotations.",
      unknownCompany: "Unknown Company",
      noLineItems: "No line items found.",
      notApplied: "Not applied",
    },
    depositInvoice: {
      alreadyCreated: "Deposit invoice already created:",
      openFromInvoices: "Open it from the Invoices list.",
    },
    billingAuthority: {
      activeAbsTitle: "Active approved scope governs billing",
      activeAbsNotice:
        "The active approved scope is the billing authority. This Quotation total is shown for reference only; Invoice actions are managed from Service billing.",
      historicalTitle: "Quotation billing fallback is blocked",
      historicalNotice:
        "Historical approved-scope records exist without an active scope. This Quotation cannot become live billing authority, and no Invoice actions are available here.",
      legacyTitle: "Legacy Quotation authority is verified",
      legacyNotice:
        "Zero approved-scope history is proven for the linked Service. This approved Quotation remains legacy billing authority; Invoice actions are managed from Service billing.",
      noAuthorityTitle: "No billing authority is available",
      noAuthorityNotice:
        "The linked Service has no usable approved billing authority. No Invoice actions are available here.",
      unavailableTitle: "Billing authority is unavailable",
      unavailableNotice:
        "Billing authority could not be verified safely. No financial values or Invoice actions are inferred from this Quotation.",
      differentQuotationNotice:
        "This Quotation is not the canonical source Quotation for current Service billing.",
      sourceQuotationTotal: "Source Quotation total (reference)",
      billingCeiling: "Authoritative billing ceiling",
      invoiceExposure: "Service-lifetime Invoice exposure",
      remainingBillable: "Remaining billable",
      amountUnavailable: "Amount unavailable",
      fullyAllocated: "Fully allocated",
      openServiceBilling: "Open Service billing",
    },
    vatWithRate: "VAT ({rate}%)",
  },
  statuses: {
    draft: "Draft",
    sent: "Sent",
    approved: "Approved",
    rejected: "Rejected",
    expired: "Expired",
  },
  approval: {
    approve: "Approve Quotation",
    reject: "Reject Quotation",
    approveFailed: "Failed to approve quotation",
    rejectFailed: "Failed to reject quotation",
    unexpectedError: "An unexpected error occurred",
  },
  editStates: {
    notFound: "Quotation Not Found",
    notFoundMessage: "The quotation you are trying to edit does not exist or has been deleted.",
    locked: "Locked",
    lockedMessage: "Only draft quotations can be edited.",
    serviceContextRequired: "Service Context Required",
    serviceContextMessage: "This quotation cannot be edited until its Service relationship is available.",
    backToQuotations: "Back to Quotations",
  },
};

const quotationsDictionaryAr: QuotationsDictionary = {
  locale: "ar",
  states: {
    accessDenied: "تم رفض الوصول",
    genericError: "حدث خطأ ما",
    quotationsForbidden: "ليس لديك صلاحية لعرض وحدة عروض الأسعار.",
    quotationsLoadError: "بيانات عروض الأسعار غير متاحة في الوقت الحالي. يرجى المحاولة مرة أخرى لاحقًا.",
    createForbidden: "ليس لديك صلاحية لإنشاء عروض أسعار.",
    createDataLoadError: "تعذر تحميل البيانات المطلوبة في الوقت الحالي. يرجى المحاولة مرة أخرى لاحقًا.",
    selectServiceTitle: "اختر خدمة أولًا",
    selectServiceMessage: "يجب إنشاء عروض الأسعار من خدمة نشطة.",
    selectedServiceForbidden: "ليس لديك صلاحية لعرض الخدمة المحددة.",
    selectedServiceLoadError: "تعذر تحميل الخدمة المحددة في الوقت الحالي. يرجى المحاولة مرة أخرى لاحقًا.",
    serviceUnavailableTitle: "الخدمة غير متاحة",
    serviceUnavailableMessage: "الخدمة المحددة غير موجودة أو لم تعد متاحة.",
    creationLockedTitle: "إنشاء عرض السعر غير متاح",
    creationLockedMessage: "يمكن إنشاء عروض الأسعار فقط للخدمات التي حالتها استفسار أو تم تقديم عرض سعر.",
  },
  actions: {
    goToServices: "الانتقال إلى الخدمات",
    backToServices: "العودة إلى الخدمات",
    backToService: "العودة إلى الخدمة",
    backToDashboard: "العودة إلى لوحة التحكم",
  },
  list: {
    title: "عروض الأسعار",
    subtitle: "إدارة عروض العملاء وتقديرات الفعاليات وحالات الاعتماد.",
    selectService: "اختر خدمة",
    allStatuses: "كل الحالات",
    showingZero: "عرض 0 من 0 من عروض الأسعار",
    showingRange: "عرض {start}-{end} من {count} من عروض الأسعار",
    noQuotations: "لم يتم العثور على عروض أسعار",
    noFilteredQuotations: "لا توجد عروض أسعار مطابقة للفلاتر الحالية",
    unknownCompany: "جهة غير معروفة",
    selector: {
      title: "اختر خدمة مؤهلة",
      description: "اختر خدمة للمتابعة إلى نموذج عرض السعر الحالي.",
      searchPlaceholder: "ابحث في الخدمات والعملاء وتفاصيل الفعالية أو المواقع",
      service: "الخدمة",
      customer: "العميل",
      eventDate: "تاريخ الخدمة",
      location: "الموقع",
      select: "اختيار",
      resultsCount: "عرض {count} من الخدمات المؤهلة",
      noEligibleServices: "لا توجد خدمات مؤهلة متاحة لإنشاء عرض سعر.",
      noSearchResults: "لا توجد خدمات مؤهلة مطابقة لبحثك.",
      close: "إغلاق محدد الخدمة",
      navigationPending: "جارٍ فتح نموذج عرض السعر…",
    },
    table: {
      quotationNumber: "رقم عرض السعر",
      clientEvent: "العميل / الفعالية",
      issueDate: "تاريخ الإصدار",
      amountSar: "القيمة (SAR)",
      status: "الحالة",
      printPdf: "طباعة / PDF",
      actions: "الإجراءات",
    },
    actionTitles: {
      viewDetails: "عرض التفاصيل",
      editQuotation: "تعديل عرض السعر",
      onlyDraftEditable: "يمكن تعديل عروض الأسعار المسودة فقط",
      approvedCannotDelete: "لا يمكن حذف عروض الأسعار المعتمدة",
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
    lineItems: "بنود عرض السعر",
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
  detail: {
    sections: {
      details: "تفاصيل عرض السعر",
      lineItems: "بنود عرض السعر",
      financialSummary: "الملخص المالي",
      depositInvoice: "فاتورة دفعة مقدمة",
      billingAuthority: "مرجعية الفوترة",
    },
    labels: {
      client: "العميل",
      eventName: "اسم الفعالية",
      issueDate: "تاريخ الإصدار",
      validUntil: "صالح حتى",
      service: "الخدمة",
      qty: "الكمية",
      unitSar: "سعر الوحدة (SAR)",
      totalSar: "إجمالي البند (SAR)",
      subtotal: "المجموع الفرعي",
      discount: "الخصم",
      taxVat: "الضريبة/ضريبة القيمة المضافة",
      grandTotal: "الإجمالي",
    },
    actions: {
      edit: "تعديل",
      printPdf: "طباعة / حفظ كملف PDF",
    },
    states: {
      detailForbidden: "ليس لديك صلاحية لعرض عروض الأسعار.",
      unknownCompany: "جهة غير معروفة",
      noLineItems: "لا توجد بنود لعرض السعر.",
      notApplied: "غير مطبق",
    },
    depositInvoice: {
      alreadyCreated: "تم إنشاء فاتورة دفعة مقدمة بالفعل:",
      openFromInvoices: "افتحها من قائمة الفواتير.",
    },
    billingAuthority: {
      activeAbsTitle: "نطاق الفوترة المعتمد النشط هو المرجع",
      activeAbsNotice:
        "نطاق الفوترة المعتمد النشط هو مرجعية الفوترة. يظهر إجمالي عرض السعر للمرجعية فقط، وتُدار إجراءات الفواتير من فوترة الخدمة.",
      historicalTitle: "تم حظر الرجوع إلى عرض السعر للفوترة",
      historicalNotice:
        "توجد سجلات سابقة لنطاق فوترة معتمد من دون نطاق نشط. لا يمكن أن يصبح عرض السعر مرجعية فوترة حالية، ولا تتوفر إجراءات فواتير هنا.",
      legacyTitle: "تم التحقق من مرجعية عرض السعر القديمة",
      legacyNotice:
        "تم التحقق من عدم وجود أي سجل لنطاق فوترة معتمد للخدمة المرتبطة. يظل عرض السعر المعتمد مرجعية الفوترة القديمة، وتُدار إجراءات الفواتير من فوترة الخدمة.",
      noAuthorityTitle: "لا توجد مرجعية فوترة متاحة",
      noAuthorityNotice:
        "لا توجد للخدمة المرتبطة مرجعية فوترة معتمدة قابلة للاستخدام. لا تتوفر إجراءات فواتير هنا.",
      unavailableTitle: "مرجعية الفوترة غير متاحة",
      unavailableNotice:
        "تعذر التحقق من مرجعية الفوترة بأمان. لا يتم استنتاج أي مبالغ أو إجراءات فواتير من عرض السعر هذا.",
      differentQuotationNotice:
        "عرض السعر هذا ليس عرض السعر المصدر المعتمد لفوترة الخدمة الحالية.",
      sourceQuotationTotal: "إجمالي عرض السعر المصدر (للمرجعية)",
      billingCeiling: "سقف الفوترة المعتمد",
      invoiceExposure: "إجمالي تعرض فواتير الخدمة",
      remainingBillable: "المتبقي للفوترة",
      amountUnavailable: "المبلغ غير متاح",
      fullyAllocated: "مخصص بالكامل",
      openServiceBilling: "فتح فوترة الخدمة",
    },
    vatWithRate: "ضريبة القيمة المضافة ({rate}%)",
  },
  statuses: {
    draft: "مسودة",
    sent: "مُرسل",
    approved: "معتمد",
    rejected: "مرفوض",
    expired: "منتهي الصلاحية",
  },
  approval: {
    approve: "اعتماد عرض السعر",
    reject: "رفض عرض السعر",
    approveFailed: "تعذر اعتماد عرض السعر",
    rejectFailed: "تعذر رفض عرض السعر",
    unexpectedError: "حدث خطأ غير متوقع",
  },
  editStates: {
    notFound: "عرض السعر غير موجود",
    notFoundMessage: "عرض السعر الذي تحاول تعديله غير موجود أو تم حذفه.",
    locked: "مقفل",
    lockedMessage: "يمكن تعديل عروض الأسعار المسودة فقط.",
    serviceContextRequired: "سياق الخدمة مطلوب",
    serviceContextMessage: "لا يمكن تعديل عرض السعر حتى تتوفر علاقته بالخدمة.",
    backToQuotations: "العودة إلى عروض الأسعار",
  },
};

const quotationsDictionaries: Record<Locale, QuotationsDictionary> = {
  en: quotationsDictionaryEn,
  ar: quotationsDictionaryAr,
};

export function getQuotationsDictionary(locale: Locale): QuotationsDictionary {
  return quotationsDictionaries[locale];
}

export function getQuotationStatusLabel(locale: Locale, status: QuotationStatus): string {
  const activeDictionary = getQuotationsDictionary(locale);
  const englishDictionary = getQuotationsDictionary("en");
  const key = `statuses.${status}`;

  return resolveDictionaryValue({
    activeValue: activeDictionary.statuses[status],
    category: "label",
    englishValue: englishDictionary.statuses[status],
    key,
    locale,
    namespace: "quotations",
    surface: "quotation-status",
  });
}
