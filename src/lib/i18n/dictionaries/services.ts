import type { Locale } from "../locales";
import type { ServiceStatus } from "../../../types/service";
import type { QuotationStatus } from "../../quotations/types";

export interface ServicesDictionary {
  locale: Locale;
  states: {
    accessDenied: string;
    genericError: string;
    servicesForbidden: string;
    servicesLoadError: string;
    createForbidden: string;
    editForbidden: string;
    serviceReadForbidden: string;
    serviceDataLoadError: string;
    noServices: string;
    noServicesFound: string;
    noFilteredServices: string;
    noPermissionToViewQuotations: string;
    noRelatedQuotations: string;
    unknownError: string;
  };
  list: {
    title: string;
    subtitle: string;
    newService: string;
    allStatuses: string;
    showingZero: string;
    showingRange: string;
    table: {
      serviceNumber: string;
      serviceTitle: string;
      customer: string;
      eventDate: string;
      status: string;
      budget: string;
    };
  };
  form: {
    newTitle: string;
    newSubtitle: string;
    editTitle: string;
    editSubtitle: string;
    basicDetails: string;
    eventInformation: string;
    eventInformationOptional: string;
    labels: {
      customer: string;
      serviceTitle: string;
      description: string;
      estimatedBudget: string;
      eventName: string;
      eventType: string;
      eventLocation: string;
      startDate: string;
      endDate: string;
    };
    placeholders: {
      customer: string;
      serviceTitle: string;
      description: string;
      estimatedBudget: string;
      eventName: string;
      eventType: string;
      eventLocation: string;
      unknownCustomer: string;
    };
    buttons: {
      cancel: string;
      create: string;
      saveChanges: string;
    };
    validation: {
      validActiveCustomer: string;
      serviceTitleRequired: string;
      startDateRequiredWhenEndDateSet: string;
      endDateBeforeStartDate: string;
      estimatedBudgetInvalid: string;
      estimatedBudgetNegative: string;
      failedToCreate: string;
      failedToUpdate: string;
      unexpectedError: string;
    };
  };
  detail: {
    backToServices: string;
    createQuotation: string;
    edit: string;
    quotationDisabledReasonStarted: string;
    sections: {
      serviceSchedule: string;
      customerSummary: string;
      operationalDetails: string;
      descriptionNotes: string;
    };
    labels: {
      eventName: string;
      eventType: string;
      startDate: string;
      endDate: string;
      location: string;
      customer: string;
      primaryContact: string;
      customerRef: string;
      estimatedBudget: string;
      createdAt: string;
      updatedAt: string;
      status: string;
    };
    fallbacks: {
      customerProfile: string;
      customerReferenceUnavailable: string;
      scheduleNotSet: string;
      empty: string;
    };
  };
  relatedQuotations: {
    title: string;
    subtitle: string;
    countSingular: string;
    countPlural: string;
    createQuotation: string;
    table: {
      quotation: string;
      status: string;
      issueDate: string;
      validUntil: string;
      grandTotal: string;
    };
  };
  serviceStatusControl: {
    title: string;
    currentStatus: string;
    terminalMessage: string;
    noActions: string;
    cancellationReason: string;
    cancellationPlaceholder: string;
    blockedActions: string;
    saving: string;
    failedToUpdate: string;
    updatedSuccessfully: string;
  };
  serviceStatusTimeline: {
    title: string;
    subtitle: string;
    cancelledTerminal: string;
    currentStatus: string;
    reached: string;
    pendingWorkflow: string;
    pending: string;
  };
  editPage: {
    blockedTitle: string;
    blockedMessage: string;
  };
  supplierAllocations: {
    title: string;
    tabs: {
      active: string;
      showDeleted: string;
    };
    actions: {
      newAllocation: string;
      edit: string;
      cancel: string;
      delete: string;
      restore: string;
    };
    empty: string;
    columns: {
      status: string;
      supplier: string;
      category: string;
      item: string;
      unit: string;
      qty: string;
      costSource: string;
      unitCost: string;
      totalCost: string;
      actions: string;
    };
    statusLabels: {
      draft: string;
      planned: string;
      selected: string;
      cancelled: string;
      deleted: string;
    };
    costSourceLabels: {
      manual: string;
      rateCard: string;
      quoted: string;
    };
    deletedRecord: string;
    selectedHint: string;
  };
  supplierBookings: {
    title: string;
    subtitle: string;
    empty: {
      noBookings: string;
      selectAllocation: string;
    };
    columns: {
      bookingNumber: string;
      status: string;
      supplier: string;
      item: string;
      qty: string;
      unitCost: string;
      totalCost: string;
      created: string;
      internalDetails: string;
      actions: string;
    };
    statusLabels: {
      draft: string;
      cancelled: string;
    };
    selectedAllocations: string;
    linkedBooking: string;
    locked: string;
    noPermission: string;
    details: {
      scope: string;
      notes: string;
      cancelled: string;
      noReason: string;
      empty: string;
    };
  };
  billing: {
    title: string;
    cards: {
      approvedQuotation: string;
      depositInvoice: string;
      finalInvoice: string;
      billingCalculation: string;
      noApprovedQuotationYet: string;
      noActiveDepositInvoice: string;
      noActiveFinalInvoice: string;
      priorInvoiced: string;
      remaining: string;
    };
    status: {
      title: string;
      depositInvoice: string;
      finalInvoice: string;
      created: string;
      available: string;
      notAvailable: string;
      nextAvailableAction: string;
      notes: string;
    };
    invoiceStatuses: {
      sent: string;
      draft: string;
      paid: string;
      partial: string;
      overdue: string;
      cancelled: string;
      voided: string;
    };
    disabledReasons: {
      approvedQuotationRequired: string;
      billingStateUnavailable: string;
      duplicateActiveDepositInvoices: string;
      duplicateActiveFinalInvoices: string;
      missingServiceId: string;
      depositInvoiceAlreadyExists: string;
      finalInvoiceAlreadyExists: string;
      priorInvoicesExceedQuotationTotal: string;
      quotationNotApproved: string;
      quotationServiceMismatch: string;
      unavailable: string;
    };
    depositAction: {
      unavailable: string;
      amountLabel: string;
      amountPlaceholder: string;
      create: string;
      validation: {
        validAmount: string;
        amountGreaterThanZero: string;
        amountCannotExceedQuotationTotal: string;
      };
      success: string;
      errors: {
        invalidInvoiceInput: string;
        depositAmountRequired: string;
        depositAmountExceedsQuotationTotal: string;
        depositInvoiceAlreadyExists: string;
        quotationNotFound: string;
        quotationNotApproved: string;
        quotationServiceMismatch: string;
        companySettingsUnavailable: string;
        invoiceSnapshotUnavailable: string;
        invoiceCreationFailed: string;
        unauthorized: string;
        forbidden: string;
        fallbackWithCode: string;
        fallback: string;
      };
    };
    finalAction: {
      unavailable: string;
      amountSummary: string;
      create: string;
      success: string;
      errors: {
        invalidInvoiceInput: string;
        finalInvoiceAlreadyExists: string;
        quotationNotFound: string;
        quotationNotApproved: string;
        quotationServiceMismatch: string;
        companySettingsUnavailable: string;
        invoiceSnapshotUnavailable: string;
        invoiceCreationFailed: string;
        unauthorized: string;
        forbidden: string;
        fallbackWithCode: string;
        fallback: string;
      };
    };
  };
  transitionCopy: {
    actions: Record<ServiceStatus, { label: string; description: string }>;
    blockedReasons: {
      noServiceQuotation: string;
      approveQuotationFirst: string;
      multipleApprovedQuotations: string;
      depositPaymentRequired: string;
      depositPaymentBeforeWork: string;
      unpaidInvoices: string;
      approvedQuotationRequiredForCompleted: string;
      remainingInvoiceRequired: string;
      financeCancellationRequired: string;
      unavailable: string;
      unableToVerifyQuotationEvidence: string;
      unableToVerifyInvoiceEvidence: string;
      unableToVerifyPaymentEvidence: string;
      alreadyStatus: string;
      terminalStatusCannotChange: string;
      transitionNotAllowed: string;
      cancellationReasonRequired: string;
    };
  };
  serviceStatuses: Record<ServiceStatus, string>;
  quotationStatuses: Record<QuotationStatus, string>;
}

