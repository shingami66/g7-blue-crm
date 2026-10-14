import type { AccountingInceptionClassification } from "./types";

export type InceptionReviewDecision = "APPROVE" | "REJECT" | null;

export type InceptionLifecyclePolicyInput = {
  canManage: boolean;
  canView: boolean;
  canPrepare: boolean;
  canPost: boolean;
  isCreator: boolean;
  isReviewer: boolean;
  accepted: boolean;
  hasReview: boolean;
  reviewDecision: InceptionReviewDecision;
  unresolvedCount: number;
  missingEvidenceCount: number;
  requiredJournalCount: number;
  pendingJournalCount: number;
};

export function getInceptionLifecyclePolicy(input: InceptionLifecyclePolicyInput) {
  const reviewBlocked = input.unresolvedCount > 0 || input.missingEvidenceCount > 0;
  const acceptanceBlocked = reviewBlocked || input.requiredJournalCount === 0 || input.pendingJournalCount > 0;

  const canReview = input.canManage && !input.accepted && !input.hasReview && !input.isCreator;

  return {
    readOnly: input.accepted,
    canRevise: input.canManage && !input.accepted,
    canReview,
    canApprove: canReview && !reviewBlocked,
    canReject: canReview,
    reviewBlocked,
    acceptanceBlocked,
    canAccept: input.canManage
      && input.canView
      && input.isReviewer
      && !input.isCreator
      && input.reviewDecision === "APPROVE"
      && !input.accepted
      && !acceptanceBlocked,
  };
}

export function getInceptionItemLifecyclePolicy(input: {
  canManage: boolean;
  canPrepare: boolean;
  canPost: boolean;
  isCreator: boolean;
  isReviewer: boolean;
  accepted: boolean;
  reviewDecision: InceptionReviewDecision;
  classification: AccountingInceptionClassification;
  journalStatus: "DRAFT" | "POSTED" | null;
  journalVersionsMatch: boolean;
}) {
  const requiresJournal = input.classification === "RECONSTRUCTED_HISTORY" || input.classification === "OPENING_BALANCE";

  return {
    requiresJournal,
    canPrepare: input.canManage
      && input.canPrepare
      && input.isCreator
      && !input.isReviewer
      && input.reviewDecision === "APPROVE"
      && !input.accepted
      && requiresJournal
      && input.journalStatus === null,
    canPost: input.canManage
      && input.canPost
      && input.isReviewer
      && !input.isCreator
      && input.reviewDecision === "APPROVE"
      && !input.accepted
      && input.journalStatus === "DRAFT"
      && input.journalVersionsMatch,
  };
}
