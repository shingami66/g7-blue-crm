import assert from "node:assert/strict";
import test from "node:test";
import { resolveCommercialAmendmentDetailAction } from "./commercial-amendment-detail-action.ts";

const CURRENT_ROOT = {
  status: "approved",
  revisionOfQuotationId: null,
  supersededAt: null,
  successor: null,
  canWrite: true,
  canApprove: false,
};

test("original current approved quotation without a successor can create an amendment", () => {
  assert.equal(resolveCommercialAmendmentDetailAction(CURRENT_ROOT), "create");
});

test("original current approved quotation opens its Draft successor", () => {
  assert.equal(
    resolveCommercialAmendmentDetailAction({
      ...CURRENT_ROOT,
      successor: { status: "draft" },
      canWrite: false,
      canApprove: true,
    }),
    "open-successor-draft",
  );
});

test("current approved successor can create the next amendment", () => {
  assert.equal(
    resolveCommercialAmendmentDetailAction({
      ...CURRENT_ROOT,
      revisionOfQuotationId: "predecessor-id",
    }),
    "create",
  );
});

test("current approved successor opens its Draft successor", () => {
  assert.equal(
    resolveCommercialAmendmentDetailAction({
      ...CURRENT_ROOT,
      revisionOfQuotationId: "predecessor-id",
      successor: { status: "draft" },
    }),
    "open-successor-draft",
  );
});

test("an approved successor keeps its existing detail navigation", () => {
  assert.equal(
    resolveCommercialAmendmentDetailAction({
      ...CURRENT_ROOT,
      successor: { status: "approved" },
    }),
    "open-successor-detail",
  );
});

test("superseded historical quotations cannot create or open a competing amendment", () => {
  assert.equal(
    resolveCommercialAmendmentDetailAction({
      ...CURRENT_ROOT,
      supersededAt: "2026-10-04T10:00:00.000Z",
    }),
    null,
  );
});

test("Draft amendment quotations retain amendment workspace navigation", () => {
  assert.equal(
    resolveCommercialAmendmentDetailAction({
      ...CURRENT_ROOT,
      status: "draft",
      revisionOfQuotationId: "predecessor-id",
    }),
    "open-draft-workspace",
  );
});
