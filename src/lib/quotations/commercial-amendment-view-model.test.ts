import assert from "node:assert/strict";
import test from "node:test";
import {
  buildCommercialAmendmentChangeSummary,
  commercialAmendmentPreviewGrandTotal,
  commercialAmendmentPreviewSubtotal,
  deriveCommercialAmendmentMode,
  toCommercialAmendmentDraftLines,
} from "./commercial-amendment-view-model.ts";
import type { QuotationItem } from "./types.ts";

function item(input: Partial<QuotationItem> & Pick<QuotationItem, "id" | "description" | "total">): QuotationItem {
  return {
    quotationId: "q",
    details: null,
    category: "",
    qty: 1,
    unitPrice: input.total,
    vat: 0,
    commercialRole: "authority_line",
    parentAuthorityLineId: null,
    isSelected: true,
    unit: "unit",
    descriptionAr: null,
    discountAllocated: 0,
    ...input,
  };
}

test("mode is derived from roots and children without a persisted mode field", () => {
  const roots = toCommercialAmendmentDraftLines([item({ id: "a", description: "A", total: 100 })]);
  assert.equal(deriveCommercialAmendmentMode(roots), "itemized");

  const packageLines = toCommercialAmendmentDraftLines([
    item({ id: "a", description: "A", total: 100 }),
    item({ id: "b", description: "Included B", total: 0, commercialRole: "included_component", parentAuthorityLineId: "a", unitPrice: 0 }),
  ]);
  assert.equal(deriveCommercialAmendmentMode(packageLines), "package");

  const mixedLines = [...packageLines, ...toCommercialAmendmentDraftLines([item({ id: "c", description: "Standalone C", total: 30 })]).map((line) => ({ ...line, line_key: "line-3" }))];
  assert.equal(deriveCommercialAmendmentMode(mixedLines), "mixed");
});

function summary(predecessorItems: QuotationItem[], proposedLines = toCommercialAmendmentDraftLines(predecessorItems)) {
  return buildCommercialAmendmentChangeSummary({
    predecessorItems,
    proposedLines,
    currentTotal: commercialAmendmentPreviewGrandTotal(toCommercialAmendmentDraftLines(predecessorItems), 0, 0),
    discount: 0,
    vatRate: 0,
  });
}

test("an exact clone with unique descriptions is a no-op", () => {
  const predecessor = [
    item({ id: "main", description: "Main item", total: 100 }),
    item({ id: "optional", description: "Optional item", total: 25, commercialRole: "optional_add_on", unitPrice: 25 }),
  ];

  assert.deepEqual(summary(predecessor), {
    hasChanges: false,
    addedLines: 0,
    removedLines: 0,
    changedLines: 0,
    optionalChanges: 0,
    currentTotal: 125,
    proposedTotal: 125,
    delta: 0,
  });
});

function duplicateDescriptionFixture() {
  return [
    item({ id: "main", description: "W7B controlled billable authority", total: 100000 }),
    item({
      id: "optional",
      description: "W7B controlled billable authority",
      total: 10000,
      commercialRole: "optional_add_on",
      parentAuthorityLineId: "main",
      unitPrice: 10000,
      isSelected: true,
    }),
  ];
}

test("an exact clone with duplicate descriptions across roles is a no-op", () => {
  const predecessor = duplicateDescriptionFixture();
  const proposed = toCommercialAmendmentDraftLines(predecessor).reverse();

  assert.deepEqual(summary(predecessor, proposed), {
    hasChanges: false,
    addedLines: 0,
    removedLines: 0,
    changedLines: 0,
    optionalChanges: 0,
    currentTotal: 110000,
    proposedTotal: 110000,
    delta: 0,
  });
});

test("a price change to one duplicate-description line is changed without added or removed lines", () => {
  const predecessor = duplicateDescriptionFixture();
  const proposed = toCommercialAmendmentDraftLines(predecessor).map((line) => (
    line.commercial_role === "optional_add_on" ? { ...line, unit_price: 12000 } : line
  ));
  const changeSummary = summary(predecessor, proposed);

  assert.equal(changeSummary.hasChanges, true);
  assert.equal(changeSummary.addedLines, 0);
  assert.equal(changeSummary.removedLines, 0);
  assert.equal(changeSummary.changedLines, 1);
  assert.equal(changeSummary.optionalChanges, 0);
});

test("an optional selection change stays a changed line and counts as one optional change", () => {
  const predecessor = duplicateDescriptionFixture();
  const proposed = toCommercialAmendmentDraftLines(predecessor).map((line) => (
    line.commercial_role === "optional_add_on" ? { ...line, is_selected: false } : line
  ));
  const changeSummary = summary(predecessor, proposed);

  assert.equal(changeSummary.hasChanges, true);
  assert.equal(changeSummary.addedLines, 0);
  assert.equal(changeSummary.removedLines, 0);
  assert.equal(changeSummary.changedLines, 1);
  assert.equal(changeSummary.optionalChanges, 1);
});

