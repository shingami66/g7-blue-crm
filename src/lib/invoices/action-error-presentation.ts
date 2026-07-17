/**
 * Fail-closed presentation of untrusted Invoice action error evidence.
 *
 * Returns only pre-authored localized messages. Never interpolates, appends,
 * serializes, logs, or otherwise exposes the raw error value.
 */

export type DepositInvoiceActionErrorMessages = {
  invalidInvoiceInput: string;
  depositAmountRequired: string;
  depositAmountExceedsQuotationTotal: string;
  depositAmountExceedsRemaining: string;
  depositInvoiceAlreadyExists: string;
  quotationNotFound: string;
  quotationNotApproved: string;
  quotationServiceMismatch: string;
  companySettingsUnavailable: string;
  invoiceSnapshotUnavailable: string;
  invoiceExposureUnavailable: string;
  serviceLifecycleUnavailable: string;
  serviceNotEligibleForDeposit: string;
  invoiceCreationFailed: string;
  unauthorized: string;
  forbidden: string;
  fallback: string;
};

export type FinalInvoiceActionErrorMessages = {
  invalidInvoiceInput: string;
  finalInvoiceAlreadyExists: string;
  quotationNotFound: string;
  quotationNotApproved: string;
  quotationServiceMismatch: string;
  companySettingsUnavailable: string;
  invoiceSnapshotUnavailable: string;
  serviceLifecycleUnavailable: string;
  serviceNotEligibleForFinal: string;
  invoiceCreationFailed: string;
  unauthorized: string;
  forbidden: string;
  fallback: string;
};

function isExactKnownCode(errorEvidence: unknown): errorEvidence is string {
  return typeof errorEvidence === "string" && errorEvidence.length > 0;
}

/**
 * Map Deposit Invoice action error evidence to a safe localized message.
 * Unknown, malformed, blank, or non-string evidence always yields fallback.
 */
export function presentDepositInvoiceActionError(
  errorEvidence: unknown,
  messages: DepositInvoiceActionErrorMessages,
): string {
  if (!isExactKnownCode(errorEvidence)) {
    return messages.fallback;
  }

  switch (errorEvidence) {
    case "invalid_invoice_input":
      return messages.invalidInvoiceInput;
    case "deposit_amount_required":
      return messages.depositAmountRequired;
    case "deposit_amount_exceeds_quotation_total":
      return messages.depositAmountExceedsQuotationTotal;
    case "deposit_amount_exceeds_remaining":
      return messages.depositAmountExceedsRemaining;
    case "deposit_invoice_already_exists":
      return messages.depositInvoiceAlreadyExists;
    case "quotation_not_found":
      return messages.quotationNotFound;
    case "quotation_not_approved":
      return messages.quotationNotApproved;
    case "quotation_service_mismatch":
      return messages.quotationServiceMismatch;
    case "company_settings_unavailable":
      return messages.companySettingsUnavailable;
    case "invoice_snapshot_unavailable":
      return messages.invoiceSnapshotUnavailable;
    case "invoice_exposure_unavailable":
      return messages.invoiceExposureUnavailable;
    case "service_lifecycle_unavailable":
      return messages.serviceLifecycleUnavailable;
    case "service_not_eligible_for_deposit":
      return messages.serviceNotEligibleForDeposit;
    // Proven create-path insert failure code from createInvoiceAction.
    case "invoice_insert_failed":
    case "invoice_creation_failed":
      return messages.invoiceCreationFailed;
    case "Unauthorized":
      return messages.unauthorized;
    case "Forbidden":
      return messages.forbidden;
    default:
      return messages.fallback;
  }
}

/**
 * Map Final Invoice action error evidence to a safe localized message.
 * Unknown, malformed, blank, or non-string evidence always yields fallback.
 */
export function presentFinalInvoiceActionError(
  errorEvidence: unknown,
  messages: FinalInvoiceActionErrorMessages,
): string {
  if (!isExactKnownCode(errorEvidence)) {
    return messages.fallback;
  }

  switch (errorEvidence) {
    case "invalid_invoice_input":
      return messages.invalidInvoiceInput;
    case "final_invoice_already_exists":
      return messages.finalInvoiceAlreadyExists;
    case "quotation_not_found":
      return messages.quotationNotFound;
    case "quotation_not_approved":
      return messages.quotationNotApproved;
    case "quotation_service_mismatch":
      return messages.quotationServiceMismatch;
    case "company_settings_unavailable":
      return messages.companySettingsUnavailable;
    case "invoice_snapshot_unavailable":
      return messages.invoiceSnapshotUnavailable;
    case "service_lifecycle_unavailable":
      return messages.serviceLifecycleUnavailable;
    case "service_not_eligible_for_final":
      return messages.serviceNotEligibleForFinal;
    // Proven create-path insert failure code from createInvoiceAction.
    case "invoice_insert_failed":
    case "invoice_creation_failed":
      return messages.invoiceCreationFailed;
    case "Unauthorized":
      return messages.unauthorized;
    case "Forbidden":
      return messages.forbidden;
    default:
      return messages.fallback;
  }
}
