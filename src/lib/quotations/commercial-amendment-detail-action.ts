export type CommercialAmendmentDetailAction =
  | "create"
  | "open-successor-draft"
  | "open-successor-detail"
  | "open-draft-workspace"
  | null;

type CommercialAmendmentDetailActionInput = {
  status: string;
  revisionOfQuotationId?: string | null;
  supersededAt?: string | null;
  successor?: { status: string } | null;
  canWrite: boolean;
  canApprove: boolean;
};

/**
 * Resolves the single Commercial Amendment action for a quotation detail page.
 * Current approved authority, rather than root-lineage membership, controls
 * whether a successor amendment can be created or opened.
 */
export function resolveCommercialAmendmentDetailAction({
  status,
  revisionOfQuotationId,
  supersededAt,
  successor,
  canWrite,
  canApprove,
}: CommercialAmendmentDetailActionInput): CommercialAmendmentDetailAction {
  if (status === "draft") {
    return revisionOfQuotationId && canWrite ? "open-draft-workspace" : null;
  }

  if (status !== "approved" || supersededAt) {
    return null;
  }

  if (successor) {
    if (!canWrite && !canApprove) {
      return null;
    }
    return successor.status === "draft" ? "open-successor-draft" : "open-successor-detail";
  }

  return canWrite ? "create" : null;
}
