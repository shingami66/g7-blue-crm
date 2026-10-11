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
    searchPlaceholder: string;
    searchModeLabel: string;
    resetFilters: string;
    searchModes: {
      quotationNumber: string;
      customer: string;
      service: string;
    };
    searchPlaceholders: {
      quotationNumber: string;
      customer: string;
      service: string;
    };
    allStatuses: string;
    dateFilter: {
      label: string;
      anyMonth: string;
    };
    showingZero: string;
    showingRange: string;
    noQuotations: string;
    noFilteredQuotations: string;
    unknownCompany: string;
    navigationPending: string;
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
      view: string;
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
    discountType: string;
    fixedAmount: string;
    fixedAmountSar: string;
    percentage: string;
    percentagePercent: string;
    discountAmountSar: string;
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
      discountPercentageInvalid: string;
      failedToUpdate: string;
      failedToCreate: string;
      mutationKeyConflict: string;
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
  amendment: {
    label: string;
    current: string;
    superseded: string;
    revision: string;
    predecessor: string;
    successor: string;
    internalReason: string;
    currentAmount: string;
    proposedAmount: string;
    delta: string;
    originalActiveNotice: string;
    createAction: string;
    openAction: string;
    createTitle: string;
    createDescription: string;
    reasonLabel: string;
    reasonPlaceholder: string;
    reasonRequired: string;
    cancel: string;
    continue: string;
    workspaceTitle: string;
    workspaceSubtitle: string;
    builderTitle: string;
    modeItemized: string;
    modePackage: string;
    modeMixed: string;
    lineItemLabel: string;
    authorityLine: string;
    included: string;
    optional: string;
    selected: string;
    notSelected: string;
    includeInQuotation: string;
    addAuthorityLine: string;
    addIncluded: string;
    addOptional: string;
    removeLine: string;
    descriptionAr: string;
    unit: string;
    unitPrice: string;
    validityHintWithServiceStart: string;
    validityHintWithoutServiceStart: string;
    validUntilBeforeIssueDate: string;
    validUntilAfterServiceStart: string;
    issueDateRequired: string;
    issueDateAfterServiceStart: string;
    lineDescriptionRequired: string;
    unitPriceInvalid: string;
    validationRequired: string;
    domainErrors: {
      invalid_validity_window: string;
      invalid_input: string;
      quotation_amendment_draft_ineligible: string;
      quotation_amendment_draft_concurrency_conflict: string;
      quotation_not_current_approved: string;
      quotation_service_lifecycle_ineligible: string;
      invalid_commercial_hierarchy: string;
      discount_exceeds_subtotal: string;
      commercial_draft_update_failed: string;
    };
    saveDraft: string;
    savingDraft: string;
    savedDraft: string;
    saveFailed: string;
    unsavedChanges: string;
    summaryTitle: string;
    noChanges: string;
    changesPresent: string;
    addedLines: string;
    removedLines: string;
    changedLines: string;
    optionalChanges: string;
    approveAction: string;
    approveTitle: string;
    approveDescription: string;
    approveWarning: string;
    approveConfirm: string;
    approvalFailed: string;
    belowExposure: string;
    sourceActiveUntilApproval: string;
    priorInvoicesUnchanged: string;
    noOpDisabled: string;
    reloadRequired: string;
    workspaceNotFound: string;
    workspaceLocked: string;
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
    selectServiceTitle: "Select an Event First",
    selectServiceMessage: "Quotations must be created from an active Event.",
    selectedServiceForbidden: "You don't have permission to view the selected Event.",
    selectedServiceLoadError: "We couldn't load the selected Event at this time. Please try again later.",
    serviceUnavailableTitle: "Event Not Available",
    serviceUnavailableMessage: "The selected Event does not exist or is no longer available.",
    creationLockedTitle: "Quotation Creation Locked",
    creationLockedMessage: "Quotations can only be created for Events in Inquiry or Quoted status.",
  },
  actions: {
    goToServices: "Go to Events",
    backToServices: "Back to Events",
    backToService: "Back to Event",
    backToDashboard: "Back to Dashboard",
  },
  list: {
    title: "Quotations",
    subtitle: "Manage client proposals, event estimates, and approvals.",
    selectService: "Select Event",
    searchPlaceholder: "Search quotation, event, customer, or status",
    searchModeLabel: "Search quotations by",
    resetFilters: "Reset filters",
    searchModes: { quotationNumber: "Quotation Number", customer: "Customer", service: "Event" },
    searchPlaceholders: {
      quotationNumber: "Search quotation number",
      customer: "Search customer name",
      service: "Search Event Reference or Event Record Title",
    },
    allStatuses: "All Statuses",
    dateFilter: { label: "Issue date", anyMonth: "Any issue month" },
    showingZero: "Showing 0 of 0 quotations",
    showingRange: "Showing {start}-{end} of {count} quotations",
    noQuotations: "No quotations found.",
    noFilteredQuotations: "No quotations match the current filters.",
    unknownCompany: "Unknown Company",
    navigationPending: "Opening quotation…",
    selector: {
      title: "Select an eligible Event",
      description: "Choose an Event to continue to the existing quotation form.",
      searchPlaceholder: "Search Events, customers, event details, or locations",
      service: "Event Reference",
      customer: "Customer",
      eventDate: "Event date",
      location: "Location",
      select: "Select",
      resultsCount: "Showing {count} eligible Events",
      noEligibleServices: "No eligible Events are available for quotation creation.",
      noSearchResults: "No eligible Events match your search.",
      close: "Close Event selector",
      navigationPending: "Opening quotation form…",
    },
    table: {
      quotationNumber: "Quotation Number",
      clientEvent: "Client / Event",
      issueDate: "Issue Date",
      amountSar: "Amount (SAR)",
      status: "Status",
      view: "View",
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
    newSubtitle: "Create a new quotation for an Event.",
    basicDetails: "Basic Details",
    service: "Event Reference",
    serviceTitle: "Event Record Title",
    status: "Status",
    customer: "Customer",
    unknownCustomer: "Unknown Customer",
    serviceSchedule: "Event Schedule",
    startDate: "Start Date",
    endDate: "End Date",
    notSet: "Not set",
    quotationEventLabel: "Quotation / Event Label",
    quotationEventPlaceholder: "e.g. Annual Tech Conference 2026",
    documentDatesRates: "Quotation Document Dates & Rates",
    issueDate: "Issue Date",
    issueDateHint: "Issue Date is the quotation document date. Event execution dates are shown in Event Schedule.",
    validUntil: "Valid Until",
    validUntilHint: "Offer expiry date - not related to Event execution dates.",
    discountSar: "Discount (SAR)",
    discountType: "Discount type",
    fixedAmount: "Fixed amount",
    fixedAmountSar: "Fixed amount (SAR)",
    percentage: "Percentage",
    percentagePercent: "Percentage (%)",
    discountAmountSar: "Discount amount (SAR)",
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
      serviceAlreadyStarted: "Cannot create a quotation because the Event has already started.",
      validUntilRequired: "Please select a valid until date.",
      validUntilBeforeIssueDate: "Valid until date must be on or after the quotation date.",
      validUntilAfterServiceStart: "Quotation cannot remain valid after the Event begins.",
      invalidItems: "All items must have a description, positive quantity, and non-negative unit price.",
      discountExceedsSubtotal: "Discount cannot exceed subtotal. Reduce the discount or adjust line items.",
      discountPercentageInvalid: "Enter a discount percentage from 0 to 100 with up to two decimal places.",
      failedToUpdate: "Failed to update quotation.",
      failedToCreate: "Failed to create quotation.",
      mutationKeyConflict:
        "A Quotation creation attempt with these request details already exists. Start a new Quotation creation attempt and try again.",
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
        "The active approved scope is the billing authority. This Quotation total is shown for reference only; Invoice actions are managed from Event billing.",
      historicalTitle: "Quotation billing fallback is blocked",
      historicalNotice:
        "Historical approved-scope records exist without an active scope. This Quotation cannot become live billing authority, and no Invoice actions are available here.",
      legacyTitle: "Legacy Quotation authority is verified",
      legacyNotice:
        "Zero approved-scope history is proven for the linked Event. This approved Quotation remains legacy billing authority; Invoice actions are managed from Event billing.",
      noAuthorityTitle: "No billing authority is available",
      noAuthorityNotice:
        "The linked Event has no usable approved billing authority. No Invoice actions are available here.",
      unavailableTitle: "Billing authority is unavailable",
      unavailableNotice:
        "Billing authority could not be verified safely. No financial values or Invoice actions are inferred from this Quotation.",
      differentQuotationNotice:
        "This Quotation is not the canonical source Quotation for current Event billing.",
      sourceQuotationTotal: "Source Quotation total (reference)",
      billingCeiling: "Authoritative billing ceiling",
      invoiceExposure: "Event-lifetime Invoice exposure",
      remainingBillable: "Remaining billable",
      amountUnavailable: "Amount unavailable",
      fullyAllocated: "Fully allocated",
      openServiceBilling: "Open Event billing",
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
    serviceContextRequired: "Event Context Required",
    serviceContextMessage: "This quotation cannot be edited until its Event relationship is available.",
    backToQuotations: "Back to Quotations",
  },
  amendment: {
    label: "Commercial Amendment",
    current: "Current",
    superseded: "Superseded",
    revision: "Revision {number}",
    predecessor: "Predecessor",
    successor: "Successor",
    internalReason: "Internal reason",
    currentAmount: "Current approved amount",
    proposedAmount: "Proposed amount",
    delta: "Change",
    originalActiveNotice: "The current approved quotation remains active until the customer-approved amendment is activated. Creating or editing this Draft does not change the active billing authority or invoices.",
    createAction: "Create Commercial Amendment",
    openAction: "Open Commercial Amendment",
    createTitle: "Create Commercial Amendment",
    createDescription: "Create a successor Draft for a bounded commercial change. The current approved quotation remains active until final approval.",
    reasonLabel: "Reason for amendment",
    reasonPlaceholder: "Describe the bounded customer-facing change",
    reasonRequired: "Enter a reason before continuing.",
    cancel: "Cancel",
    continue: "Create Draft",
    workspaceTitle: "Commercial Amendment Workspace",
    workspaceSubtitle: "Edit the complete proposed commercial snapshot, review the change summary, then confirm customer approval.",
    builderTitle: "Proposed commercial structure",
    modeItemized: "Standalone items",
    modePackage: "Package",
    modeMixed: "Mixed items",
    lineItemLabel: "Line item",
    authorityLine: "Main item",
    included: "Included",
    optional: "Optional",
    selected: "Included in quotation",
    notSelected: "Not included in quotation",
    includeInQuotation: "Include in quotation",
    addAuthorityLine: "Add main item",
    addIncluded: "Add included component",
    addOptional: "Add optional item",
    removeLine: "Remove line",
    descriptionAr: "Arabic description",
    unit: "Unit",
    unitPrice: "Unit price (SAR)",
    validityHintWithServiceStart: "Valid Until must be on or after Issue Date and no later than the Event start date recorded for this quotation.",
    validityHintWithoutServiceStart: "Valid Until must be on or after Issue Date. The server will validate any Event date restriction.",
    validUntilBeforeIssueDate: "Valid Until must be on or after Issue Date.",
    validUntilAfterServiceStart: "Valid Until cannot be after the recorded Event start date.",
    issueDateRequired: "Choose an Issue Date.",
    issueDateAfterServiceStart: "Issue Date cannot be after the recorded Event start date.",
    lineDescriptionRequired: "Enter a description for this item before saving the Draft.",
    unitPriceInvalid: "Enter a valid unit price of zero or more.",
    validationRequired: "Correct the highlighted fields before saving the Draft.",
    domainErrors: {
      invalid_validity_window: "The quotation validity dates are not allowed for this Event.",
      invalid_input: "Some amendment details are invalid. Review the fields and try again.",
      quotation_amendment_draft_ineligible: "This amendment Draft is no longer eligible for editing.",
      quotation_amendment_draft_concurrency_conflict: "This Draft changed elsewhere. Reload the workspace before saving.",
      quotation_not_current_approved: "The original quotation is no longer the current approved authority.",
      quotation_service_lifecycle_ineligible: "This Event is no longer eligible for a Commercial Amendment.",
      invalid_commercial_hierarchy: "The commercial structure is invalid. Check the main items and their components.",
      discount_exceeds_subtotal: "The discount cannot exceed the proposed subtotal.",
      commercial_draft_update_failed: "The amendment Draft could not be saved. No changes were made.",
    },
    saveDraft: "Save Draft",
    savingDraft: "Saving…",
    savedDraft: "Draft saved",
    saveFailed: "Draft was not saved.",
    unsavedChanges: "You have unsaved changes.",
    summaryTitle: "Review changes",
    noChanges: "No commercial changes detected. Approval remains disabled.",
    changesPresent: "Informational comparison only; the server is the final financial authority.",
    addedLines: "Added lines",
    removedLines: "Removed lines",
    changedLines: "Changed lines",
    optionalChanges: "Optional selection changes",
    approveAction: "Confirm Customer Approval & Activate Amendment",
    approveTitle: "Activate this commercial amendment?",
    approveDescription: "This replaces the current approved commercial authority for future billing.",
    approveWarning: "The current approved quotation will be superseded only after this confirmation. Prior invoices remain unchanged.",
    approveConfirm: "Confirm Customer Approval & Activate Amendment",
    approvalFailed: "The amendment was not activated.",
    belowExposure: "The proposed amount cannot be below Event-lifetime invoiced exposure.",
    sourceActiveUntilApproval: "Current quotation remains active until approval.",
    priorInvoicesUnchanged: "Prior invoices are unchanged.",
    noOpDisabled: "Make and save a commercial change before approval.",
    reloadRequired: "This Draft changed elsewhere. Reload the workspace before saving.",
    workspaceNotFound: "Commercial amendment workspace not found.",
    workspaceLocked: "Only an eligible Commercial Amendment Draft can be edited.",
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
    selectServiceTitle: "اختر فعالية أولًا",
    selectServiceMessage: "يجب إنشاء عروض الأسعار من فعالية نشطة.",
    selectedServiceForbidden: "ليس لديك صلاحية لعرض الفعالية المحددة.",
    selectedServiceLoadError: "تعذر تحميل الفعالية المحددة في الوقت الحالي. يرجى المحاولة مرة أخرى لاحقًا.",
    serviceUnavailableTitle: "الفعالية غير متاحة",
    serviceUnavailableMessage: "الفعالية المحددة غير موجودة أو لم تعد متاحة.",
    creationLockedTitle: "إنشاء عرض السعر غير متاح",
    creationLockedMessage: "يمكن إنشاء عروض الأسعار فقط للفعاليات التي حالتها استفسار أو تم تقديم عرض سعر.",
  },
  actions: {
    goToServices: "الانتقال إلى الفعاليات",
    backToServices: "العودة إلى الفعاليات",
    backToService: "العودة إلى الفعالية",
    backToDashboard: "العودة إلى لوحة التحكم",
  },
  list: {
    title: "عروض الأسعار",
    subtitle: "إدارة عروض العملاء وتقديرات الفعاليات وحالات الاعتماد.",
    selectService: "اختر فعالية",
    searchPlaceholder: "ابحث عن عرض السعر أو الفعالية أو العميل",
    searchModeLabel: "البحث في عروض الأسعار حسب",
    resetFilters: "إعادة ضبط الفلاتر",
    searchModes: { quotationNumber: "رقم عرض السعر", customer: "العميل", service: "الفعالية" },
    searchPlaceholders: {
      quotationNumber: "ابحث عن رقم عرض السعر",
      customer: "ابحث عن اسم العميل",
      service: "ابحث عن مرجع الفعالية أو عنوان سجل الفعالية",
    },
    allStatuses: "كل الحالات",
    dateFilter: { label: "تاريخ الإصدار", anyMonth: "كل أشهر الإصدار" },
    showingZero: "عرض 0 من 0 من عروض الأسعار",
    showingRange: "عرض {start}-{end} من {count} من عروض الأسعار",
    noQuotations: "لم يتم العثور على عروض أسعار",
    noFilteredQuotations: "لا توجد عروض أسعار مطابقة للفلاتر الحالية",
    unknownCompany: "جهة غير معروفة",
    navigationPending: "جارٍ فتح عرض السعر…",
    selector: {
      title: "اختر فعالية مؤهلة",
      description: "اختر فعالية للمتابعة إلى نموذج عرض السعر الحالي.",
      searchPlaceholder: "ابحث في الفعاليات والعملاء وتفاصيل الفعالية أو المواقع",
      service: "مرجع الفعالية",
      customer: "العميل",
      eventDate: "تاريخ الفعالية",
      location: "الموقع",
      select: "اختيار",
      resultsCount: "عرض {count} من الفعاليات المؤهلة",
      noEligibleServices: "لا توجد فعاليات مؤهلة متاحة لإنشاء عرض سعر.",
      noSearchResults: "لا توجد فعاليات مؤهلة مطابقة لبحثك.",
      close: "إغلاق محدد الفعالية",
      navigationPending: "جارٍ فتح نموذج عرض السعر…",
    },
    table: {
      quotationNumber: "رقم عرض السعر",
      clientEvent: "العميل / الفعالية",
      issueDate: "تاريخ الإصدار",
      amountSar: "القيمة (SAR)",
      status: "الحالة",
      view: "عرض",
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
    newSubtitle: "إنشاء عرض سعر جديد مرتبط بفعالية.",
    basicDetails: "التفاصيل الأساسية",
    service: "مرجع الفعالية",
    serviceTitle: "عنوان سجل الفعالية",
    status: "الحالة",
    customer: "العميل",
    unknownCustomer: "عميل غير معروف",
    serviceSchedule: "جدول الفعالية",
    startDate: "تاريخ البداية",
    endDate: "تاريخ النهاية",
    notSet: "غير محدد",
    quotationEventLabel: "عنوان عرض السعر / الفعالية",
    quotationEventPlaceholder: "مثال: المؤتمر التقني السنوي 2026",
    documentDatesRates: "تواريخ وأسعار عرض السعر",
    issueDate: "تاريخ الإصدار",
    issueDateHint: "تاريخ الإصدار هو تاريخ مستند عرض السعر. تواريخ تنفيذ الفعالية تظهر ضمن جدول الفعالية.",
    validUntil: "صالح حتى",
    validUntilHint: "تاريخ انتهاء العرض، ولا يرتبط بتواريخ تنفيذ الفعالية.",
    discountSar: "الخصم (SAR)",
    discountType: "نوع الخصم",
    fixedAmount: "مبلغ ثابت",
    fixedAmountSar: "مبلغ ثابت (ريال سعودي)",
    percentage: "نسبة مئوية",
    percentagePercent: "نسبة الخصم (%)",
    discountAmountSar: "قيمة الخصم (ريال سعودي)",
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
      serviceAlreadyStarted: "لا يمكن إنشاء عرض سعر لأن الفعالية بدأت بالفعل.",
      validUntilRequired: "يرجى اختيار تاريخ صالح حتى.",
      validUntilBeforeIssueDate: "يجب أن يكون تاريخ صالح حتى في تاريخ عرض السعر أو بعده.",
      validUntilAfterServiceStart: "لا يمكن أن يظل عرض السعر صالحًا بعد بدء الفعالية.",
      invalidItems: "يجب أن تحتوي جميع البنود على وصف وكمية موجبة وسعر وحدة غير سالب.",
      discountExceedsSubtotal: "لا يمكن أن يتجاوز الخصم المجموع الفرعي. قلل قيمة الخصم أو عدل البنود.",
      discountPercentageInvalid: "أدخل نسبة خصم من 0 إلى 100 وبحد أقصى منزلتين عشريتين.",
      failedToUpdate: "تعذر تحديث عرض السعر.",
      failedToCreate: "تعذر إنشاء عرض السعر.",
      mutationKeyConflict:
        "توجد محاولة إنشاء عرض سعر مسبقة بتفاصيل مختلفة لنفس الطلب. يرجى بدء محاولة جديدة والمحاولة مرة أخرى.",
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
        "نطاق الفوترة المعتمد النشط هو مرجعية الفوترة. يظهر إجمالي عرض السعر للمرجعية فقط، وتُدار إجراءات الفواتير من فوترة الفعالية.",
      historicalTitle: "تم حظر الرجوع إلى عرض السعر للفوترة",
      historicalNotice:
        "توجد سجلات سابقة لنطاق فوترة معتمد من دون نطاق نشط. لا يمكن أن يصبح عرض السعر مرجعية فوترة حالية، ولا تتوفر إجراءات فواتير هنا.",
      legacyTitle: "تم التحقق من مرجعية عرض السعر القديمة",
      legacyNotice:
        "تم التحقق من عدم وجود أي سجل لنطاق فوترة معتمد للفعالية المرتبطة. يظل عرض السعر المعتمد مرجعية الفوترة القديمة، وتُدار إجراءات الفواتير من فوترة الفعالية.",
      noAuthorityTitle: "لا توجد مرجعية فوترة متاحة",
      noAuthorityNotice:
        "لا توجد للفعالية المرتبطة مرجعية فوترة معتمدة قابلة للاستخدام. لا تتوفر إجراءات فواتير هنا.",
      unavailableTitle: "مرجعية الفوترة غير متاحة",
      unavailableNotice:
        "تعذر التحقق من مرجعية الفوترة بأمان. لا يتم استنتاج أي مبالغ أو إجراءات فواتير من عرض السعر هذا.",
      differentQuotationNotice:
        "عرض السعر هذا ليس عرض السعر المصدر المعتمد لفوترة الفعالية الحالية.",
      sourceQuotationTotal: "إجمالي عرض السعر المصدر (للمرجعية)",
      billingCeiling: "سقف الفوترة المعتمد",
      invoiceExposure: "إجمالي تعرض فواتير الفعالية",
      remainingBillable: "المتبقي للفوترة",
      amountUnavailable: "المبلغ غير متاح",
      fullyAllocated: "مخصص بالكامل",
      openServiceBilling: "فتح فوترة الفعالية",
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
    serviceContextRequired: "سياق الفعالية مطلوب",
    serviceContextMessage: "لا يمكن تعديل عرض السعر حتى تتوفر علاقته بالفعالية.",
    backToQuotations: "العودة إلى عروض الأسعار",
  },
  amendment: {
    label: "تعديل تجاري",
    current: "الحالي",
    superseded: "مستبدل",
    revision: "المراجعة {number}",
    predecessor: "السابق",
    successor: "اللاحق",
    internalReason: "السبب الداخلي",
    currentAmount: "القيمة المعتمدة الحالية",
    proposedAmount: "القيمة المقترحة",
    delta: "التغيير",
    originalActiveNotice: "يبقى عرض السعر المعتمد الحالي نشطًا حتى اعتماد تعديل العميل وتفعيله. إنشاء هذه المسودة أو تعديلها لا يغيّر مرجعية الفوترة النشطة أو الفواتير.",
    createAction: "إنشاء تعديل تجاري",
    openAction: "فتح التعديل التجاري",
    createTitle: "إنشاء تعديل تجاري",
    createDescription: "أنشئ مسودة لاحقة لتغيير تجاري محدود. يبقى عرض السعر المعتمد الحالي نشطًا حتى الاعتماد النهائي.",
    reasonLabel: "سبب التعديل",
    reasonPlaceholder: "صف التغيير المحدود الموجه للعميل",
    reasonRequired: "أدخل سببًا قبل المتابعة.",
    cancel: "إلغاء",
    continue: "إنشاء المسودة",
    workspaceTitle: "مساحة عمل التعديل التجاري",
    workspaceSubtitle: "عدّل اللقطة التجارية المقترحة كاملة، ثم راجع ملخص التغيير وأكد اعتماد العميل.",
    builderTitle: "الهيكل التجاري المقترح",
    modeItemized: "بنود مستقلة",
    modePackage: "حزمة",
    modeMixed: "بنود مختلطة",
    lineItemLabel: "بند عرض السعر",
    authorityLine: "البند الرئيسي",
    included: "مشمول",
    optional: "اختياري",
    selected: "مشمول في عرض السعر",
    notSelected: "غير مشمول في عرض السعر",
    includeInQuotation: "إدراج في عرض السعر",
    addAuthorityLine: "إضافة بند رئيسي",
    addIncluded: "إضافة مكوّن مشمول في البند الرئيسي",
    addOptional: "إضافة بند اختياري",
    removeLine: "إزالة البند",
    descriptionAr: "الوصف بالعربية",
    unit: "الوحدة",
    unitPrice: "سعر الوحدة (SAR)",
    validityHintWithServiceStart: "يجب أن يكون تاريخ «صالح حتى» في تاريخ الإصدار أو بعده، وألا يتجاوز تاريخ بدء الفعالية المسجل.",
    validityHintWithoutServiceStart: "يجب أن يكون تاريخ «صالح حتى» في تاريخ الإصدار أو بعده. يتحقق الخادم من أي قيد مرتبط بتاريخ الفعالية.",
    validUntilBeforeIssueDate: "يجب أن يكون تاريخ «صالح حتى» في تاريخ الإصدار أو بعده.",
    validUntilAfterServiceStart: "لا يجوز أن يتجاوز تاريخ «صالح حتى» تاريخ بدء الفعالية المسجل.",
    issueDateRequired: "اختر تاريخ الإصدار.",
    issueDateAfterServiceStart: "لا يمكن أن يكون تاريخ الإصدار بعد تاريخ بدء الفعالية المسجل.",
    lineDescriptionRequired: "أدخل وصفًا لهذا البند قبل حفظ المسودة.",
    unitPriceInvalid: "أدخل سعر وحدة صالحًا يساوي صفرًا أو أكثر.",
    validationRequired: "صحح الحقول المحددة قبل حفظ المسودة.",
    domainErrors: {
      invalid_validity_window: "تواريخ صلاحية عرض السعر غير مسموح بها لهذه الفعالية.",
      invalid_input: "بعض تفاصيل التعديل غير صالحة. راجع الحقول وحاول مرة أخرى.",
      quotation_amendment_draft_ineligible: "لم تعد مسودة التعديل مؤهلة للتحرير.",
      quotation_amendment_draft_concurrency_conflict: "تم تغيير هذه المسودة في مكان آخر. أعد تحميل مساحة العمل قبل الحفظ.",
      quotation_not_current_approved: "لم يعد عرض السعر الأصلي هو المرجعية المعتمدة الحالية.",
      quotation_service_lifecycle_ineligible: "لم تعد هذه الفعالية مؤهلة لتعديل تجاري.",
      invalid_commercial_hierarchy: "الهيكل التجاري غير صالح. راجع البنود الرئيسية ومكوناتها.",
      discount_exceeds_subtotal: "لا يجوز أن يتجاوز الخصم المجموع الفرعي المقترح.",
      commercial_draft_update_failed: "تعذر حفظ مسودة التعديل. لم يتم إجراء أي تغييرات.",
    },
    saveDraft: "حفظ المسودة",
    savingDraft: "جارٍ الحفظ…",
    savedDraft: "تم حفظ المسودة",
    saveFailed: "لم يتم حفظ المسودة.",
    unsavedChanges: "لديك تغييرات غير محفوظة.",
    summaryTitle: "مراجعة التغييرات",
    noChanges: "لم يتم اكتشاف تغييرات تجارية. يظل الاعتماد معطلًا.",
    changesPresent: "مقارنة إرشادية فقط؛ الخادم هو المرجع المالي النهائي.",
    addedLines: "البنود المضافة",
    removedLines: "البنود المحذوفة",
    changedLines: "البنود المتغيرة",
    optionalChanges: "تغييرات اختيارية البنود",
    approveAction: "تأكيد اعتماد العميل وتفعيل التعديل",
    approveTitle: "تفعيل هذا التعديل التجاري؟",
    approveDescription: "سيحل هذا محل المرجعية التجارية المعتمدة الحالية للفوترة المستقبلية.",
    approveWarning: "سيتم استبدال عرض السعر المعتمد الحالي بعد هذا التأكيد فقط. تبقى الفواتير السابقة دون تغيير.",
    approveConfirm: "تأكيد اعتماد العميل وتفعيل التعديل",
    approvalFailed: "لم يتم تفعيل التعديل.",
    belowExposure: "لا يمكن أن تكون القيمة المقترحة أقل من إجمالي تعرض فواتير الفعالية مدى الحياة.",
    sourceActiveUntilApproval: "يبقى عرض السعر الحالي نشطًا حتى الاعتماد.",
    priorInvoicesUnchanged: "الفواتير السابقة دون تغيير.",
    noOpDisabled: "أجرِ تغييرًا تجاريًا واحفظه قبل الاعتماد.",
    reloadRequired: "تم تغيير هذه المسودة في مكان آخر. أعد تحميل مساحة العمل قبل الحفظ.",
    workspaceNotFound: "مساحة التعديل التجاري غير موجودة.",
    workspaceLocked: "يمكن تعديل مسودة تعديل تجاري مؤهلة فقط.",
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