test("same child descriptions under different main-parent contexts do not collide", () => {
  const predecessor = [
    item({ id: "main-a", description: "Main A", total: 100 }),
    item({ id: "child-a", description: "Shared child", total: 10, commercialRole: "optional_add_on", parentAuthorityLineId: "main-a", unitPrice: 10 }),
    item({ id: "main-b", description: "Main B", total: 200 }),
    item({ id: "child-b", description: "Shared child", total: 0, commercialRole: "optional_add_on", parentAuthorityLineId: "main-b", unitPrice: 20, isSelected: false }),
  ];
  const changeSummary = summary(predecessor, toCommercialAmendmentDraftLines(predecessor).reverse());

  assert.equal(changeSummary.hasChanges, false);
  assert.equal(changeSummary.addedLines, 0);
  assert.equal(changeSummary.removedLines, 0);
  assert.equal(changeSummary.changedLines, 0);
  assert.equal(changeSummary.optionalChanges, 0);

  const movedChild = summary(predecessor, toCommercialAmendmentDraftLines(predecessor).map((line) => (
    line.line_key === "line-2" ? { ...line, parent_line_key: "line-3" } : line
  )));
  assert.equal(movedChild.addedLines, 0);
  assert.equal(movedChild.removedLines, 0);
  assert.equal(movedChild.changedLines, 1);
});

test("a child moved between same-label parents with distinct semantic attributes is changed", () => {
  const predecessor = [
    item({ id: "main-a", description: "Authority line", descriptionAr: "خط أ", category: "A", total: 100 }),
    item({ id: "child", description: "Shared child", total: 0, commercialRole: "included_component", parentAuthorityLineId: "main-a", unitPrice: 500 }),
    item({ id: "main-b", description: "Authority line", descriptionAr: "خط ب", category: "B", total: 200 }),
  ];
  const movedChild = summary(predecessor, toCommercialAmendmentDraftLines(predecessor).map((line) => (
    line.line_key === "line-2" ? { ...line, parent_line_key: "line-3" } : line
  )));

  assert.equal(movedChild.hasChanges, true);
  assert.equal(movedChild.addedLines, 0);
  assert.equal(movedChild.removedLines, 0);
  assert.equal(movedChild.changedLines, 1);

  const changedParent = summary(predecessor, toCommercialAmendmentDraftLines(predecessor).map((line) => (
    line.line_key === "line-1" ? { ...line, category: "A updated" } : line
  )));
  assert.equal(changedParent.changedLines, 1);
});

test("a genuinely new line is added", () => {
  const predecessor = [item({ id: "main", description: "Main item", total: 100 })];
  const proposed = [
    ...toCommercialAmendmentDraftLines(predecessor),
    {
      line_key: "new-line",
      parent_line_key: null,
      commercial_role: "authority_line" as const,
      description: "New item",
      description_ar: null,
      details: null,
      category: "",
      qty: 1,
      unit: "unit",
      unit_price: 25,
      is_selected: true,
    },
  ];
  const changeSummary = summary(predecessor, proposed);

  assert.equal(changeSummary.addedLines, 1);
  assert.equal(changeSummary.removedLines, 0);
  assert.equal(changeSummary.changedLines, 0);
});

test("a genuinely removed line is removed", () => {
  const predecessor = [
    item({ id: "main", description: "Main item", total: 100 }),
    item({ id: "removed", description: "Removed item", total: 25 }),
  ];
  const proposed = toCommercialAmendmentDraftLines(predecessor).filter((line) => line.line_key !== "line-2");
  const changeSummary = summary(predecessor, proposed);

  assert.equal(changeSummary.addedLines, 0);
  assert.equal(changeSummary.removedLines, 1);
  assert.equal(changeSummary.changedLines, 0);
});

test("preview keeps optional selection, included-component, VAT, and discount behavior", () => {
  const lines = toCommercialAmendmentDraftLines([
    item({ id: "main", description: "Main item", total: 100 }),
    item({
      id: "included",
      description: "Included component",
      total: 0,
      commercialRole: "included_component",
      parentAuthorityLineId: "main",
      unitPrice: 500,
    }),
    item({
      id: "optional",
      description: "Optional item",
      total: 0,
      commercialRole: "optional_add_on",
      parentAuthorityLineId: "main",
      unitPrice: 25,
      isSelected: true,
    }),
  ]);

  assert.equal(commercialAmendmentPreviewSubtotal(lines), 125);
  assert.equal(
    commercialAmendmentPreviewSubtotal(
      lines.map((line) => line.commercial_role === "optional_add_on" ? { ...line, is_selected: false } : line),
    ),
    100,
  );
  assert.equal(commercialAmendmentPreviewGrandTotal(lines, 10, 15), 132.25);
});
