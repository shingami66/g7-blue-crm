export type CommercialAmendmentValidityError =
  | "issue_date_required"
  | "issue_date_after_service_start"
  | "valid_until_before_issue_date"
  | "valid_until_after_service_start";

function isDateOnly(value: string | null | undefined): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(value + "T00:00:00.000Z");
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function validateCommercialAmendmentValidityWindow(input: {
  issueDate: string;
  validUntil: string;
  serviceStartDate: string | null | undefined;
}): CommercialAmendmentValidityError | null {
  const issueDate = isDateOnly(input.issueDate) ? input.issueDate : null;
  const validUntil = isDateOnly(input.validUntil) ? input.validUntil : null;
  const serviceStartDate = isDateOnly(input.serviceStartDate) ? input.serviceStartDate : null;

  if (!input.issueDate) return "issue_date_required";
  if (issueDate && serviceStartDate && issueDate > serviceStartDate) {
    return "issue_date_after_service_start";
  }
  if (validUntil && issueDate && validUntil < issueDate) {
    return "valid_until_before_issue_date";
  }
  if (validUntil && serviceStartDate && validUntil > serviceStartDate) {
    return "valid_until_after_service_start";
  }
  return null;
}

export function parseCommercialAmendmentUnitPriceDraft(value: string): number | null {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

export function isDateOnlyValue(value: string | null | undefined): value is string {
  return isDateOnly(value);
}
