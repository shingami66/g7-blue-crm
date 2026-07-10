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
    actions: {
      view: string;
    };
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
  approvedBillingScopes: {
    title: string;
    subtitle: string;
    empty: string;
    unavailable: string;
    active: string;
    versionPrefix: string;
    otherScopeSingular: string;
    otherScopePlural: string;
    labels: {
      version: string;
      lineSafety: string;
      acceptedGrandTotal: string;
    };
    statusLabels: Record<"draft" | "approved" | "voided", string>;
    lineSafetyLabels: Record<"pending_review" | "safe" | "unsafe", string>;
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
    currentPhaseLabel: string;
    nextActionLabel: string;
    historyLabel: string;
    historyHint: string;
    stopped: string;
    noFurtherActions: string;
    reached: string;
    current: string;
    pending: string;
    notConfirmed: string;
    fallbackPhase: string;
    fallbackNextAction: string;
    phaseDescriptions: Record<ServiceStatus, string>;
    nextActionDescriptions: Record<ServiceStatus, string>;
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
    statusActions: {
      draft: {
        label: string;
        loadingLabel: string;
      };
      planned: {
        label: string;
        loadingLabel: string;
      };
      selected: string;
      updateFailed: string;
      errors: {
        allocationIdRequired: string;
        notFound: string;
        cancelled: string;
        invalidTransition: string;
        linkedActiveBooking: string;
        serviceUnavailable: string;
        supplierUnavailable: string;
        updateFailedRetry: string;
        unauthorized: string;
        forbidden: string;
        unexpected: string;
      };
    };
    deletedRecord: string;
    selectedHint: string;
    subflow: {
      common: {
        allocationSummary: string;
        supplier: string;
        category: string;
        itemName: string;
        quantity: string;
        unit: string;
        status: string;
      };
      createPage: {
        accessDeniedTitle: string;
        accessDeniedMessage: string;
        supplierPermissionMessage: string;
        failedToLoadServiceTitle: string;
        failedToLoadServiceMessage: string;
        serviceUnavailableTitle: string;
        serviceUnavailableMessage: string;
        failedToLoadSuppliersTitle: string;
        failedToLoadSuppliersMessage: string;
        returnToService: string;
        backToService: string;
        title: string;
        subtitle: string;
      };
      createForm: {
        modes: {
          manualEstimate: string;
          fromRateCard: string;
        };
        supplier: string;
        selectSupplier: string;
        rateCardItem: string;
        loadingRateCards: string;
        selectSupplierFirst: string;
        noActiveRateCards: string;
        selectRateCard: string;
        category: string;
        itemName: string;
        unit: string;
        quantity: string;
        rateCardUnitCost: string;
        estimatedUnitCost: string;
        scopeOfWork: string;
        internalNotes: string;
        cancel: string;
        create: string;
        failed: string;
        placeholders: {
          category: string;
          itemName: string;
          unit: string;
          quantity: string;
          estimatedUnitCost: string;
          scopeOfWork: string;
          internalNotes: string;
        };
        errors: {
          serviceUnavailable: string;
          supplierUnavailable: string;
          approvedQuotationInvalid: string;
          rateCardIdRequired: string;
          rateCardNotFound: string;
          rateCardInactive: string;
          rateCardSupplierMismatch: string;
          invalidRateCardCostOrCurrency: string;
          rateCardExpired: string;
          createFailedRetry: string;
          unauthorized: string;
          forbidden: string;
          unexpected: string;
        };
      };
      editForm: {
        supplier: string;
        category: string;
        itemName: string;
        unit: string;
        quantity: string;
        estimatedUnitCost: string;
        status: string;
        scopeOfWork: string;
        internalNotes: string;
        cancel: string;
        update: string;
        failed: string;
        placeholders: {
          category: string;
          itemName: string;
          unit: string;
          quantity: string;
          estimatedUnitCost: string;
          scopeOfWork: string;
          internalNotes: string;
        };
        errors: {
          allocationIdRequired: string;
          notFound: string;
          cancelled: string;
          rateCardReadOnly: string;
          linkedActiveBooking: string;
          invalidTransition: string;
          serviceUnavailable: string;
          supplierUnavailable: string;
          approvedQuotationInvalid: string;
          updateFailedRetry: string;
          unauthorized: string;
          forbidden: string;
          unexpected: string;
          bookingStatusVerifyFailed: string;
          bookingStatusUnexpected: string;
        };
      };
      cancelForm: {
        reasonLabel: string;
        reasonPlaceholder: string;
        warning: string;
        back: string;
        loadingLabel: string;
        confirm: string;
        failed: string;
        errors: {
          allocationIdRequired: string;
          notFound: string;
          alreadyCancelled: string;
          linkedActiveBooking: string;
          serviceUnavailable: string;
          cancelFailedRetry: string;
          unauthorized: string;
          forbidden: string;
          unexpected: string;
          bookingStatusVerifyFailed: string;
          bookingStatusUnexpected: string;
        };
      };
      deleteForm: {
        warning: string;
        back: string;
        confirm: string;
        failed: string;
        errors: {
          allocationIdRequired: string;
          notFound: string;
          alreadyDeleted: string;
          linkedActiveBooking: string;
          serviceUnavailable: string;
          deleteFailedRetry: string;
          unauthorized: string;
          forbidden: string;
          unexpected: string;
          bookingStatusVerifyFailed: string;
          bookingStatusUnexpected: string;
        };
      };
      restoreForm: {
        warning: string;
        back: string;
        loadingLabel: string;
        confirm: string;
        failed: string;
        errors: {
          allocationIdRequired: string;
          notFound: string;
          notDeleted: string;
          linkedActiveBooking: string;
          serviceUnavailable: string;
          restoreFailedRetry: string;
          unauthorized: string;
          forbidden: string;
          unexpected: string;
          bookingStatusVerifyFailed: string;
          bookingStatusUnexpected: string;
        };
      };
    };
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
    createAction: {
      label: string;
      loadingLabel: string;
      failed: string;
      errors: {
        invalidInput: string;
        sourceLoadFailed: string;
        sourceNotFound: string;
        sourceDeleted: string;
        sourceMustBeSelected: string;
        serviceStatusVerifyFailed: string;
        serviceUnavailable: string;
        activeBookingExists: string;
        createFailedRetry: string;
        unauthorized: string;
        forbidden: string;
        unexpected: string;
      };
    };
    cancelAction: {
      trigger: string;
      title: string;
      subtitle: string;
      reasonLabel: string;
      reasonPlaceholder: string;
      validationReasonRequired: string;
      back: string;
      loadingLabel: string;
      confirm: string;
      failed: string;
      errors: {
        bookingLoadFailed: string;
        bookingNotFound: string;
        alreadyCancelled: string;
        serviceStatusVerifyFailed: string;
        serviceUnavailable: string;
        cancelFailedRetry: string;
        unauthorized: string;
        forbidden: string;
        unexpected: string;
      };
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
    actions: {
      view: "View",
    },
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
  approvedBillingScopes: {
    title: "Approved Billing Scope",
    subtitle: "Read-only accepted scope for this Service.",
    empty: "No Approved Billing Scope exists for this Service.",
    unavailable: "Approved Billing Scope information is temporarily unavailable.",
    active: "Active approved",
    versionPrefix: "Version",
    otherScopeSingular: "1 other historical or draft scope",
    otherScopePlural: "{count} other historical or draft scopes",
    labels: {
      version: "Scope version",
      lineSafety: "Line safety",
      acceptedGrandTotal: "Accepted grand total",
    },
    statusLabels: {
      draft: "Draft",
      approved: "Approved",
      voided: "Voided",
    },
    lineSafetyLabels: {
      pending_review: "Pending review",
      safe: "Safe",
      unsafe: "Unsafe",
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
    title: "Workflow",
    currentPhaseLabel: "Current Phase",
    nextActionLabel: "Next Action",
    historyLabel: "Status History",
    historyHint: "Review the standard status path for this service.",
    stopped: "Workflow stopped before the standard path was completed.",
    noFurtherActions: "No further status actions are available.",
    reached: "Reached",
    current: "Current",
    pending: "Pending",
    notConfirmed: "Not confirmed",
    fallbackPhase: "The current workflow state is available in the service header.",
    fallbackNextAction: "Review the current workflow state and use guarded status actions when available.",
    phaseDescriptions: {
      Inquiry: "The service inquiry has been captured and is under review.",
      Quoted: "A quotation has been prepared and is waiting for approval.",
      Approved: "The service is approved and awaiting deposit confirmation.",
      "Deposit Paid": "The deposit is confirmed and the service is ready to begin.",
      "In Progress": "The service is currently being delivered.",
      Completed: "The service has been completed.",
      Cancelled: "The service has been cancelled.",
    },
    nextActionDescriptions: {
      Inquiry: "Complete the service details and issue a quotation when ready.",
      Quoted: "Approve the quotation to continue the workflow.",
      Approved: "Confirm the deposit payment to continue the workflow.",
      "Deposit Paid": "Start delivery when work begins.",
      "In Progress": "Finish delivery and close the remaining workflow steps.",
      Completed: "No further status actions are available.",
      Cancelled: "No further status actions are available.",
    },
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
    statusActions: {
      draft: {
        label: "Mark Planned",
        loadingLabel: "Marking supplier allocation as planned",
      },
      planned: {
        label: "Select Supplier",
        loadingLabel: "Selecting supplier allocation",
      },
      selected: "Selected allocation",
      updateFailed: "Failed to update supplier allocation status.",
      errors: {
        allocationIdRequired: "Supplier Allocation ID is required.",
        notFound: "Supplier Allocation not found.",
        cancelled: "Cancelled Supplier Allocations cannot change status.",
        invalidTransition: "This Supplier Allocation status change is not allowed.",
        linkedActiveBooking:
          "This Supplier Allocation is linked to an active Supplier Booking and cannot be changed.",
        serviceUnavailable: "Service data is unavailable for this Supplier Allocation update.",
        supplierUnavailable: "Supplier data is unavailable for this Supplier Allocation update.",
        updateFailedRetry: "Failed to update Supplier Allocation. Please try again.",
        unauthorized: "You must be signed in to update Supplier Allocations.",
        forbidden: "You do not have permission to update Supplier Allocations.",
        unexpected: "An unexpected error occurred while updating the Supplier Allocation.",
      },
    },
    deletedRecord: "Deleted Record",
    selectedHint: "Supplier Booking create or linked SBK appears in the panel below.",
    subflow: {
      common: {
        allocationSummary: "Allocation Summary",
        supplier: "Supplier",
        category: "Category",
        itemName: "Item Name",
        quantity: "Quantity",
        unit: "Unit",
        status: "Status",
      },
      createPage: {
        accessDeniedTitle: "Access Denied",
        accessDeniedMessage:
          "You do not have permission to create manual supplier allocations.",
        supplierPermissionMessage:
          "You do not have permission to view suppliers, which is required to create an allocation.",
        failedToLoadServiceTitle: "Failed to load service",
        failedToLoadServiceMessage:
          "We couldn't load the service details needed to create an allocation. Please try again later.",
        serviceUnavailableTitle: "Service Unavailable",
        serviceUnavailableMessage:
          "Cannot create a supplier allocation because the service is {status}.",
        failedToLoadSuppliersTitle: "Failed to load suppliers",
        failedToLoadSuppliersMessage:
          "We couldn't load the supplier options. Please try again later.",
        returnToService: "Return to Service",
        backToService: "Back to Service",
        title: "Create Allocation",
        subtitle: "Create a manual supplier allocation for",
      },
      createForm: {
        modes: {
          manualEstimate: "Manual Estimate",
          fromRateCard: "From Rate Card",
        },
        supplier: "Supplier",
        selectSupplier: "Select a supplier...",
        rateCardItem: "Rate Card Item",
        loadingRateCards: "Loading rate cards...",
        selectSupplierFirst: "Select a supplier first",
        noActiveRateCards: "No active rate cards found",
        selectRateCard: "Select a rate card...",
        category: "Category",
        itemName: "Item Name",
        unit: "Unit",
        quantity: "Quantity",
        rateCardUnitCost: "Rate Card Unit Cost (SAR)",
        estimatedUnitCost: "Estimated Unit Cost (SAR)",
        scopeOfWork: "Scope of Work",
        internalNotes: "Internal Notes",
        cancel: "Cancel",
        create: "Create Allocation",
        failed: "Failed to create supplier allocation.",
        placeholders: {
          category: "e.g. Venue, Catering, AV",
          itemName: "e.g. Main Hall Rental",
          unit: "e.g. Days, Pax, Pieces",
          quantity: "1",
          estimatedUnitCost: "0.00",
          scopeOfWork:
            "Detailed description of what the supplier will provide...",
          internalNotes: "Internal notes for operations team...",
        },
        errors: {
          serviceUnavailable: "Service is unavailable for supplier allocation.",
          supplierUnavailable: "Supplier is unavailable for allocation.",
          approvedQuotationInvalid:
            "Approved quotation is invalid for this service.",
          rateCardIdRequired: "Rate card ID is required.",
          rateCardNotFound: "Rate card not found.",
          rateCardInactive: "Rate card is not active or deleted.",
          rateCardSupplierMismatch:
            "Rate card does not belong to the selected supplier.",
          invalidRateCardCostOrCurrency: "Invalid rate card cost or currency.",
          rateCardExpired: "Rate card is expired.",
          createFailedRetry:
            "Failed to create supplier allocation. Please try again.",
          unauthorized:
            "You must be signed in to create supplier allocations.",
          forbidden:
            "You do not have permission to create supplier allocations.",
          unexpected:
            "An unexpected error occurred while creating the supplier allocation.",
        },
      },
      editForm: {
        supplier: "Supplier",
        category: "Category",
        itemName: "Item Name",
        unit: "Unit",
        quantity: "Quantity",
        estimatedUnitCost: "Estimated Unit Cost (SAR)",
        status: "Status",
        scopeOfWork: "Scope of Work",
        internalNotes: "Internal Notes",
        cancel: "Cancel",
        update: "Update Allocation",
        failed: "Failed to update supplier allocation.",
        placeholders: {
          category: "e.g. Venue, Catering, AV",
          itemName: "e.g. Main Hall Rental",
          unit: "e.g. Days, Pax, Pieces",
          quantity: "1",
          estimatedUnitCost: "0.00",
          scopeOfWork:
            "Detailed description of what the supplier will provide...",
          internalNotes: "Internal notes for operations team...",
        },
        errors: {
          allocationIdRequired: "Supplier allocation ID is required.",
          notFound: "Supplier allocation not found.",
          cancelled: "Cannot update a cancelled supplier allocation.",
          rateCardReadOnly:
            "Rate-card allocations cannot be manually updated yet.",
          linkedActiveBooking:
            "This allocation cannot be modified because it is linked to an active supplier booking.",
          invalidTransition:
            "Invalid supplier allocation status transition.",
          serviceUnavailable:
            "Service is unavailable for supplier allocation update.",
          supplierUnavailable: "Supplier is unavailable for allocation update.",
          approvedQuotationInvalid:
            "Approved quotation is invalid for this service.",
          updateFailedRetry:
            "Failed to update supplier allocation. Please try again.",
          unauthorized:
            "You must be signed in to update supplier allocations.",
          forbidden:
            "You do not have permission to update supplier allocations.",
          unexpected:
            "An unexpected error occurred while updating the supplier allocation.",
          bookingStatusVerifyFailed:
            "Failed to verify booking status. Please try again.",
          bookingStatusUnexpected:
            "An unexpected error occurred while verifying booking status.",
        },
      },
      cancelForm: {
        reasonLabel: "Cancellation Reason",
        reasonPlaceholder:
          "Please provide a reason for cancelling this allocation...",
        warning:
          "This action cannot be undone. The allocation will be preserved for history but its status will change to cancelled.",
        back: "Go Back",
        loadingLabel: "Cancelling...",
        confirm: "Cancel Allocation",
        failed: "Failed to cancel supplier allocation.",
        errors: {
          allocationIdRequired: "Supplier allocation ID is required.",
          notFound: "Supplier allocation not found.",
          alreadyCancelled: "Supplier allocation is already cancelled.",
          linkedActiveBooking:
            "This allocation cannot be modified because it is linked to an active supplier booking.",
          serviceUnavailable:
            "Service is unavailable for supplier allocation cancel.",
          cancelFailedRetry:
            "Failed to cancel supplier allocation. Please try again.",
          unauthorized:
            "You must be signed in to cancel supplier allocations.",
          forbidden:
            "You do not have permission to cancel supplier allocations.",
          unexpected:
            "An unexpected error occurred while cancelling the supplier allocation.",
          bookingStatusVerifyFailed:
            "Failed to verify booking status. Please try again.",
          bookingStatusUnexpected:
            "An unexpected error occurred while verifying booking status.",
        },
      },
      deleteForm: {
        warning:
          'Are you sure you want to delete this allocation? It will be removed from the default view. You can view or restore it later by toggling "Show Deleted".',
        back: "Go Back",
        confirm: "Delete Allocation",
        failed: "Failed to delete supplier allocation.",
        errors: {
          allocationIdRequired: "Supplier allocation ID is required.",
          notFound: "Supplier allocation not found.",
          alreadyDeleted: "Supplier allocation is already deleted.",
          linkedActiveBooking:
            "This allocation cannot be modified because it is linked to an active supplier booking.",
          serviceUnavailable:
            "Service is unavailable for supplier allocation deletion.",
          deleteFailedRetry:
            "Failed to delete supplier allocation. Please try again.",
          unauthorized:
            "You must be signed in to delete supplier allocations.",
          forbidden:
            "You do not have permission to delete supplier allocations.",
          unexpected:
            "An unexpected error occurred while deleting the supplier allocation.",
          bookingStatusVerifyFailed:
            "Failed to verify booking status. Please try again.",
          bookingStatusUnexpected:
            "An unexpected error occurred while verifying booking status.",
        },
      },
      restoreForm: {
        warning:
          "Are you sure you want to restore this allocation? It will become active again in the default view.",
        back: "Go Back",
        loadingLabel: "Restoring...",
        confirm: "Restore Allocation",
        failed: "Failed to restore supplier allocation.",
        errors: {
          allocationIdRequired: "Supplier allocation ID is required.",
          notFound: "Supplier allocation not found.",
          notDeleted: "Supplier allocation is not deleted.",
          linkedActiveBooking:
            "This allocation cannot be modified because it is linked to an active supplier booking.",
          serviceUnavailable:
            "Service is unavailable for supplier allocation restoration.",
          restoreFailedRetry:
            "Failed to restore supplier allocation. Please try again.",
          unauthorized:
            "You must be signed in to restore supplier allocations.",
          forbidden:
            "You do not have permission to restore supplier allocations.",
          unexpected:
            "An unexpected error occurred while restoring the supplier allocation.",
          bookingStatusVerifyFailed:
            "Failed to verify booking status. Please try again.",
          bookingStatusUnexpected:
            "An unexpected error occurred while verifying booking status.",
        },
      },
    },
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
    createAction: {
      label: "Create Supplier Booking",
      loadingLabel: "Creating Supplier Booking",
      failed: "Failed to create Supplier Booking.",
      errors: {
        invalidInput:
          "Supplier Booking input is invalid. Only the selected Supplier Allocation can be used.",
        sourceLoadFailed: "Failed to load the selected Supplier Allocation. Please try again.",
        sourceNotFound: "Selected Supplier Allocation not found.",
        sourceDeleted: "Selected Supplier Allocation is deleted.",
        sourceMustBeSelected:
          "The Supplier Allocation must be in Selected status before creating a Supplier Booking.",
        serviceStatusVerifyFailed: "Failed to verify service status. Please try again.",
        serviceUnavailable: "Service data is unavailable for Supplier Booking creation.",
        activeBookingExists:
          "This Supplier Allocation already has an active Supplier Booking.",
        createFailedRetry: "Failed to create Supplier Booking. Please try again.",
        unauthorized: "You must be signed in to create Supplier Bookings.",
        forbidden: "You do not have permission to create Supplier Bookings.",
        unexpected: "An unexpected error occurred while creating the Supplier Booking.",
      },
    },
    cancelAction: {
      trigger: "Cancel",
      title: "Cancel Supplier Booking",
      subtitle: "Add a reason before cancelling this internal Supplier Booking.",
      reasonLabel: "Cancellation Reason",
      reasonPlaceholder: "Explain why this Supplier Booking is being cancelled.",
      validationReasonRequired: "Cancellation reason is required.",
      back: "Back",
      loadingLabel: "Cancelling Supplier Booking",
      confirm: "Cancel Supplier Booking",
      failed: "Failed to cancel Supplier Booking.",
      errors: {
        bookingLoadFailed: "Failed to load Supplier Booking. Please try again.",
        bookingNotFound: "Supplier Booking not found.",
        alreadyCancelled: "Supplier Booking is already cancelled.",
        serviceStatusVerifyFailed: "Failed to verify service status. Please try again.",
        serviceUnavailable: "Service data is unavailable for Supplier Booking cancellation.",
        cancelFailedRetry: "Failed to cancel Supplier Booking. Please try again.",
        unauthorized: "You must be signed in to cancel Supplier Bookings.",
        forbidden: "You do not have permission to cancel Supplier Bookings.",
        unexpected: "An unexpected error occurred while cancelling the Supplier Booking.",
      },
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
      noActiveDepositInvoice: "Deposit invoice has not been created yet.",
      noActiveFinalInvoice: "Final invoice has not been created yet.",
      priorInvoiced: "Prior Invoiced",
      remaining: "Remaining",
    },
    status: {
      title: "Billing Status",
      depositInvoice: "Deposit Invoice",
      finalInvoice: "Final Invoice",
      created: "Created",
      available: "Available",
      notAvailable: "Action unavailable",
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
      unavailable: "Deposit invoice action is not available.",
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
      unavailable: "Final invoice action is not available.",
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
    actions: {
      view: "عرض",
    },
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
  approvedBillingScopes: {
    title: "نطاق الفوترة المعتمد",
    subtitle: "النطاق المقبول للطلب، للعرض فقط.",
    empty: "لا يوجد نطاق فوترة معتمد لهذه الخدمة.",
    unavailable: "معلومات نطاق الفوترة المعتمد غير متاحة مؤقتًا.",
    active: "معتمد ونشط",
    versionPrefix: "الإصدار",
    otherScopeSingular: "نطاق تاريخي أو مسودة آخر",
    otherScopePlural: "{count} نطاقات تاريخية أو مسودات أخرى",
    labels: {
      version: "إصدار النطاق",
      lineSafety: "سلامة البنود",
      acceptedGrandTotal: "الإجمالي المقبول",
    },
    statusLabels: {
      draft: "مسودة",
      approved: "معتمد",
      voided: "ملغى",
    },
    lineSafetyLabels: {
      pending_review: "بانتظار المراجعة",
      safe: "آمن",
      unsafe: "غير آمن",
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
    title: "سير العمل",
    currentPhaseLabel: "المرحلة الحالية",
    nextActionLabel: "الخطوة التالية",
    historyLabel: "سجل الحالات",
    historyHint: "راجع مسار الحالة القياسي لهذه الخدمة.",
    stopped: "توقف سير العمل قبل اكتمال المسار القياسي.",
    noFurtherActions: "لا توجد إجراءات حالة إضافية متاحة.",
    reached: "تم الوصول",
    current: "الحالية",
    pending: "قيد الانتظار",
    notConfirmed: "غير مؤكد",
    fallbackPhase: "حالة سير العمل الحالية متاحة في رأس صفحة الخدمة.",
    fallbackNextAction: "راجع حالة سير العمل الحالية واستخدم إجراءات الحالة المحمية عند توفرها.",
    phaseDescriptions: {
      Inquiry: "تم تسجيل الاستفسار وتتم مراجعة تفاصيل الخدمة.",
      Quoted: "تم إعداد عرض السعر وبانتظار الاعتماد.",
      Approved: "تم اعتماد الخدمة وبانتظار تأكيد الدفعة المقدمة.",
      "Deposit Paid": "تم تأكيد الدفعة المقدمة والخدمة جاهزة لبدء التنفيذ.",
      "In Progress": "الخدمة قيد التنفيذ حالياً.",
      Completed: "تم إكمال الخدمة.",
      Cancelled: "تم إلغاء الخدمة.",
    },
    nextActionDescriptions: {
      Inquiry: "أكمل تفاصيل الخدمة وأصدر عرض السعر عند الجاهزية.",
      Quoted: "اعتمد عرض السعر لمتابعة سير العمل.",
      Approved: "أكد سداد الدفعة المقدمة لمتابعة سير العمل.",
      "Deposit Paid": "ابدأ التنفيذ عند بدء العمل الفعلي.",
      "In Progress": "أكمل التنفيذ وأغلق الخطوات المتبقية عند الانتهاء.",
      Completed: "لا توجد إجراءات حالة إضافية متاحة.",
      Cancelled: "لا توجد إجراءات حالة إضافية متاحة.",
    },
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
    statusActions: {
      draft: {
        label: "تحديد كمخطط",
        loadingLabel: "جارٍ تحديد تخصيص المورد كمخطط",
      },
      planned: {
        label: "تحديد المورد",
        loadingLabel: "جارٍ تحديد المورد للتخصيص",
      },
      selected: "تم تحديد التخصيص",
      updateFailed: "تعذر تحديث حالة تخصيص المورد.",
      errors: {
        allocationIdRequired: "معرّف تخصيص المورد مطلوب.",
        notFound: "تعذر العثور على تخصيص المورد.",
        cancelled: "لا يمكن تغيير حالة تخصيص المورد الملغى.",
        invalidTransition: "تغيير حالة تخصيص المورد هذا غير مسموح.",
        linkedActiveBooking:
          "تخصيص المورد هذا مرتبط بحجز مورد نشط ولا يمكن تعديله.",
        serviceUnavailable: "بيانات الخدمة غير متاحة لتحديث تخصيص المورد هذا.",
        supplierUnavailable: "بيانات المورد غير متاحة لتحديث تخصيص المورد هذا.",
        updateFailedRetry: "تعذر تحديث تخصيص المورد. يرجى المحاولة مرة أخرى.",
        unauthorized: "يجب تسجيل الدخول لتحديث تخصيصات الموردين.",
        forbidden: "ليست لديك صلاحية لتحديث تخصيصات الموردين.",
        unexpected: "حدث خطأ غير متوقع أثناء تحديث تخصيص المورد.",
      },
    },
    deletedRecord: "سجل محذوف",
    selectedHint: "يظهر إنشاء حجز المورد أو رقم SBK المرتبط في اللوحة أدناه.",
    subflow: {
      common: {
        allocationSummary: "ملخص التخصيص",
        supplier: "المورد",
        category: "الفئة",
        itemName: "اسم العنصر",
        quantity: "الكمية",
        unit: "الوحدة",
        status: "الحالة",
      },
      createPage: {
        accessDeniedTitle: "تم رفض الوصول",
        accessDeniedMessage:
          "ليست لديك صلاحية لإنشاء تخصيصات موردين يدوية.",
        supplierPermissionMessage:
          "ليست لديك صلاحية لعرض الموردين، وهذا مطلوب لإنشاء التخصيص.",
        failedToLoadServiceTitle: "تعذر تحميل الخدمة",
        failedToLoadServiceMessage:
          "تعذر تحميل تفاصيل الخدمة المطلوبة لإنشاء التخصيص. يرجى المحاولة مرة أخرى لاحقًا.",
        serviceUnavailableTitle: "الخدمة غير متاحة",
        serviceUnavailableMessage:
          "لا يمكن إنشاء تخصيص مورد لأن حالة الخدمة هي {status}.",
        failedToLoadSuppliersTitle: "تعذر تحميل الموردين",
        failedToLoadSuppliersMessage:
          "تعذر تحميل خيارات الموردين. يرجى المحاولة مرة أخرى لاحقًا.",
        returnToService: "العودة إلى الخدمة",
        backToService: "رجوع إلى الخدمة",
        title: "إنشاء تخصيص",
        subtitle: "إنشاء تخصيص مورد يدوي للخدمة",
      },
      createForm: {
        modes: {
          manualEstimate: "تقدير يدوي",
          fromRateCard: "من بطاقة الأسعار",
        },
        supplier: "المورد",
        selectSupplier: "اختر موردًا...",
        rateCardItem: "عنصر بطاقة الأسعار",
        loadingRateCards: "جارٍ تحميل بطاقات الأسعار...",
        selectSupplierFirst: "اختر موردًا أولًا",
        noActiveRateCards: "لم يتم العثور على بطاقات أسعار نشطة",
        selectRateCard: "اختر بطاقة أسعار...",
        category: "الفئة",
        itemName: "اسم العنصر",
        unit: "الوحدة",
        quantity: "الكمية",
        rateCardUnitCost: "تكلفة وحدة بطاقة الأسعار (SAR)",
        estimatedUnitCost: "تكلفة الوحدة التقديرية (SAR)",
        scopeOfWork: "نطاق العمل",
        internalNotes: "ملاحظات داخلية",
        cancel: "إلغاء",
        create: "إنشاء تخصيص",
        failed: "تعذر إنشاء تخصيص المورد.",
        placeholders: {
          category: "مثال: قاعة، تموين، صوتيات",
          itemName: "مثال: إيجار القاعة الرئيسية",
          unit: "مثال: أيام، أفراد، قطع",
          quantity: "1",
          estimatedUnitCost: "0.00",
          scopeOfWork: "وصف تفصيلي لما سيقدمه المورد...",
          internalNotes: "ملاحظات داخلية لفريق العمليات...",
        },
        errors: {
          serviceUnavailable: "الخدمة غير متاحة لتخصيص المورد.",
          supplierUnavailable: "المورد غير متاح لهذا التخصيص.",
          approvedQuotationInvalid: "عرض السعر المعتمد غير صالح لهذه الخدمة.",
          rateCardIdRequired: "معرّف بطاقة الأسعار مطلوب.",
          rateCardNotFound: "تعذر العثور على بطاقة الأسعار.",
          rateCardInactive: "بطاقة الأسعار غير نشطة أو محذوفة.",
          rateCardSupplierMismatch:
            "بطاقة الأسعار لا تتبع المورد المحدد.",
          invalidRateCardCostOrCurrency:
            "تكلفة بطاقة الأسعار أو عملتها غير صالحة.",
          rateCardExpired: "انتهت صلاحية بطاقة الأسعار.",
          createFailedRetry:
            "تعذر إنشاء تخصيص المورد. يرجى المحاولة مرة أخرى.",
          unauthorized:
            "يجب تسجيل الدخول لإنشاء تخصيصات الموردين.",
          forbidden:
            "ليست لديك صلاحية لإنشاء تخصيصات الموردين.",
          unexpected:
            "حدث خطأ غير متوقع أثناء إنشاء تخصيص المورد.",
        },
      },
      editForm: {
        supplier: "المورد",
        category: "الفئة",
        itemName: "اسم العنصر",
        unit: "الوحدة",
        quantity: "الكمية",
        estimatedUnitCost: "تكلفة الوحدة التقديرية (SAR)",
        status: "الحالة",
        scopeOfWork: "نطاق العمل",
        internalNotes: "ملاحظات داخلية",
        cancel: "إلغاء",
        update: "تحديث التخصيص",
        failed: "تعذر تحديث تخصيص المورد.",
        placeholders: {
          category: "مثال: قاعة، تموين، صوتيات",
          itemName: "مثال: إيجار القاعة الرئيسية",
          unit: "مثال: أيام، أفراد، قطع",
          quantity: "1",
          estimatedUnitCost: "0.00",
          scopeOfWork: "وصف تفصيلي لما سيقدمه المورد...",
          internalNotes: "ملاحظات داخلية لفريق العمليات...",
        },
        errors: {
          allocationIdRequired: "معرّف تخصيص المورد مطلوب.",
          notFound: "تعذر العثور على تخصيص المورد.",
          cancelled: "لا يمكن تحديث تخصيص مورد ملغى.",
          rateCardReadOnly:
            "لا يمكن تحديث تخصيصات بطاقة الأسعار يدويًا حتى الآن.",
          linkedActiveBooking:
            "لا يمكن تعديل هذا التخصيص لأنه مرتبط بحجز مورد نشط.",
          invalidTransition: "تغيير حالة تخصيص المورد غير مسموح.",
          serviceUnavailable:
            "الخدمة غير متاحة لتحديث تخصيص المورد.",
          supplierUnavailable:
            "المورد غير متاح لتحديث هذا التخصيص.",
          approvedQuotationInvalid: "عرض السعر المعتمد غير صالح لهذه الخدمة.",
          updateFailedRetry:
            "تعذر تحديث تخصيص المورد. يرجى المحاولة مرة أخرى.",
          unauthorized:
            "يجب تسجيل الدخول لتحديث تخصيصات الموردين.",
          forbidden:
            "ليست لديك صلاحية لتحديث تخصيصات الموردين.",
          unexpected:
            "حدث خطأ غير متوقع أثناء تحديث تخصيص المورد.",
          bookingStatusVerifyFailed:
            "تعذر التحقق من حالة الحجز. يرجى المحاولة مرة أخرى.",
          bookingStatusUnexpected:
            "حدث خطأ غير متوقع أثناء التحقق من حالة الحجز.",
        },
      },
      cancelForm: {
        reasonLabel: "سبب الإلغاء",
        reasonPlaceholder: "يرجى توضيح سبب إلغاء هذا التخصيص...",
        warning:
          "لا يمكن التراجع عن هذا الإجراء. سيتم الاحتفاظ بالتخصيص لأغراض السجل، لكن حالته ستتغير إلى ملغى.",
        back: "رجوع",
        loadingLabel: "جارٍ الإلغاء...",
        confirm: "إلغاء التخصيص",
        failed: "تعذر إلغاء تخصيص المورد.",
        errors: {
          allocationIdRequired: "معرّف تخصيص المورد مطلوب.",
          notFound: "تعذر العثور على تخصيص المورد.",
          alreadyCancelled: "تم إلغاء تخصيص المورد بالفعل.",
          linkedActiveBooking:
            "لا يمكن تعديل هذا التخصيص لأنه مرتبط بحجز مورد نشط.",
          serviceUnavailable:
            "الخدمة غير متاحة لإلغاء تخصيص المورد.",
          cancelFailedRetry:
            "تعذر إلغاء تخصيص المورد. يرجى المحاولة مرة أخرى.",
          unauthorized:
            "يجب تسجيل الدخول لإلغاء تخصيصات الموردين.",
          forbidden:
            "ليست لديك صلاحية لإلغاء تخصيصات الموردين.",
          unexpected:
            "حدث خطأ غير متوقع أثناء إلغاء تخصيص المورد.",
          bookingStatusVerifyFailed:
            "تعذر التحقق من حالة الحجز. يرجى المحاولة مرة أخرى.",
          bookingStatusUnexpected:
            "حدث خطأ غير متوقع أثناء التحقق من حالة الحجز.",
        },
      },
      deleteForm: {
        warning:
          "هل أنت متأكد من حذف هذا التخصيص؟ ستتم إزالته من العرض الافتراضي، ويمكنك عرضه أو استعادته لاحقًا عبر تفعيل \"عرض المحذوف\".",
        back: "رجوع",
        confirm: "حذف التخصيص",
        failed: "تعذر حذف تخصيص المورد.",
        errors: {
          allocationIdRequired: "معرّف تخصيص المورد مطلوب.",
          notFound: "تعذر العثور على تخصيص المورد.",
          alreadyDeleted: "تم حذف تخصيص المورد بالفعل.",
          linkedActiveBooking:
            "لا يمكن تعديل هذا التخصيص لأنه مرتبط بحجز مورد نشط.",
          serviceUnavailable:
            "الخدمة غير متاحة لحذف تخصيص المورد.",
          deleteFailedRetry:
            "تعذر حذف تخصيص المورد. يرجى المحاولة مرة أخرى.",
          unauthorized:
            "يجب تسجيل الدخول لحذف تخصيصات الموردين.",
          forbidden:
            "ليست لديك صلاحية لحذف تخصيصات الموردين.",
          unexpected:
            "حدث خطأ غير متوقع أثناء حذف تخصيص المورد.",
          bookingStatusVerifyFailed:
            "تعذر التحقق من حالة الحجز. يرجى المحاولة مرة أخرى.",
          bookingStatusUnexpected:
            "حدث خطأ غير متوقع أثناء التحقق من حالة الحجز.",
        },
      },
      restoreForm: {
        warning:
          "هل أنت متأكد من استعادة هذا التخصيص؟ سيصبح نشطًا مرة أخرى في العرض الافتراضي.",
        back: "رجوع",
        loadingLabel: "جارٍ الاستعادة...",
        confirm: "استعادة التخصيص",
        failed: "تعذر استعادة تخصيص المورد.",
        errors: {
          allocationIdRequired: "معرّف تخصيص المورد مطلوب.",
          notFound: "تعذر العثور على تخصيص المورد.",
          notDeleted: "تخصيص المورد غير محذوف.",
          linkedActiveBooking:
            "لا يمكن تعديل هذا التخصيص لأنه مرتبط بحجز مورد نشط.",
          serviceUnavailable:
            "الخدمة غير متاحة لاستعادة تخصيص المورد.",
          restoreFailedRetry:
            "تعذر استعادة تخصيص المورد. يرجى المحاولة مرة أخرى.",
          unauthorized:
            "يجب تسجيل الدخول لاستعادة تخصيصات الموردين.",
          forbidden:
            "ليست لديك صلاحية لاستعادة تخصيصات الموردين.",
          unexpected:
            "حدث خطأ غير متوقع أثناء استعادة تخصيص المورد.",
          bookingStatusVerifyFailed:
            "تعذر التحقق من حالة الحجز. يرجى المحاولة مرة أخرى.",
          bookingStatusUnexpected:
            "حدث خطأ غير متوقع أثناء التحقق من حالة الحجز.",
        },
      },
    },
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
    createAction: {
      label: "إنشاء حجز مورد",
      loadingLabel: "جارٍ إنشاء حجز المورد",
      failed: "تعذر إنشاء حجز المورد.",
      errors: {
        invalidInput:
          "بيانات حجز المورد غير صحيحة. يمكن استخدام تخصيص المورد المحدد فقط.",
        sourceLoadFailed: "تعذر تحميل تخصيص المورد المحدد. يرجى المحاولة مرة أخرى.",
        sourceNotFound: "تعذر العثور على تخصيص المورد المحدد.",
        sourceDeleted: "تم حذف تخصيص المورد المحدد.",
        sourceMustBeSelected:
          "يجب أن تكون حالة تخصيص المورد محدد قبل إنشاء حجز المورد.",
        serviceStatusVerifyFailed: "تعذر التحقق من حالة الخدمة. يرجى المحاولة مرة أخرى.",
        serviceUnavailable: "بيانات الخدمة غير متاحة لإنشاء حجز المورد.",
        activeBookingExists: "يوجد بالفعل حجز مورد نشط لهذا التخصيص.",
        createFailedRetry: "تعذر إنشاء حجز المورد. يرجى المحاولة مرة أخرى.",
        unauthorized: "يجب تسجيل الدخول لإنشاء حجوزات الموردين.",
        forbidden: "ليست لديك صلاحية لإنشاء حجوزات الموردين.",
        unexpected: "حدث خطأ غير متوقع أثناء إنشاء حجز المورد.",
      },
    },
    cancelAction: {
      trigger: "إلغاء",
      title: "إلغاء حجز المورد",
      subtitle: "أضف سببًا قبل إلغاء حجز المورد الداخلي هذا.",
      reasonLabel: "سبب الإلغاء",
      reasonPlaceholder: "اشرح سبب إلغاء حجز المورد هذا.",
      validationReasonRequired: "سبب الإلغاء مطلوب.",
      back: "رجوع",
      loadingLabel: "جارٍ إلغاء حجز المورد",
      confirm: "إلغاء حجز المورد",
      failed: "تعذر إلغاء حجز المورد.",
      errors: {
        bookingLoadFailed: "تعذر تحميل حجز المورد. يرجى المحاولة مرة أخرى.",
        bookingNotFound: "تعذر العثور على حجز المورد.",
        alreadyCancelled: "حجز المورد ملغى بالفعل.",
        serviceStatusVerifyFailed: "تعذر التحقق من حالة الخدمة. يرجى المحاولة مرة أخرى.",
        serviceUnavailable: "بيانات الخدمة غير متاحة لإلغاء حجز المورد.",
        cancelFailedRetry: "تعذر إلغاء حجز المورد. يرجى المحاولة مرة أخرى.",
        unauthorized: "يجب تسجيل الدخول لإلغاء حجوزات الموردين.",
        forbidden: "ليست لديك صلاحية لإلغاء حجوزات الموردين.",
        unexpected: "حدث خطأ غير متوقع أثناء إلغاء حجز المورد.",
      },
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
      noActiveDepositInvoice: "لم يتم إنشاء فاتورة الدفعة المقدمة بعد.",
      noActiveFinalInvoice: "لم يتم إنشاء الفاتورة النهائية بعد.",
      priorInvoiced: "المفوتر سابقًا",
      remaining: "المتبقي",
    },
    status: {
      title: "حالة الفوترة",
      depositInvoice: "فاتورة دفعة مقدمة",
      finalInvoice: "الفاتورة النهائية",
      created: "تم الإنشاء",
      available: "متاحة",
      notAvailable: "الإجراء غير متاح",
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
      unavailable: "إجراء فاتورة الدفعة المقدمة غير متاح.",
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
      unavailable: "إجراء الفاتورة النهائية غير متاح.",
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
