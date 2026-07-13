import type { Locale } from "../locales";
import type { ServiceStatus } from "../../../types/service";
import type { QuotationStatus } from "../../quotations/types";
import { resolveDictionaryValue } from "../fallback.ts";

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
  actionErrors: {
    invalidInput: string;
    unauthorized: string;
    forbidden: string;
    notFound: string;
    customerUnavailable: string;
    statusChangeDeferred: string;
    statusConflict: string;
    noFields: string;
    transitionBlocked: string;
    generic: string;
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
    viewDetails: string;
    active: string;
    versionPrefix: string;
    otherScopeSingular: string;
    otherScopePlural: string;
    draftRevisionExists: string;
    viewDraft: string;
    historyCountSingular: string;
    historyCountPlural: string;
    noApprovedQuotation: string;
    legacyQuotationAuthority: string;
    historicalNotAuthority: string;
    invoiceTotalsRestricted: string;
    invoiceTotalsUnavailable: string;
    sourceQuotationUnavailable: string;
    viewRelatedQuotations: string;
    createDraft: {
      action: string;
      creating: string;
      success: string;
      openExistingDraft: string;
      sourceLabel: string;
      errors: {
        scope_duplicate_draft: string;
        scope_source_not_approved: string;
        scope_source_deleted: string;
        scope_discount_not_supported: string;
        scope_source_service_mismatch: string;
        scope_service_lifecycle_ineligible: string;
        scope_no_items: string;
        scope_permission_denied: string;
        scope_not_found: string;
        scope_concurrency_conflict: string;
        scope_unexpected_error: string;
        fallback: string;
        fallbackWithCode: string;
      };
    };
    labels: {
      version: string;
      lineSafety: string;
      acceptedGrandTotal: string;
      sourceQuotation: string;
      billingCeiling: string;
      invoicedAmount: string;
      remainingBillable: string;
    };
    statusLabels: Record<"draft" | "approved" | "voided", string>;
    /** Display-only effective status labels (not DB enum values). */
    effectiveStatusLabels: Record<"draft" | "active" | "superseded" | "voided", string>;
    lineSafetyLabels: Record<"pending_review" | "safe" | "unsafe", string>;
    detail: {
      title: string;
      backToService: string;
      viewDetails: string;
      unavailable: string;
      sectionSummary: string;
      sectionItems: string;
      sectionInvoices: string;
      labels: {
        status: string;
        version: string;
        lineSafety: string;
        acceptedGrandTotal: string;
        createdAt: string;
        approvedAt: string;
        description: string;
        category: string;
        decision: string;
        acceptedQuantity: string;
        unitPrice: string;
        lineTotal: string;
        invoiceNumber: string;
        invoiceType: string;
        invoiceStatus: string;
        grandTotal: string;
        issueDate: string;
      };
      itemDecisionLabels: Record<"accepted" | "adjusted" | "excluded" | "customer_supplied", string>;
      invoiceTypeLabels: Record<"deposit" | "final", string>;
      invoiceStatusLabels: Record<"draft" | "sent" | "paid" | "partial" | "overdue" | "cancelled" | "voided", string>;
      noItems: string;
      noInvoices: string;
      invoicesUnavailable: string;
      editItem: AbsDraftItemEditorDictionary;
      discardDraft: AbsDraftDiscardDictionary;
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
      editPage: {
        accessDeniedTitle: string;
        accessDeniedMessage: string;
        serviceUnavailableTitle: string;
        serviceUnavailableMessage: string;
        cancelledTitle: string;
        cancelledMessage: string;
        rateCardTitle: string;
        rateCardMessage: string;
        returnToService: string;
        backToService: string;
        title: string;
        subtitle: string;
      };
      cancelPage: {
        accessDeniedTitle: string;
        accessDeniedMessage: string;
        serviceUnavailableTitle: string;
        serviceUnavailableMessage: string;
        alreadyCancelledTitle: string;
        alreadyCancelledMessage: string;
        returnToService: string;
        backToService: string;
        title: string;
        subtitle: string;
      };
      deletePage: {
        accessDeniedTitle: string;
        accessDeniedMessage: string;
        serviceUnavailableTitle: string;
        serviceUnavailableMessage: string;
        alreadyDeletedTitle: string;
        alreadyDeletedMessage: string;
        actionUnavailableTitle: string;
        actionUnavailableMessage: string;
        returnToService: string;
        backToService: string;
        title: string;
        subtitle: string;
      };
      restorePage: {
        accessDeniedTitle: string;
        accessDeniedMessage: string;
        serviceUnavailableTitle: string;
        serviceUnavailableMessage: string;
        notDeletedTitle: string;
        notDeletedMessage: string;
        actionUnavailableTitle: string;
        actionUnavailableMessage: string;
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
  actionErrors: {
    invalidInput: "Please check the service details and try again.",
    unauthorized: "You must be signed in to perform this action.",
    forbidden: "You do not have permission to perform this action.",
    notFound: "The service could not be found.",
    customerUnavailable: "The selected customer is unavailable.",
    statusChangeDeferred: "Service status changes are handled through the status controls.",
    statusConflict: "This service cannot be edited in its current status.",
    noFields: "Enter at least one change before saving.",
    transitionBlocked: "This Service status change is not currently allowed.",
    generic: "We couldn't complete the service action. Please try again.",
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
      quotation: "Quotation Number",
      status: "Quotation Status",
      issueDate: "Issue Date",
      validUntil: "Valid Until",
      grandTotal: "Quoted Amount",
    },
  },
  approvedBillingScopes: {
    title: "Approved Billing Scope",
    subtitle: "Read-only accepted scope for this Service.",
    empty: "No Approved Billing Scope exists for this Service.",
    unavailable: "Approved Billing Scope information is temporarily unavailable.",
    viewDetails: "View details",
    active: "Active approved",
    versionPrefix: "Version",
    otherScopeSingular: "1 other historical or draft scope",
    otherScopePlural: "{count} other historical or draft scopes",
    draftRevisionExists: "Draft revision exists",
    viewDraft: "View draft",
    historyCountSingular: "1 historical scope on record",
    historyCountPlural: "{count} historical scopes on record",
    noApprovedQuotation:
      "An Approved Billing Scope cannot be created yet. Approve a Service quotation first.",
    legacyQuotationAuthority:
      "No active Approved Billing Scope. Current billing uses the approved quotation ceiling.",
    historicalNotAuthority:
      "No active Approved Billing Scope. Historical scopes below are not the current billing authority.",
    invoiceTotalsRestricted: "Invoice totals are restricted for your role.",
    invoiceTotalsUnavailable: "Invoice totals are temporarily unavailable.",
    sourceQuotationUnavailable: "Source quotation reference unavailable",
    viewRelatedQuotations: "View related quotations",
    createDraft: {
      action: "Create draft",
      creating: "Creating draft…",
      success: "Draft billing scope created.",
      openExistingDraft: "A draft billing scope already exists for this quotation.",
      sourceLabel: "Source quotation",
      errors: {
        scope_duplicate_draft:
          "An active draft billing scope already exists for this source quotation.",
        scope_source_not_approved:
          "The source quotation must be approved before creating a billing scope.",
        scope_source_deleted:
          "The source quotation is deleted and cannot be used for billing scope work.",
        scope_discount_not_supported:
          "Approved Billing Scope does not support source quotations with discount.",
        scope_source_service_mismatch:
          "The source quotation does not belong to this service.",
        scope_service_lifecycle_ineligible:
          "A billing scope draft cannot be created for a completed, cancelled, or deleted Service.",
        scope_no_items:
          "The source quotation does not have any items to copy into a billing scope.",
        scope_permission_denied:
          "You do not have permission to create an approved billing scope draft.",
        scope_not_found: "Source quotation was not found.",
        scope_concurrency_conflict:
          "Draft creation encountered a concurrency conflict. Please try again.",
        scope_unexpected_error:
          "An unexpected error occurred while creating the draft. Please try again.",
        fallback: "Could not create the draft. Please try again.",
        fallbackWithCode: "Could not create the draft ({code}).",
      },
    },
    labels: {
      version: "Scope version",
      lineSafety: "Line safety",
      acceptedGrandTotal: "Accepted grand total",
      sourceQuotation: "Source quotation",
      billingCeiling: "Billing ceiling",
      invoicedAmount: "Invoiced amount",
      remainingBillable: "Remaining billable",
    },
    statusLabels: {
      draft: "Draft",
      approved: "Approved",
      voided: "Voided",
    },
    effectiveStatusLabels: {
      draft: "Draft",
      active: "Active",
      superseded: "Superseded",
      voided: "Voided",
    },
    lineSafetyLabels: {
      pending_review: "Pending review",
      safe: "Safe",
      unsafe: "Unsafe",
    },
    detail: {
      title: "Approved Billing Scope details",
      backToService: "Return to Service",
      viewDetails: "View details",
      unavailable: "Approved Billing Scope details are temporarily unavailable.",
      sectionSummary: "Scope summary",
      sectionItems: "Accepted scope items",
      sectionInvoices: "Linked invoices",
      labels: {
        status: "Status",
        version: "Scope version",
        lineSafety: "Line safety",
        acceptedGrandTotal: "Accepted grand total",
        createdAt: "Created",
        approvedAt: "Approved",
        description: "Description",
        category: "Category",
        decision: "Decision",
        acceptedQuantity: "Accepted quantity",
        unitPrice: "Unit price",
        lineTotal: "Accepted line total",
        invoiceNumber: "Invoice number",
        invoiceType: "Invoice type",
        invoiceStatus: "Status",
        grandTotal: "Grand total",
        issueDate: "Issue date",
      },
      itemDecisionLabels: {
        accepted: "Accepted",
        adjusted: "Adjusted",
        excluded: "Excluded",
        customer_supplied: "Customer supplied",
      },
      invoiceTypeLabels: { deposit: "Deposit", final: "Final" },
      invoiceStatusLabels: {
        draft: "Draft", sent: "Sent", paid: "Paid", partial: "Partially paid",
        overdue: "Overdue", cancelled: "Cancelled", voided: "Voided",
      },
      noItems: "No scope items are available.",
      noInvoices: "No linked invoices.",
      invoicesUnavailable: "Linked invoice information is temporarily unavailable.",
      editItem: {
        trigger: "Edit item",
        title: "Edit draft item",
        sourceValues: "Source values",
        acceptedValues: "Accepted values",
        sourceQuantity: "Source quantity",
        sourceUnitPrice: "Source unit price",
        vatRate: "VAT rate",
        sourceLineTotal: "Source line total",
        decision: "Decision",
        acceptedQuantity: "Accepted quantity",
        acceptedUnitPrice: "Accepted unit price",
        acceptedLineTotal: "Accepted line total",
        reasonCode: "Reason code",
        reasonNote: "Reason note",
        reasonNoteOptional: "Optional",
        cancel: "Cancel",
        save: "Save changes",
        saving: "Saving changes…",
        success: "Draft item updated.",
        reasonCodeLabels: {
          customer_reduced_quantity: "Customer reduced quantity",
          customer_reduced_price: "Customer reduced price",
          customer_removed_item: "Customer removed item",
          customer_supplied: "Customer supplied",
          internal_scope_correction: "Internal scope correction",
          source_pricing_issue: "Source pricing issue",
          unsafe_line_item: "Unsafe line item",
          other: "Other",
        },
        validation: {
          adjustedValueRequired: "Enter an accepted quantity or unit price for an adjusted item.",
          reasonRequired: "Select a reason code for this decision.",
          quantityCannotIncrease: "Accepted quantity cannot exceed the source quantity.",
          unitPriceCannotIncrease: "Accepted unit price cannot exceed the source unit price.",
        },
        errors: {
          scope_not_found: "This billing scope item is no longer available.",
          scope_not_draft: "Only draft billing scopes can be edited.",
          scope_reduction_invalid: "Accepted values must follow the reductions-only rules.",
          scope_reason_required: "A reason code is required for this change.",
          scope_concurrency_conflict: "This draft changed while you were editing it. Refresh and try again.",
          scope_permission_denied: "You do not have permission to edit this draft item.",
          scope_unexpected_error: "Could not update the draft item. Please try again.",
        },
      },
      discardDraft: {
        trigger: "Discard draft",
        title: "Discard draft billing scope?",
        body: "This permanently removes the draft billing scope and all of its draft items.",
        cancel: "Keep draft",
        confirm: "Discard draft",
        discarding: "Discarding draft…",
        errors: {
          scope_not_found: "This draft billing scope is no longer available.",
          scope_not_draft: "Only draft billing scopes can be discarded.",
          scope_reduction_invalid: "The draft could not be discarded.",
          scope_reason_required: "The draft could not be discarded.",
          scope_concurrency_conflict: "This draft changed while you were discarding it. Refresh and try again.",
          scope_permission_denied: "You do not have permission to discard this draft.",
          scope_unexpected_error: "Could not discard the draft. Please try again.",
        },
      },
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
    title: "Status Timeline",
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
    selectedHint: "Supplier Booking create or a linked booking appears in the panel below.",
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
      editPage: {
        accessDeniedTitle: "Access Denied",
        accessDeniedMessage:
          "You do not have permission to edit supplier allocations.",
        serviceUnavailableTitle: "Service Unavailable",
        serviceUnavailableMessage:
          "Cannot edit a supplier allocation because the service is {status}.",
        cancelledTitle: "Allocation Cancelled",
        cancelledMessage: "Cannot edit a cancelled supplier allocation.",
        rateCardTitle: "Rate Card Allocation",
        rateCardMessage:
          "Cannot manually edit a rate-card based supplier allocation.",
        returnToService: "Return to Service",
        backToService: "Back to Service",
        title: "Edit Allocation",
        subtitle: "Edit manual supplier allocation for",
      },
      cancelPage: {
        accessDeniedTitle: "Access Denied",
        accessDeniedMessage:
          "You do not have permission to cancel supplier allocations.",
        serviceUnavailableTitle: "Service Unavailable",
        serviceUnavailableMessage:
          "Cannot cancel a supplier allocation because the service is {status}.",
        alreadyCancelledTitle: "Allocation Already Cancelled",
        alreadyCancelledMessage:
          "This supplier allocation has already been cancelled.",
        returnToService: "Return to Service",
        backToService: "Back to Service",
        title: "Cancel Allocation",
        subtitle: "Cancel supplier allocation for",
      },
      deletePage: {
        accessDeniedTitle: "Access Denied",
        accessDeniedMessage:
          "You do not have permission to delete supplier allocations.",
        serviceUnavailableTitle: "Service Unavailable",
        serviceUnavailableMessage:
          "Cannot delete a supplier allocation because the service is {status}.",
        alreadyDeletedTitle: "Allocation Already Deleted",
        alreadyDeletedMessage:
          "This supplier allocation has already been deleted.",
        actionUnavailableTitle: "Action Unavailable",
        actionUnavailableMessage:
          "Only manual allocations can be deleted at this time.",
        returnToService: "Return to Service",
        backToService: "Back to Service",
        title: "Delete Allocation",
        subtitle: "Delete supplier allocation for",
      },
      restorePage: {
        accessDeniedTitle: "Access Denied",
        accessDeniedMessage:
          "You do not have permission to restore supplier allocations.",
        serviceUnavailableTitle: "Service Unavailable",
        serviceUnavailableMessage:
          "Cannot restore a supplier allocation because the service is {status}.",
        notDeletedTitle: "Allocation Not Deleted",
        notDeletedMessage: "This supplier allocation is currently active.",
        actionUnavailableTitle: "Action Unavailable",
        actionUnavailableMessage:
          "Only manual allocations can be restored at this time.",
        returnToService: "Return to Service",
        backToService: "Back to Service",
        title: "Restore Allocation",
        subtitle: "Restore supplier allocation for",
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
    subtitle: "Internal supplier bookings created from selected allocations.",
    empty: {
      noBookings: "No Supplier Bookings recorded for this service yet.",
      selectAllocation: "Select a planned supplier allocation to create a Supplier Booking.",
    },
    columns: {
      bookingNumber: "Booking Number",
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
    linkedBooking: "Linked supplier booking",
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
    title: "Billing",
    cards: {
      approvedQuotation: "Approved Quotation",
      depositInvoice: "Deposit Invoice",
      finalInvoice: "Final Invoice",
      billingCalculation: "Billing Summary",
      noApprovedQuotationYet: "No approved quotation yet",
      noActiveDepositInvoice: "Deposit invoice has not been created yet.",
      noActiveFinalInvoice: "Final invoice has not been created yet.",
      priorInvoiced: "Previously Invoiced",
      remaining: "Remaining Amount",
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
      create: "Create Deposit Invoice",
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

type AbsDraftActionErrors = {
  scope_not_found: string;
  scope_not_draft: string;
  scope_reduction_invalid: string;
  scope_reason_required: string;
  scope_concurrency_conflict: string;
  scope_permission_denied: string;
  scope_unexpected_error: string;
};

type AbsDraftItemEditorDictionary = {
  trigger: string;
  title: string;
  sourceValues: string;
  acceptedValues: string;
  sourceQuantity: string;
  sourceUnitPrice: string;
  vatRate: string;
  sourceLineTotal: string;
  decision: string;
  acceptedQuantity: string;
  acceptedUnitPrice: string;
  acceptedLineTotal: string;
  reasonCode: string;
  reasonNote: string;
  reasonNoteOptional: string;
  cancel: string;
  save: string;
  saving: string;
  success: string;
  reasonCodeLabels: Record<
    | "customer_reduced_quantity"
    | "customer_reduced_price"
    | "customer_removed_item"
    | "customer_supplied"
    | "internal_scope_correction"
    | "source_pricing_issue"
    | "unsafe_line_item"
    | "other",
    string
  >;
  validation: {
    adjustedValueRequired: string;
    reasonRequired: string;
    quantityCannotIncrease: string;
    unitPriceCannotIncrease: string;
  };
  errors: AbsDraftActionErrors;
};

type AbsDraftDiscardDictionary = {
  trigger: string;
  title: string;
  body: string;
  cancel: string;
  confirm: string;
  discarding: string;
  errors: AbsDraftActionErrors;
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
  actionErrors: {
    invalidInput: "يرجى التحقق من بيانات الخدمة والمحاولة مرة أخرى.",
    unauthorized: "يجب تسجيل الدخول لتنفيذ هذا الإجراء.",
    forbidden: "ليس لديك صلاحية لتنفيذ هذا الإجراء.",
    notFound: "تعذر العثور على الخدمة.",
    customerUnavailable: "العميل المحدد غير متاح.",
    statusChangeDeferred: "تغييرات حالة الخدمة تتم من خلال أدوات الحالة.",
    statusConflict: "لا يمكن تعديل هذه الخدمة في حالتها الحالية.",
    noFields: "أدخل تغييرًا واحدًا على الأقل قبل الحفظ.",
    transitionBlocked: "تغيير حالة هذه الخدمة غير مسموح به حاليًا.",
    generic: "تعذر إكمال إجراء الخدمة. يرجى المحاولة مرة أخرى.",
  },
  list: {
    title: "الخدمات",
    subtitle: "إدارة خدمات العملاء وحجوزات الفعاليات وسير العمل التشغيلي.",
    newService: "خدمة جديدة",
    allStatuses: "جميع الحالات",
    showingZero: "عرض 0 من 0 خدمة",
    showingRange: "عرض {start}-{end} من إجمالي {total} خدمة",
    actions: {
      view: "عرض",
    },
    table: {
      serviceNumber: "رقم الخدمة",
      serviceTitle: "عنوان الخدمة / اسم الفعالية",
      customer: "العميل",
      eventDate: "تاريخ البداية",
      status: "الحالة",
      budget: "الميزانية",
    },
  },
  form: {
    newTitle: "خدمة جديدة",
    newSubtitle: "إنشاء خدمة جديدة.",
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
      serviceSchedule: "الجدول الزمني",
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
      primaryContact: "مسؤول التواصل",
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
    title: "عروض الأسعار المرتبطة",
    subtitle: "سجلات عروض الأسعار المرتبطة بهذه الخدمة.",
    countSingular: "عرض سعر",
    countPlural: "عروض أسعار",
    createQuotation: "إنشاء عرض سعر",
    table: {
      quotation: "رقم عرض السعر",
      status: "حالة عرض السعر",
      issueDate: "تاريخ الإصدار",
      validUntil: "صالح حتى",
      grandTotal: "قيمة عرض السعر",
    },
  },
  approvedBillingScopes: {
    title: "نطاق الفوترة المعتمد",
    subtitle: "النطاق المعتمد للفوترة لهذه الخدمة.",
    empty: "لا يوجد نطاق فوترة معتمد لهذه الخدمة.",
    unavailable: "معلومات نطاق الفوترة المعتمد غير متاحة مؤقتًا.",
    viewDetails: "عرض التفاصيل",
    active: "معتمد ونشط",
    versionPrefix: "الإصدار",
    otherScopeSingular: "نطاق تاريخي أو مسودة آخر",
    otherScopePlural: "{count} نطاقات تاريخية أو مسودات أخرى",
    draftRevisionExists: "توجد مسودة مراجعة",
    viewDraft: "عرض المسودة",
    historyCountSingular: "نطاق تاريخي واحد مسجل",
    historyCountPlural: "{count} نطاقات تاريخية مسجلة",
    noApprovedQuotation:
      "لا يمكن إنشاء نطاق فوترة معتمد بعد. اعتمد عرض سعر للخدمة أولاً.",
    legacyQuotationAuthority:
      "لا يوجد نطاق فوترة معتمد نشط. الفوترة الحالية تعتمد على سقف عرض السعر المعتمد.",
    historicalNotAuthority:
      "لا يوجد نطاق فوترة معتمد نشط. النطاقات التاريخية أدناه ليست سلطة الفوترة الحالية.",
    invoiceTotalsRestricted: "إجماليات الفواتير مقيدة لدورك.",
    invoiceTotalsUnavailable: "إجماليات الفواتير غير متاحة مؤقتًا.",
    sourceQuotationUnavailable: "مرجع عرض السعر المصدر غير متاح",
    viewRelatedQuotations: "عرض عروض الأسعار المرتبطة",
    createDraft: {
      action: "إنشاء مسودة",
      creating: "جاري إنشاء المسودة…",
      success: "تم إنشاء مسودة نطاق الفوترة.",
      openExistingDraft: "توجد مسودة نطاق فوترة لهذا العرض بالفعل.",
      sourceLabel: "عرض السعر المصدر",
      errors: {
        scope_duplicate_draft:
          "توجد مسودة نطاق فوترة نشطة لهذا العرض بالفعل.",
        scope_source_not_approved:
          "يجب اعتماد عرض السعر المصدر قبل إنشاء نطاق فوترة.",
        scope_source_deleted:
          "عرض السعر المصدر محذوف ولا يمكن استخدامه لنطاق الفوترة.",
        scope_discount_not_supported:
          "نطاق الفوترة المعتمد لا يدعم عروض الأسعار التي تتضمن خصمًا.",
        scope_source_service_mismatch:
          "عرض السعر المصدر لا ينتمي إلى هذه الخدمة.",
        scope_service_lifecycle_ineligible:
          "لا يمكن إنشاء مسودة نطاق فوترة لخدمة مكتملة أو ملغاة أو محذوفة.",
        scope_no_items:
          "عرض السعر المصدر لا يحتوي على بنود لنسخها إلى نطاق الفوترة.",
        scope_permission_denied:
          "ليست لديك صلاحية إنشاء مسودة نطاق فوترة معتمد.",
        scope_not_found: "لم يتم العثور على عرض السعر المصدر.",
        scope_concurrency_conflict:
          "حدث تعارض أثناء إنشاء المسودة. يرجى المحاولة مرة أخرى.",
        scope_unexpected_error:
          "حدث خطأ غير متوقع أثناء إنشاء المسودة. يرجى المحاولة مرة أخرى.",
        fallback: "تعذر إنشاء المسودة. يرجى المحاولة مرة أخرى.",
        fallbackWithCode: "تعذر إنشاء المسودة ({code}).",
      },
    },
    labels: {
      version: "إصدار النطاق",
      lineSafety: "سلامة البنود",
      acceptedGrandTotal: "الإجمالي المقبول",
      sourceQuotation: "عرض السعر المصدر",
      billingCeiling: "سقف الفوترة",
      invoicedAmount: "المبلغ المفوتر",
      remainingBillable: "المتبقي للفوترة",
    },
    statusLabels: {
      draft: "مسودة",
      approved: "معتمد",
      voided: "ملغى",
    },
    effectiveStatusLabels: {
      draft: "مسودة",
      active: "نشط",
      superseded: "مُستبدل",
      voided: "ملغى",
    },
    lineSafetyLabels: {
      pending_review: "بانتظار المراجعة",
      safe: "آمن",
      unsafe: "غير آمن",
    },
    detail: {
      title: "تفاصيل نطاق الفوترة المعتمد",
      backToService: "العودة إلى الخدمة",
      viewDetails: "عرض التفاصيل",
      unavailable: "تفاصيل نطاق الفوترة المعتمد غير متاحة مؤقتًا.",
      sectionSummary: "ملخص النطاق",
      sectionItems: "بنود النطاق المقبولة",
      sectionInvoices: "الفواتير المرتبطة",
      labels: {
        status: "الحالة",
        version: "إصدار النطاق",
        lineSafety: "سلامة البنود",
        acceptedGrandTotal: "الإجمالي المقبول",
        createdAt: "تاريخ الإنشاء",
        approvedAt: "تاريخ الاعتماد",
        description: "الوصف",
        category: "الفئة",
        decision: "القرار",
        acceptedQuantity: "الكمية المقبولة",
        unitPrice: "سعر الوحدة",
        lineTotal: "إجمالي البند المقبول",
        invoiceNumber: "رقم الفاتورة",
        invoiceType: "نوع الفاتورة",
        invoiceStatus: "الحالة",
        grandTotal: "الإجمالي",
        issueDate: "تاريخ الإصدار",
      },
      itemDecisionLabels: {
        accepted: "مقبول", adjusted: "معدل", excluded: "مستبعد", customer_supplied: "يوفره العميل",
      },
      invoiceTypeLabels: { deposit: "دفعة مقدمة", final: "نهائية" },
      invoiceStatusLabels: {
        draft: "مسودة", sent: "مرسلة", paid: "مدفوعة", partial: "مدفوعة جزئيًا",
        overdue: "متأخرة", cancelled: "ملغاة", voided: "ملغاة نهائيًا",
      },
      noItems: "لا توجد بنود نطاق متاحة.",
      noInvoices: "لا توجد فواتير مرتبطة.",
      invoicesUnavailable: "معلومات الفواتير المرتبطة غير متاحة مؤقتًا.",
      editItem: {
        trigger: "تعديل البند",
        title: "تعديل بند المسودة",
        sourceValues: "القيم المصدرية",
        acceptedValues: "القيم المقبولة",
        sourceQuantity: "كمية المصدر",
        sourceUnitPrice: "سعر وحدة المصدر",
        vatRate: "نسبة ضريبة القيمة المضافة",
        sourceLineTotal: "إجمالي بند المصدر",
        decision: "القرار",
        acceptedQuantity: "الكمية المقبولة",
        acceptedUnitPrice: "سعر الوحدة المقبول",
        acceptedLineTotal: "إجمالي البند المقبول",
        reasonCode: "رمز السبب",
        reasonNote: "ملاحظة السبب",
        reasonNoteOptional: "اختياري",
        cancel: "إلغاء",
        save: "حفظ التغييرات",
        saving: "جارٍ حفظ التغييرات…",
        success: "تم تحديث بند المسودة.",
        reasonCodeLabels: {
          customer_reduced_quantity: "تخفيض العميل للكمية",
          customer_reduced_price: "تخفيض العميل للسعر",
          customer_removed_item: "إزالة العميل للبند",
          customer_supplied: "توفير العميل",
          internal_scope_correction: "تصحيح داخلي للنطاق",
          source_pricing_issue: "مشكلة في تسعير المصدر",
          unsafe_line_item: "بند غير آمن",
          other: "أخرى",
        },
        validation: {
          adjustedValueRequired: "أدخل الكمية المقبولة أو سعر الوحدة لبند معدل.",
          reasonRequired: "اختر رمز سبب لهذا القرار.",
          quantityCannotIncrease: "لا يمكن أن تتجاوز الكمية المقبولة كمية المصدر.",
          unitPriceCannotIncrease: "لا يمكن أن يتجاوز سعر الوحدة المقبول سعر وحدة المصدر.",
        },
        errors: {
          scope_not_found: "بند نطاق الفوترة هذا لم يعد متاحًا.",
          scope_not_draft: "لا يمكن تعديل سوى مسودات نطاقات الفوترة.",
          scope_reduction_invalid: "يجب أن تتبع القيم المقبولة قواعد التخفيض فقط.",
          scope_reason_required: "رمز السبب مطلوب لهذا التغيير.",
          scope_concurrency_conflict: "تم تغيير المسودة أثناء التعديل. حدّث الصفحة وحاول مرة أخرى.",
          scope_permission_denied: "ليست لديك صلاحية تعديل بند المسودة هذا.",
          scope_unexpected_error: "تعذر تحديث بند المسودة. يرجى المحاولة مرة أخرى.",
        },
      },
      discardDraft: {
        trigger: "حذف المسودة",
        title: "حذف مسودة نطاق الفوترة؟",
        body: "سيؤدي ذلك إلى إزالة مسودة نطاق الفوترة وجميع بنودها نهائيًا.",
        cancel: "الاحتفاظ بالمسودة",
        confirm: "حذف المسودة",
        discarding: "جارٍ حذف المسودة…",
        errors: {
          scope_not_found: "مسودة نطاق الفوترة هذه لم تعد متاحة.",
          scope_not_draft: "لا يمكن حذف سوى مسودات نطاقات الفوترة.",
          scope_reduction_invalid: "تعذر حذف المسودة.",
          scope_reason_required: "تعذر حذف المسودة.",
          scope_concurrency_conflict: "تم تغيير المسودة أثناء حذفها. حدّث الصفحة وحاول مرة أخرى.",
          scope_permission_denied: "ليست لديك صلاحية حذف هذه المسودة.",
          scope_unexpected_error: "تعذر حذف المسودة. يرجى المحاولة مرة أخرى.",
        },
      },
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
    title: "مسار حالة الخدمة",
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
      showDeleted: "إظهار المحذوفة",
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
    selectedHint: "يظهر إنشاء حجز المورد أو الحجز المرتبط في اللوحة أدناه.",
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
      editPage: {
        accessDeniedTitle: "تم رفض الوصول",
        accessDeniedMessage:
          "ليست لديك صلاحية لتعديل تخصيصات الموردين.",
        serviceUnavailableTitle: "الخدمة غير متاحة",
        serviceUnavailableMessage:
          "لا يمكن تعديل تخصيص المورد لأن حالة الخدمة هي {status}.",
        cancelledTitle: "التخصيص ملغي",
        cancelledMessage: "لا يمكن تعديل تخصيص مورد ملغي.",
        rateCardTitle: "تخصيص بطاقة أسعار",
        rateCardMessage:
          "لا يمكن تعديل تخصيص مورد مبني على بطاقة أسعار يدويًا.",
        returnToService: "العودة إلى الخدمة",
        backToService: "رجوع إلى الخدمة",
        title: "تعديل التخصيص",
        subtitle: "تعديل تخصيص المورد اليدوي للخدمة",
      },
      cancelPage: {
        accessDeniedTitle: "تم رفض الوصول",
        accessDeniedMessage:
          "ليست لديك صلاحية لإلغاء تخصيصات الموردين.",
        serviceUnavailableTitle: "الخدمة غير متاحة",
        serviceUnavailableMessage:
          "لا يمكن إلغاء تخصيص المورد لأن حالة الخدمة هي {status}.",
        alreadyCancelledTitle: "التخصيص ملغي بالفعل",
        alreadyCancelledMessage: "تم إلغاء تخصيص المورد هذا مسبقًا.",
        returnToService: "العودة إلى الخدمة",
        backToService: "رجوع إلى الخدمة",
        title: "إلغاء التخصيص",
        subtitle: "إلغاء تخصيص المورد للخدمة",
      },
      deletePage: {
        accessDeniedTitle: "تم رفض الوصول",
        accessDeniedMessage:
          "ليست لديك صلاحية لحذف تخصيصات الموردين.",
        serviceUnavailableTitle: "الخدمة غير متاحة",
        serviceUnavailableMessage:
          "لا يمكن حذف تخصيص المورد لأن حالة الخدمة هي {status}.",
        alreadyDeletedTitle: "التخصيص محذوف بالفعل",
        alreadyDeletedMessage: "تم حذف تخصيص المورد هذا مسبقًا.",
        actionUnavailableTitle: "الإجراء غير متاح",
        actionUnavailableMessage:
          "يمكن حذف التخصيصات اليدوية فقط في الوقت الحالي.",
        returnToService: "العودة إلى الخدمة",
        backToService: "رجوع إلى الخدمة",
        title: "حذف التخصيص",
        subtitle: "حذف تخصيص المورد للخدمة",
      },
      restorePage: {
        accessDeniedTitle: "تم رفض الوصول",
        accessDeniedMessage:
          "ليست لديك صلاحية لاستعادة تخصيصات الموردين.",
        serviceUnavailableTitle: "الخدمة غير متاحة",
        serviceUnavailableMessage:
          "لا يمكن استعادة تخصيص المورد لأن حالة الخدمة هي {status}.",
        notDeletedTitle: "التخصيص غير محذوف",
        notDeletedMessage: "تخصيص المورد هذا نشط حاليًا.",
        actionUnavailableTitle: "الإجراء غير متاح",
        actionUnavailableMessage:
          "يمكن استعادة التخصيصات اليدوية فقط في الوقت الحالي.",
        returnToService: "العودة إلى الخدمة",
        backToService: "رجوع إلى الخدمة",
        title: "استعادة التخصيص",
        subtitle: "استعادة تخصيص المورد للخدمة",
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
          "هل أنت متأكد من حذف هذا التخصيص؟ ستتم إزالته من العرض الافتراضي، ويمكنك عرضه أو استعادته لاحقًا عبر تفعيل \"إظهار المحذوفة\".",
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
    subtitle: "حجوزات الموردين الداخلية المُنشأة من التخصيصات المحددة.",
    empty: {
      noBookings: "لا توجد حجوزات موردين مسجلة لهذه الخدمة حتى الآن.",
      selectAllocation: "حدد تخصيص مورد مخططًا لإنشاء حجز مورد.",
    },
    columns: {
      bookingNumber: "رقم حجز المورد",
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
    linkedBooking: "حجز مورد مرتبط",
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
    title: "الفوترة",
    cards: {
      approvedQuotation: "عرض السعر المعتمد",
      depositInvoice: "فاتورة دفعة مقدمة",
      finalInvoice: "الفاتورة النهائية",
      billingCalculation: "ملخص الفوترة",
      noApprovedQuotationYet: "لا يوجد عرض سعر معتمد حتى الآن",
      noActiveDepositInvoice: "لم يتم إنشاء فاتورة دفعة مقدمة بعد.",
      noActiveFinalInvoice: "لم يتم إنشاء الفاتورة النهائية بعد.",
      priorInvoiced: "المفوتر سابقاً",
      remaining: "المبلغ المتبقي",
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
      depositInvoiceAlreadyExists: "توجد فاتورة دفعة مقدمة نشطة بالفعل.",
      finalInvoiceAlreadyExists: "تم بالفعل إنشاء الفاتورة النهائية لهذه الخدمة.",
      priorInvoicesExceedQuotationTotal: "إجمالي الفواتير السابقة يتجاوز إجمالي عرض السعر المعتمد.",
      quotationNotApproved: "عرض السعر المحدد غير معتمد حتى الآن.",
      quotationServiceMismatch: "عرض السعر لا يطابق هذه الخدمة.",
      unavailable: "الإجراء غير متاح حاليًا.",
    },
    depositAction: {
      unavailable: "فاتورة الدفعة المقدمة غير متاحة.",
      amountLabel: "مبلغ الدفعة المقدمة (SAR)",
      amountPlaceholder: "0.00",
      create: "إنشاء فاتورة دفعة مقدمة",
      validation: {
        validAmount: "يرجى إدخال مبلغ رقمي صحيح.",
        amountGreaterThanZero: "يجب أن يكون مبلغ الدفعة المقدمة أكبر من 0.",
        amountCannotExceedQuotationTotal: "لا يمكن أن يتجاوز مبلغ الدفعة المقدمة إجمالي عرض السعر.",
      },
      success: "تم إنشاء فاتورة الدفعة المقدمة بنجاح. الفاتورة: {invoiceNumber}.",
      errors: {
        invalidInvoiceInput: "تم إدخال بيانات غير صحيحة.",
        depositAmountRequired: "مبلغ الدفعة المقدمة مطلوب.",
        depositAmountExceedsQuotationTotal: "مبلغ الدفعة المقدمة يتجاوز إجمالي عرض السعر.",
        depositInvoiceAlreadyExists: "توجد فاتورة دفعة مقدمة نشطة بالفعل.",
        quotationNotFound: "تعذر العثور على عرض السعر.",
        quotationNotApproved: "عرض السعر غير معتمد.",
        quotationServiceMismatch: "عرض السعر لا يطابق الخدمة الحالية.",
        companySettingsUnavailable: "إعدادات الشركة غير متاحة.",
        invoiceSnapshotUnavailable: "تعذر إنشاء لقطات الفاتورة.",
        invoiceCreationFailed: "تعذر إنشاء الفاتورة.",
        unauthorized: "يجب تسجيل الدخول لتنفيذ هذا الإجراء.",
        forbidden: "ليس لديك صلاحية لإنشاء الفواتير.",
        fallbackWithCode: "تعذر إنشاء فاتورة دفعة مقدمة. رمز الخطأ: {code}",
        fallback: "تعذر إنشاء فاتورة دفعة مقدمة. يرجى المحاولة مرة أخرى.",
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

export function getServiceStatusLabel(locale: Locale, status: ServiceStatus): string {
  const activeDictionary = getServicesDictionary(locale);
  const englishDictionary = getServicesDictionary("en");
  const key = `serviceStatuses.${status}`;

  return resolveDictionaryValue({
    activeValue: activeDictionary.serviceStatuses[status],
    category: "label",
    englishValue: englishDictionary.serviceStatuses[status],
    key,
    locale,
    namespace: "services",
    surface: "service-status",
  });
}