const servicesDictionaryEn: ServicesDictionary = {
  locale: "en",
  states: {
    accessDenied: "Access Denied",
    genericError: "Something went wrong",
    servicesForbidden: "You don't have permission to view the services module.",
    servicesLoadError: "We couldn't load the services at this time. Please try again later.",
    createForbidden: "You don't have permission to create services.",
    editForbidden: "You do not have permission to edit services.",
    serviceReadForbidden: "You do not have permission to view services.",
    serviceDataLoadError: "We couldn't load the necessary data at this time. Please try again later.",
    noServices: "No services yet. Create your first service to get started.",
    noServicesFound: "No services found.",
    noFilteredServices: "No services match the selected filters.",
    noPermissionToViewQuotations: "You do not have permission to view related quotations.",
    noRelatedQuotations: "No quotations are linked to this service yet.",
    unknownError: "Unknown error",
  },
  list: {
    title: "Services",
    subtitle: "Manage client services, event bookings, and operational workflow.",
    newService: "New Service",
    allStatuses: "All Statuses",
    showingZero: "Showing 0 of 0 services",
    showingRange: "Showing {start}-{end} of {total} services",
    table: {
      serviceNumber: "Service Number",
      serviceTitle: "Service Title / Event Name",
      customer: "Customer",
      eventDate: "Event Date",
      status: "Status",
      budget: "Budget",
    },
  },
  form: {
    newTitle: "New Service",
    newSubtitle: "Create a new service or event booking.",
    editTitle: "Edit Service",
    editSubtitle: "Update service details.",
    basicDetails: "Basic Details",
    eventInformation: "Event Information",
    eventInformationOptional: "Event Information (Optional)",
    labels: {
      customer: "Customer",
      serviceTitle: "Service Title",
      description: "Description",
      estimatedBudget: "Estimated Budget (SAR)",
      eventName: "Event Name",
      eventType: "Event Type",
      eventLocation: "Event Location",
      startDate: "Start Date",
      endDate: "End Date",
    },
    placeholders: {
      customer: "Select a customer...",
      serviceTitle: "e.g. Wedding Photography, Corporate Setup",
      description: "Service details...",
      estimatedBudget: "0.00",
      eventName: "e.g. Annual Tech Conference 2026",
      eventType: "e.g. Wedding, Exhibition, Corporate",
      eventLocation: "Venue name or address",
      unknownCustomer: "Unknown",
    },
    buttons: {
      cancel: "Cancel",
      create: "Create Service",
      saveChanges: "Save Changes",
    },
    validation: {
      validActiveCustomer: "Please select a valid, active customer.",
      serviceTitleRequired: "Service title is required.",
      startDateRequiredWhenEndDateSet: "Event start date is required when end date is set.",
      endDateBeforeStartDate: "Event end date must not be before start date.",
      estimatedBudgetInvalid: "Estimated budget must be a valid number.",
      estimatedBudgetNegative: "Estimated budget must not be negative.",
      failedToCreate: "Failed to create service.",
      failedToUpdate: "Failed to update service.",
      unexpectedError: "An unexpected error occurred. Please try again.",
    },
  },
  detail: {
    backToServices: "Back to services",
    createQuotation: "Create Quotation",
    edit: "Edit",
    quotationDisabledReasonStarted: "Cannot create a quotation because the service has already started.",
    sections: {
      serviceSchedule: "Service Schedule",
      customerSummary: "Customer Summary",
      operationalDetails: "Operational Details",
      descriptionNotes: "Description / Notes",
    },
    labels: {
      eventName: "Event Name",
      eventType: "Event Type",
      startDate: "Start Date",
      endDate: "End Date",
      location: "Location",
      customer: "Customer",
      primaryContact: "Primary Contact",
      customerRef: "Customer Ref",
      estimatedBudget: "Estimated Budget",
      createdAt: "Created At",
      updatedAt: "Updated At",
      status: "Status",
    },
    fallbacks: {
      customerProfile: "Customer profile",
      customerReferenceUnavailable: "Customer reference unavailable",
      scheduleNotSet: "Schedule not set",
      empty: "—",
    },
  },
  relatedQuotations: {
    title: "Related Quotations",
    subtitle: "Service-scoped quotation records.",
    countSingular: "quotation",
    countPlural: "quotations",
    createQuotation: "Create Quotation",
    table: {
      quotation: "Quotation",
      status: "Status",
      issueDate: "Issue Date",
      validUntil: "Valid Until",
      grandTotal: "Grand Total",
    },
  },
  serviceStatusControl: {
    title: "Status Actions",
    currentStatus: "Current status",
    terminalMessage: "This Service is in a terminal status. No further status actions are available.",
    noActions: "No status action is currently available.",
    cancellationReason: "Cancellation Reason",
    cancellationPlaceholder: "Explain why this Service is being cancelled.",
    blockedActions: "Blocked Actions",
    saving: "Saving...",
    failedToUpdate: "Failed to update status",
    updatedSuccessfully: "Status updated successfully!",
  },
  serviceStatusTimeline: {
    title: "Service Status Timeline",
    subtitle: "Display-only workflow view. Status changes are controlled by guarded workflow actions.",
    cancelledTerminal: "Cancelled is terminal and non-linear.",
    currentStatus: "Current status",
    reached: "Reached",
    pendingWorkflow: "Pending workflow",
    pending: "Pending",
  },
  editPage: {
    blockedTitle: "Edit Blocked",
    blockedMessage: "Editing is not allowed when service status is {status}.",
  },
  supplierAllocations: {
    title: "Supplier Allocations",
    tabs: {
      active: "Active",
      showDeleted: "Show Deleted",
    },
    actions: {
      newAllocation: "New Allocation",
      edit: "Edit",
      cancel: "Cancel",
      delete: "Delete",
      restore: "Restore",
    },
    empty: "No supplier allocations recorded for this service yet.",
    columns: {
      status: "Status",
      supplier: "Supplier",
      category: "Category",
      item: "Item",
      unit: "Unit",
      qty: "Qty",
      costSource: "Cost Source",
      unitCost: "Unit Cost",
      totalCost: "Total Cost",
      actions: "",
    },
    statusLabels: {
      draft: "Draft",
      planned: "Planned",
      selected: "Selected",
      cancelled: "Cancelled",
      deleted: "Deleted",
    },
    costSourceLabels: {
      manual: "Manual",
      rateCard: "Rate Card",
      quoted: "Quoted",
    },
    deletedRecord: "Deleted Record",
    selectedHint: "Supplier Booking create or linked SBK appears in the panel below.",
  },
  supplierBookings: {
    title: "Supplier Bookings",
    subtitle: "Internal SBK records created from selected supplier allocations.",
    empty: {
      noBookings: "No Supplier Bookings recorded for this service yet.",
      selectAllocation: "Select a planned supplier allocation to create a Supplier Booking.",
    },
    columns: {
      bookingNumber: "SBK Number",
      status: "Status",
      supplier: "Supplier",
      item: "Item",
      qty: "Qty",
      unitCost: "Unit Cost",
      totalCost: "Total Cost",
      created: "Created",
      internalDetails: "Internal Details",
      actions: "",
    },
    statusLabels: {
      draft: "Draft",
      cancelled: "Cancelled",
    },
    selectedAllocations: "Selected Allocations",
    linkedBooking: "Linked SBK",
    locked: "Supplier Booking locked for completed or cancelled services.",
    noPermission: "You do not have permission to create Supplier Bookings.",
    details: {
      scope: "Scope:",
      notes: "Notes:",
      cancelled: "Cancelled:",
      noReason: "No reason recorded",
      empty: "—",
    },
  },
  billing: {
    title: "Billing / Invoicing",
    cards: {
      approvedQuotation: "Approved Quotation",
      depositInvoice: "Deposit Invoice",
      finalInvoice: "Final Invoice",
      billingCalculation: "Billing Calculation",
      noApprovedQuotationYet: "No approved quotation yet",
      noActiveDepositInvoice: "No active deposit invoice",
      noActiveFinalInvoice: "No active final invoice",
      priorInvoiced: "Prior Invoiced",
      remaining: "Remaining",
    },
    status: {
      title: "Billing Status",
      depositInvoice: "Deposit Invoice",
      finalInvoice: "Final Invoice",
      created: "Created",
      available: "Available",
      notAvailable: "Not available",
      nextAvailableAction: "Next available action: Create Final Invoice",
      notes: "Notes:",
    },
    invoiceStatuses: {
      sent: "Issued",
      draft: "Draft",
      paid: "Paid",
      partial: "Partial",
      overdue: "Overdue",
      cancelled: "Cancelled",
      voided: "Voided",
    },
    disabledReasons: {
      approvedQuotationRequired: "No approved quotation is available for this service.",
      billingStateUnavailable: "Billing information is currently unavailable.",
      duplicateActiveDepositInvoices: "Multiple active deposit invoices were found for this service.",
      duplicateActiveFinalInvoices: "Multiple active final invoices were found for this service.",
      missingServiceId: "Billing information is unavailable because the service ID is missing.",
      depositInvoiceAlreadyExists: "Deposit invoice already created for this service.",
      finalInvoiceAlreadyExists: "Final invoice already created for this service.",
      priorInvoicesExceedQuotationTotal: "Prior invoices exceed the approved quotation total.",
      quotationNotApproved: "The selected quotation is not approved yet.",
      quotationServiceMismatch: "The quotation does not match this service.",
      unavailable: "Action is currently unavailable.",
    },
    depositAction: {
      unavailable: "Deposit invoice is not available.",
      amountLabel: "Deposit Amount (SAR)",
      amountPlaceholder: "0.00",
      create: "Create Deposit",
      validation: {
        validAmount: "Please enter a valid numeric amount.",
        amountGreaterThanZero: "Deposit amount must be greater than 0.",
        amountCannotExceedQuotationTotal: "Deposit amount cannot exceed quotation total.",
      },
      success: "Deposit invoice created successfully. Invoice: {invoiceNumber}.",
      errors: {
        invalidInvoiceInput: "Invalid input provided.",
        depositAmountRequired: "Deposit amount is required.",
        depositAmountExceedsQuotationTotal: "Deposit amount exceeds quotation total.",
        depositInvoiceAlreadyExists: "An active deposit invoice already exists.",
        quotationNotFound: "Quotation not found.",
        quotationNotApproved: "Quotation is not approved.",
        quotationServiceMismatch: "Quotation does not match the current service.",
        companySettingsUnavailable: "Company settings are unavailable.",
        invoiceSnapshotUnavailable: "Unable to generate invoice snapshots.",
        invoiceCreationFailed: "Failed to insert the invoice.",
        unauthorized: "You are not authorized to perform this action.",
        forbidden: "You do not have permission to create invoices.",
        fallbackWithCode: "Unable to create deposit invoice. Error code: {code}",
        fallback: "Unable to create deposit invoice. Please try again.",
      },
    },
    finalAction: {
      unavailable: "Final invoice is not available.",
      amountSummary: "Final invoice amount will be calculated automatically from the approved quotation minus active deposit invoices.",
      create: "Create Final Invoice",
      success: "Final invoice created successfully. Invoice: {invoiceNumber}.",
      errors: {
        invalidInvoiceInput: "Invalid input provided.",
        finalInvoiceAlreadyExists: "An active final invoice already exists.",
        quotationNotFound: "Quotation not found.",
        quotationNotApproved: "Quotation is not approved.",
        quotationServiceMismatch: "Quotation does not match the current service.",
        companySettingsUnavailable: "Company settings are unavailable.",
        invoiceSnapshotUnavailable: "Unable to generate invoice snapshots.",
        invoiceCreationFailed: "Failed to insert the invoice.",
        unauthorized: "You are not authorized to perform this action.",
        forbidden: "You do not have permission to create invoices.",
        fallbackWithCode: "Unable to create final invoice. Error code: {code}",
        fallback: "Unable to create final invoice. Please try again.",
      },
    },
  },
  transitionCopy: {
    actions: {
      Inquiry: {
        label: "Move to Inquiry",
        description: "Return to inquiry.",
      },
      Quoted: {
        label: "Move to Quoted",
        description: "A Service-scoped quotation exists.",
      },
      Approved: {
        label: "Move to Approved",
        description: "An approved quotation exists for this Service.",
      },
      "Deposit Paid": {
        label: "Move to Deposit Paid",
        description: "A Deposit Invoice has confirmed payment evidence.",
      },
      "In Progress": {
        label: "Start Work",
        description: "Operations confirms work has started.",
      },
      Completed: {
        label: "Mark Completed",
        description: "Delivery is complete and active invoices are paid.",
      },
      Cancelled: {
        label: "Cancel Service",
        description: "Cancel this Service with a reason.",
      },
    },
    blockedReasons: {
      noServiceQuotation: "Create a Service quotation before moving this Service to Quoted.",
      approveQuotationFirst: "Approve a Service quotation before moving this Service to Approved.",
      multipleApprovedQuotations: "Multiple approved quotations were found. Resolve the quotation state before changing Service status.",
      depositPaymentRequired: "Create a Deposit Invoice and record a confirmed payment before moving this Service to Deposit Paid.",
      depositPaymentBeforeWork: "Confirmed Deposit Invoice payment evidence is required before starting work.",
      unpaidInvoices: "This Service still has unpaid active invoices. Complete payment before marking it Completed.",
      approvedQuotationRequiredForCompleted: "An approved quotation is required before marking this Service Completed.",
      remainingInvoiceRequired: "Create the remaining invoice before marking this Service Completed.",
      financeCancellationRequired: "This Service has financial records. Cancellation needs a finance cancellation workflow first.",
      unavailable: "This status transition is not available.",
      unableToVerifyQuotationEvidence: "Unable to verify Service quotation evidence. Please try again.",
      unableToVerifyInvoiceEvidence: "Unable to verify Service invoice evidence. Please try again.",
      unableToVerifyPaymentEvidence: "Unable to verify Service payment evidence. Please try again.",
      alreadyStatus: "Service is already {status}.",
      terminalStatusCannotChange: "{status} Services cannot be changed.",
      transitionNotAllowed: "This Service status transition is not allowed.",
      cancellationReasonRequired: "Cancellation requires a reason.",
    },
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
  quotationStatuses: {
    draft: "Draft",
    sent: "Sent",
    approved: "Approved",
    rejected: "Rejected",
    expired: "Expired",
  },
};

const servicesDictionaryAr: ServicesDictionary = {
  locale: "ar",
  states: {
    accessDenied: "تم رفض الوصول",
    genericError: "حدث خطأ ما",
    servicesForbidden: "ليس لديك صلاحية لعرض وحدة الخدمات.",
    servicesLoadError: "تعذر تحميل الخدمات في الوقت الحالي. يرجى المحاولة مرة أخرى لاحقًا.",
    createForbidden: "ليس لديك صلاحية لإنشاء الخدمات.",
    editForbidden: "ليس لديك صلاحية لتعديل الخدمات.",
    serviceReadForbidden: "ليس لديك صلاحية لعرض الخدمات.",
    serviceDataLoadError: "تعذر تحميل البيانات المطلوبة في الوقت الحالي. يرجى المحاولة مرة أخرى لاحقًا.",
    noServices: "لا توجد خدمات بعد. أنشئ أول خدمة للبدء.",
    noServicesFound: "لا توجد خدمات.",
    noFilteredServices: "لا توجد خدمات مطابقة للفلاتر المحددة.",
    noPermissionToViewQuotations: "ليس لديك صلاحية لعرض عروض السعر المرتبطة.",
    noRelatedQuotations: "لا توجد عروض سعر مرتبطة بهذه الخدمة حتى الآن.",
    unknownError: "خطأ غير معروف",
  },
  list: {
    title: "الخدمات",
    subtitle: "إدارة خدمات العملاء وحجوزات الفعاليات وسير العمل التشغيلي.",
    newService: "خدمة جديدة",
    allStatuses: "كل الحالات",
    showingZero: "عرض 0 من 0 خدمة",
    showingRange: "عرض {start}-{end} من إجمالي {total} خدمة",
    table: {
      serviceNumber: "رقم الخدمة",
      serviceTitle: "عنوان الخدمة / اسم الفعالية",
      customer: "العميل",
      eventDate: "تاريخ الفعالية",
      status: "الحالة",
      budget: "الميزانية",
    },
  },
  form: {
    newTitle: "خدمة جديدة",
    newSubtitle: "إنشاء خدمة جديدة أو حجز فعالية.",
    editTitle: "تعديل الخدمة",
    editSubtitle: "تحديث بيانات الخدمة.",
    basicDetails: "البيانات الأساسية",
    eventInformation: "بيانات الفعالية",
    eventInformationOptional: "بيانات الفعالية (اختياري)",
    labels: {
      customer: "العميل",
      serviceTitle: "عنوان الخدمة",
      description: "الوصف",
      estimatedBudget: "الميزانية التقديرية (SAR)",
      eventName: "اسم الفعالية",
      eventType: "نوع الفعالية",
      eventLocation: "موقع الفعالية",
      startDate: "تاريخ البداية",
      endDate: "تاريخ النهاية",
    },
    placeholders: {
      customer: "اختر عميلًا...",
      serviceTitle: "مثال: تصوير زفاف، تجهيز فعالية شركة",
      description: "تفاصيل الخدمة...",
      estimatedBudget: "0.00",
      eventName: "مثال: المؤتمر التقني السنوي 2026",
      eventType: "مثال: زفاف، معرض، فعالية شركة",
      eventLocation: "اسم الموقع أو العنوان",
      unknownCustomer: "غير معروف",
    },
    buttons: {
      cancel: "إلغاء",
      create: "إنشاء الخدمة",
      saveChanges: "حفظ التغييرات",
    },
    validation: {
      validActiveCustomer: "يرجى اختيار عميل نشط وصحيح.",
      serviceTitleRequired: "عنوان الخدمة مطلوب.",
      startDateRequiredWhenEndDateSet: "تاريخ بداية الفعالية مطلوب عند إدخال تاريخ النهاية.",
      endDateBeforeStartDate: "يجب ألا يكون تاريخ نهاية الفعالية قبل تاريخ البداية.",
      estimatedBudgetInvalid: "يجب أن تكون الميزانية التقديرية رقمًا صحيحًا.",
      estimatedBudgetNegative: "يجب ألا تكون الميزانية التقديرية سالبة.",
      failedToCreate: "تعذر إنشاء الخدمة.",
      failedToUpdate: "تعذر تحديث الخدمة.",
      unexpectedError: "حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.",
    },
  },
  detail: {
    backToServices: "العودة إلى الخدمات",
    createQuotation: "إنشاء عرض سعر",
    edit: "تعديل",
    quotationDisabledReasonStarted: "لا يمكن إنشاء عرض سعر لأن الخدمة بدأت بالفعل.",
    sections: {
      serviceSchedule: "جدول الخدمة",
      customerSummary: "ملخص العميل",
      operationalDetails: "التفاصيل التشغيلية",
      descriptionNotes: "الوصف / الملاحظات",
    },
    labels: {
      eventName: "اسم الفعالية",
      eventType: "نوع الفعالية",
      startDate: "تاريخ البداية",
      endDate: "تاريخ النهاية",
      location: "الموقع",
      customer: "العميل",
      primaryContact: "جهة الاتصال الأساسية",
      customerRef: "مرجع العميل",
      estimatedBudget: "الميزانية التقديرية",
      createdAt: "تاريخ الإنشاء",
      updatedAt: "آخر تحديث",
      status: "الحالة",
    },
    fallbacks: {
      customerProfile: "ملف العميل",
      customerReferenceUnavailable: "مرجع العميل غير متوفر",
      scheduleNotSet: "لم يتم تحديد الموعد",
      empty: "—",
    },
  },
  relatedQuotations: {
    title: "عروض السعر المرتبطة",
    subtitle: "سجلات عروض السعر المرتبطة بهذه الخدمة.",
    countSingular: "عرض سعر",
    countPlural: "عروض سعر",
    createQuotation: "إنشاء عرض سعر",
    table: {
      quotation: "عرض السعر",
      status: "الحالة",
      issueDate: "تاريخ الإصدار",
      validUntil: "صالح حتى",
      grandTotal: "الإجمالي",
    },
  },
  serviceStatusControl: {
    title: "إجراءات الحالة",
    currentStatus: "الحالة الحالية",
    terminalMessage: "هذه الخدمة في حالة نهائية. لا توجد إجراءات حالة إضافية متاحة.",
    noActions: "لا يوجد إجراء حالة متاح حاليًا.",
    cancellationReason: "سبب الإلغاء",
    cancellationPlaceholder: "اشرح سبب إلغاء هذه الخدمة.",
    blockedActions: "الإجراءات المحظورة",
    saving: "جارٍ الحفظ...",
    failedToUpdate: "تعذر تحديث الحالة",
    updatedSuccessfully: "تم تحديث الحالة بنجاح!",
  },
  serviceStatusTimeline: {
    title: "المسار الزمني لحالة الخدمة",
    subtitle: "عرض مرجعي فقط لسير العمل. يتم التحكم في تغييرات الحالة من خلال إجراءات سير عمل محمية.",
    cancelledTerminal: "حالة الإلغاء نهائية وغير خطية.",
    currentStatus: "الحالة الحالية",
    reached: "تم الوصول",
    pendingWorkflow: "بانتظار سير العمل",
    pending: "قيد الانتظار",
  },
  editPage: {
    blockedTitle: "التعديل محظور",
    blockedMessage: "التعديل غير مسموح عندما تكون حالة الخدمة {status}.",
  },
  supplierAllocations: {
    title: "تخصيصات الموردين",
    tabs: {
      active: "النشطة",
      showDeleted: "عرض المحذوف",
    },
    actions: {
      newAllocation: "تخصيص جديد",
      edit: "تعديل",
      cancel: "إلغاء",
      delete: "حذف",
      restore: "استعادة",
    },
    empty: "لا توجد تخصيصات موردين مسجلة لهذه الخدمة حتى الآن.",
    columns: {
      status: "الحالة",
      supplier: "المورد",
      category: "الفئة",
      item: "العنصر",
      unit: "الوحدة",
      qty: "الكمية",
      costSource: "مصدر التكلفة",
      unitCost: "تكلفة الوحدة",
      totalCost: "إجمالي التكلفة",
      actions: "",
    },
    statusLabels: {
      draft: "مسودة",
      planned: "مخطط",
      selected: "محدد",
      cancelled: "ملغى",
      deleted: "محذوف",
    },
    costSourceLabels: {
      manual: "يدوي",
      rateCard: "بطاقة أسعار",
      quoted: "مسعر",
    },
    deletedRecord: "سجل محذوف",
    selectedHint: "يظهر إنشاء حجز المورد أو رقم SBK المرتبط في اللوحة أدناه.",
  },
  supplierBookings: {
    title: "حجوزات الموردين",
    subtitle: "سجلات SBK داخلية تم إنشاؤها من تخصيصات الموردين المحددة.",
    empty: {
      noBookings: "لا توجد حجوزات موردين مسجلة لهذه الخدمة حتى الآن.",
      selectAllocation: "حدد تخصيص مورد مخططًا لإنشاء حجز مورد.",
    },
    columns: {
      bookingNumber: "رقم SBK",
      status: "الحالة",
      supplier: "المورد",
      item: "العنصر",
      qty: "الكمية",
      unitCost: "تكلفة الوحدة",
      totalCost: "إجمالي التكلفة",
      created: "تاريخ الإنشاء",
      internalDetails: "تفاصيل داخلية",
      actions: "",
    },
    statusLabels: {
      draft: "مسودة",
      cancelled: "ملغى",
    },
    selectedAllocations: "التخصيصات المحددة",
    linkedBooking: "SBK مرتبط",
    locked: "حجز المورد مقفل للخدمات المكتملة أو الملغاة.",
    noPermission: "ليست لديك صلاحية لإنشاء حجوزات موردين.",
    details: {
      scope: "النطاق:",
      notes: "ملاحظات:",
      cancelled: "تم الإلغاء:",
      noReason: "لم يتم تسجيل سبب",
      empty: "—",
    },
  },
  billing: {
    title: "الفوترة / الفواتير",
    cards: {
      approvedQuotation: "عرض السعر المعتمد",
      depositInvoice: "فاتورة دفعة مقدمة",
      finalInvoice: "الفاتورة النهائية",
      billingCalculation: "احتساب الفوترة",
      noApprovedQuotationYet: "لا يوجد عرض سعر معتمد حتى الآن",
      noActiveDepositInvoice: "لا توجد فاتورة دفعة مقدمة نشطة",
      noActiveFinalInvoice: "لا توجد فاتورة نهائية نشطة",
      priorInvoiced: "المفوتر سابقًا",
      remaining: "المتبقي",
    },
    status: {
      title: "حالة الفوترة",
      depositInvoice: "فاتورة دفعة مقدمة",
      finalInvoice: "الفاتورة النهائية",
      created: "تم الإنشاء",
      available: "متاحة",
      notAvailable: "غير متاحة",
      nextAvailableAction: "الإجراء المتاح التالي: إنشاء الفاتورة النهائية",
      notes: "ملاحظات:",
    },
    invoiceStatuses: {
      sent: "صادرة",
      draft: "مسودة",
      paid: "مدفوعة",
      partial: "مدفوعة جزئيًا",
      overdue: "متأخرة",
      cancelled: "ملغاة",
      voided: "ملغاة نهائيًا",
    },
    disabledReasons: {
      approvedQuotationRequired: "لا يوجد عرض سعر معتمد متاح لهذه الخدمة.",
      billingStateUnavailable: "معلومات الفوترة غير متاحة حاليًا.",
      duplicateActiveDepositInvoices: "تم العثور على أكثر من فاتورة دفعة مقدمة نشطة لهذه الخدمة.",
      duplicateActiveFinalInvoices: "تم العثور على أكثر من فاتورة نهائية نشطة لهذه الخدمة.",
      missingServiceId: "معلومات الفوترة غير متاحة لأن معرف الخدمة غير موجود.",
      depositInvoiceAlreadyExists: "تم بالفعل إنشاء فاتورة دفعة مقدمة لهذه الخدمة.",
      finalInvoiceAlreadyExists: "تم بالفعل إنشاء الفاتورة النهائية لهذه الخدمة.",
      priorInvoicesExceedQuotationTotal: "إجمالي الفواتير السابقة يتجاوز إجمالي عرض السعر المعتمد.",
      quotationNotApproved: "عرض السعر المحدد غير معتمد حتى الآن.",
      quotationServiceMismatch: "عرض السعر لا يطابق هذه الخدمة.",
      unavailable: "الإجراء غير متاح حاليًا.",
    },
    depositAction: {
      unavailable: "فاتورة الدفعة المقدمة غير متاحة.",
      amountLabel: "قيمة الدفعة المقدمة (SAR)",
      amountPlaceholder: "0.00",
      create: "إنشاء دفعة مقدمة",
      validation: {
        validAmount: "يرجى إدخال مبلغ رقمي صحيح.",
        amountGreaterThanZero: "يجب أن تكون قيمة الدفعة المقدمة أكبر من 0.",
        amountCannotExceedQuotationTotal: "لا يمكن أن تتجاوز قيمة الدفعة المقدمة إجمالي عرض السعر.",
      },
      success: "تم إنشاء فاتورة الدفعة المقدمة بنجاح. الفاتورة: {invoiceNumber}.",
      errors: {
        invalidInvoiceInput: "تم إدخال بيانات غير صحيحة.",
        depositAmountRequired: "قيمة الدفعة المقدمة مطلوبة.",
        depositAmountExceedsQuotationTotal: "قيمة الدفعة المقدمة تتجاوز إجمالي عرض السعر.",
        depositInvoiceAlreadyExists: "توجد بالفعل فاتورة دفعة مقدمة نشطة.",
        quotationNotFound: "تعذر العثور على عرض السعر.",
        quotationNotApproved: "عرض السعر غير معتمد.",
        quotationServiceMismatch: "عرض السعر لا يطابق الخدمة الحالية.",
        companySettingsUnavailable: "إعدادات الشركة غير متاحة.",
        invoiceSnapshotUnavailable: "تعذر إنشاء لقطات الفاتورة.",
        invoiceCreationFailed: "تعذر إنشاء الفاتورة.",
        unauthorized: "يجب تسجيل الدخول لتنفيذ هذا الإجراء.",
        forbidden: "ليس لديك صلاحية لإنشاء الفواتير.",
        fallbackWithCode: "تعذر إنشاء فاتورة الدفعة المقدمة. رمز الخطأ: {code}",
        fallback: "تعذر إنشاء فاتورة الدفعة المقدمة. يرجى المحاولة مرة أخرى.",
      },
    },
    finalAction: {
      unavailable: "الفاتورة النهائية غير متاحة.",
      amountSummary: "سيتم احتساب قيمة الفاتورة النهائية تلقائيًا من عرض السعر المعتمد بعد خصم فواتير الدفعة المقدمة النشطة.",
      create: "إنشاء الفاتورة النهائية",
      success: "تم إنشاء الفاتورة النهائية بنجاح. الفاتورة: {invoiceNumber}.",
      errors: {
        invalidInvoiceInput: "تم إدخال بيانات غير صحيحة.",
        finalInvoiceAlreadyExists: "توجد بالفعل فاتورة نهائية نشطة.",
        quotationNotFound: "تعذر العثور على عرض السعر.",
        quotationNotApproved: "عرض السعر غير معتمد.",
        quotationServiceMismatch: "عرض السعر لا يطابق الخدمة الحالية.",
        companySettingsUnavailable: "إعدادات الشركة غير متاحة.",
        invoiceSnapshotUnavailable: "تعذر إنشاء لقطات الفاتورة.",
        invoiceCreationFailed: "تعذر إنشاء الفاتورة.",
        unauthorized: "يجب تسجيل الدخول لتنفيذ هذا الإجراء.",
        forbidden: "ليس لديك صلاحية لإنشاء الفواتير.",
        fallbackWithCode: "تعذر إنشاء الفاتورة النهائية. رمز الخطأ: {code}",
        fallback: "تعذر إنشاء الفاتورة النهائية. يرجى المحاولة مرة أخرى.",
      },
    },
  },
  transitionCopy: {
    actions: {
      Inquiry: {
        label: "إعادة إلى استفسار",
        description: "إرجاع الخدمة إلى مرحلة الاستفسار.",
      },
      Quoted: {
        label: "نقل إلى تم تقديم عرض سعر",
        description: "يوجد عرض سعر مرتبط بهذه الخدمة.",
      },
      Approved: {
        label: "نقل إلى معتمد",
        description: "يوجد عرض سعر معتمد لهذه الخدمة.",
      },
      "Deposit Paid": {
        label: "نقل إلى تم سداد الدفعة المقدمة",
        description: "توجد دفعة مقدمة مؤكدة السداد لهذه الخدمة.",
      },
      "In Progress": {
        label: "بدء التنفيذ",
        description: "يؤكد فريق العمليات أن التنفيذ قد بدأ.",
      },
      Completed: {
        label: "تحديد كمكتمل",
        description: "تم إنجاز التسليم وسداد الفواتير النشطة.",
      },
      Cancelled: {
        label: "إلغاء الخدمة",
        description: "إلغاء هذه الخدمة مع توضيح السبب.",
      },
    },
    blockedReasons: {
      noServiceQuotation: "أنشئ عرض سعر للخدمة قبل نقل هذه الخدمة إلى حالة تم تقديم عرض سعر.",
      approveQuotationFirst: "اعتمد عرض سعر للخدمة قبل نقل هذه الخدمة إلى حالة معتمد.",
      multipleApprovedQuotations: "تم العثور على أكثر من عرض سعر معتمد. عالج حالة عروض السعر قبل تغيير حالة الخدمة.",
      depositPaymentRequired: "أنشئ فاتورة دفعة مقدمة وسجّل سدادًا مؤكدًا قبل نقل هذه الخدمة إلى حالة تم سداد الدفعة المقدمة.",
      depositPaymentBeforeWork: "يتطلب بدء التنفيذ وجود سداد مؤكد لفاتورة الدفعة المقدمة.",
      unpaidInvoices: "لا تزال لهذه الخدمة فواتير نشطة غير مسددة. أكمل السداد قبل تحديدها كمكتملة.",
      approvedQuotationRequiredForCompleted: "يتطلب تحديد هذه الخدمة كمكتملة وجود عرض سعر معتمد.",
      remainingInvoiceRequired: "أنشئ الفاتورة المتبقية قبل تحديد هذه الخدمة كمكتملة.",
      financeCancellationRequired: "تحتوي هذه الخدمة على سجلات مالية. يتطلب الإلغاء مسار إلغاء مالي أولًا.",
      unavailable: "هذا الانتقال في حالة الخدمة غير متاح.",
      unableToVerifyQuotationEvidence: "تعذر التحقق من بيانات عروض السعر الخاصة بالخدمة. يرجى المحاولة مرة أخرى.",
      unableToVerifyInvoiceEvidence: "تعذر التحقق من بيانات الفواتير الخاصة بالخدمة. يرجى المحاولة مرة أخرى.",
      unableToVerifyPaymentEvidence: "تعذر التحقق من بيانات السداد الخاصة بالخدمة. يرجى المحاولة مرة أخرى.",
      alreadyStatus: "الخدمة بالفعل في حالة {status}.",
      terminalStatusCannotChange: "لا يمكن تغيير الخدمات التي حالتها {status}.",
      transitionNotAllowed: "هذا الانتقال في حالة الخدمة غير مسموح.",
      cancellationReasonRequired: "يتطلب الإلغاء إدخال سبب.",
    },
  },
  serviceStatuses: {
    Inquiry: "استفسار",
    Quoted: "تم تقديم عرض سعر",
    Approved: "معتمد",
    "Deposit Paid": "تم سداد الدفعة المقدمة",
    "In Progress": "قيد التنفيذ",
    Completed: "مكتمل",
    Cancelled: "ملغي",
  },
  quotationStatuses: {
    draft: "مسودة",
    sent: "مرسل",
    approved: "معتمد",
    rejected: "مرفوض",
    expired: "منتهي",
  },
};

const servicesDictionaries: Record<Locale, ServicesDictionary> = {
  en: servicesDictionaryEn,
  ar: servicesDictionaryAr,
};

export function getServicesDictionary(locale: Locale): ServicesDictionary {
  return servicesDictionaries[locale];
}
