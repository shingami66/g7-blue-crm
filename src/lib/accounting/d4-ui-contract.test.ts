import assert from "node:assert/strict";
import test from "node:test";
import { getInceptionItemLifecyclePolicy, getInceptionLifecyclePolicy } from "./inception-ui-policy.ts";
import { getAccountingStatementClassification } from "./statement-mapping-contract.ts";
import { getAccountingInceptionDictionary } from "../i18n/dictionaries/accounting-inception.ts";
import { getAccountingStatementMappingsDictionary } from "../i18n/dictionaries/accounting-statement-mappings.ts";

test("statement mapping classification follows account type and fixed W10H sections", () => {
  assert.deepEqual(getAccountingStatementClassification("REVENUE"), { statement_type: "PROFIT_LOSS", section_key: "REVENUE" });
  assert.deepEqual(getAccountingStatementClassification("EXPENSE"), { statement_type: "PROFIT_LOSS", section_key: "EXPENSE" });
  assert.deepEqual(getAccountingStatementClassification("ASSET"), { statement_type: "BALANCE_SHEET", section_key: "ASSETS" });
  assert.deepEqual(getAccountingStatementClassification("LIABILITY"), { statement_type: "BALANCE_SHEET", section_key: "LIABILITIES" });
  assert.deepEqual(getAccountingStatementClassification("EQUITY"), { statement_type: "BALANCE_SHEET", section_key: "EQUITY" });
});

test("inception lifecycle policy keeps creator, reviewer, preparer, and poster duties separate", () => {
  const base = {
    canManage: true,
    canView: true,
    canPrepare: true,
    canPost: true,
    isCreator: true,
    isReviewer: false,
    accepted: false,
    hasReview: false,
    reviewDecision: null as "APPROVE" | "REJECT" | null,
    unresolvedCount: 0,
    missingEvidenceCount: 0,
    requiredJournalCount: 1,
    pendingJournalCount: 1,
  };

  const creatorPolicy = getInceptionLifecyclePolicy(base);
  assert.equal(creatorPolicy.canRevise, true);
  assert.equal(creatorPolicy.canReview, false);
  assert.equal(creatorPolicy.canAccept, false);

  const evidenceBlockedReview = getInceptionLifecyclePolicy({
    ...base,
    isCreator: false,
    hasReview: false,
    missingEvidenceCount: 1,
  });
  assert.equal(evidenceBlockedReview.canReview, true);
  assert.equal(evidenceBlockedReview.canApprove, false);
  assert.equal(evidenceBlockedReview.canReject, true);

  const acceptanceInput = {
    ...base,
    isCreator: false,
    isReviewer: true,
    hasReview: true,
    reviewDecision: "APPROVE" as const,
    pendingJournalCount: 0,
  };
  const readyForAcceptance = getInceptionLifecyclePolicy(acceptanceInput);
  assert.equal(readyForAcceptance.canAccept, true);
  assert.equal(getInceptionLifecyclePolicy({ ...acceptanceInput, accepted: true }).canRevise, false);
  assert.equal(getInceptionLifecyclePolicy({ ...acceptanceInput, accepted: true }).canAccept, false);
  assert.equal(getInceptionLifecyclePolicy({ ...acceptanceInput, canView: false }).canAccept, false);

  const creatorAndReviewerConflict = getInceptionLifecyclePolicy({ ...acceptanceInput, isCreator: true });
  assert.equal(creatorAndReviewerConflict.canAccept, false);
});

test("inception journal preparation and posting require the approved distinct workflow roles", () => {
  const base = {
    canManage: true,
    canPrepare: true,
    canPost: true,
    isCreator: true,
    isReviewer: false,
    accepted: false,
    reviewDecision: "APPROVE" as const,
    classification: "OPENING_BALANCE" as const,
    journalStatus: null as "DRAFT" | "POSTED" | null,
    journalVersionsMatch: true,
  };
  assert.deepEqual(getInceptionItemLifecyclePolicy(base), { requiresJournal: true, canPrepare: true, canPost: false });
  assert.deepEqual(getInceptionItemLifecyclePolicy({
    ...base, isCreator: false, isReviewer: true, journalStatus: "DRAFT",
  }), { requiresJournal: true, canPrepare: false, canPost: true });
  assert.equal(getInceptionItemLifecyclePolicy({
    ...base, isCreator: false, isReviewer: true, journalStatus: "DRAFT", journalVersionsMatch: false,
  }).canPost, false);
  assert.equal(getInceptionItemLifecyclePolicy({ ...base, isReviewer: true }).canPrepare, false);
  assert.equal(getInceptionItemLifecyclePolicy({ ...base, classification: "POST_CUTOVER_SOURCE" }).canPrepare, false);
  assert.equal(getInceptionItemLifecyclePolicy({ ...base, accepted: true }).canPrepare, false);
  assert.equal(getInceptionItemLifecyclePolicy({ ...base, reviewDecision: "REJECT" }).canPrepare, false);
});

test("AAR-D4 English and Arabic dictionaries provide the same setup and workflow labels", () => {
  const inceptionEn = getAccountingInceptionDictionary("en");
  const inceptionAr = getAccountingInceptionDictionary("ar");
  const mappingsEn = getAccountingStatementMappingsDictionary("en");
  const mappingsAr = getAccountingStatementMappingsDictionary("ar");

  assert.notEqual(inceptionEn.title, inceptionAr.title);
  assert.notEqual(inceptionAr.approve, inceptionEn.approve);
  assert.ok(inceptionAr.states.classifications.OPENING_BALANCE.length > 0);
  assert.ok(inceptionAr.errors.incomplete_coverage?.length);
  assert.ok(inceptionAr.errors.evidence_required?.length);
  assert.notEqual(mappingsEn.title, mappingsAr.title);
  assert.notEqual(mappingsAr.accountTypes.ASSET, mappingsEn.accountTypes.ASSET);
  assert.notEqual(mappingsAr.sections.LIABILITIES, mappingsEn.sections.LIABILITIES);
  assert.ok(mappingsAr.errors.revision_conflict?.length);
});
