export const APPROVED_BILLING_SCOPE_ERROR_CODES = [
  "scope_not_found",
  "scope_source_not_approved",
  "scope_source_deleted",
  "scope_discount_not_supported",
  "scope_source_service_mismatch",
  "scope_duplicate_draft",
  "scope_no_items",
  "scope_no_billable_items",
  "scope_not_draft",
  "scope_not_safe",
  "scope_active_conflict",
  "scope_reduction_invalid",
  "scope_reason_required",
  "scope_unsafe_note_required",
  "scope_terminal_voided",
  "scope_supersede_target_required",
  "scope_supersede_service_mismatch",
  "scope_concurrency_conflict",
  "scope_permission_denied",
  "scope_unexpected_error",
] as const;

export type ApprovedBillingScopeErrorCode =
  (typeof APPROVED_BILLING_SCOPE_ERROR_CODES)[number];

export const APPROVED_BILLING_SCOPE_ERROR_MESSAGES: Record<
  ApprovedBillingScopeErrorCode,
  string
> = {
  scope_not_found: "Approved billing scope not found.",
  scope_source_not_approved:
    "The source quotation must be approved before creating or approving a billing scope.",
  scope_source_deleted:
    "The source quotation is deleted and cannot be used for billing scope work.",
  scope_discount_not_supported:
    "Approved Billing Scope V1 does not support source quotations with discount.",
  scope_source_service_mismatch:
    "The source quotation does not belong to the expected service.",
  scope_duplicate_draft:
    "An active draft billing scope already exists for this source quotation.",
  scope_no_items:
    "The source quotation does not have any items to copy into a billing scope.",
  scope_no_billable_items:
    "At least one billable item with a positive accepted total is required.",
  scope_not_draft: "Only draft billing scopes can be edited or approved.",
  scope_not_safe:
    "The billing scope must be marked safe before it can be approved.",
  scope_active_conflict:
    "Another active approved billing scope already exists for this service.",
  scope_reduction_invalid:
    "Accepted values must follow the reductions-only rules for this scope item.",
  scope_reason_required:
    "A reason code is required for this billing scope change.",
  scope_unsafe_note_required:
    "A reviewer note is required when marking line safety as unsafe.",
  scope_terminal_voided:
    "Voided billing scopes are terminal and cannot be changed.",
  scope_supersede_target_required:
    "A supersede target billing scope is required for this action.",
  scope_supersede_service_mismatch:
    "The supersede target must belong to the same service as the new scope.",
  scope_concurrency_conflict:
    "Approved billing scope creation encountered a concurrency conflict. Please try again.",
  scope_permission_denied:
    "You do not have permission to perform this approved billing scope action.",
  scope_unexpected_error:
    "An unexpected approved billing scope error occurred. Please try again.",
};

export function getApprovedBillingScopeErrorMessage(
  code: ApprovedBillingScopeErrorCode
): string {
  return APPROVED_BILLING_SCOPE_ERROR_MESSAGES[code];
}
