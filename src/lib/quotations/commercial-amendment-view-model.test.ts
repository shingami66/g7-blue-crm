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

test("summary counts structural and optional changes even when totals are unchanged", () => {
  const predecessor = [
    item({ id: "a", description: "A", total: 100 }),
    item({ id: "b", description: "Optional B", total: 0, commercialRole: "optional_add_on", parentAuthorityLineId: "a", unitPrice: 25, isSelected: false }),
  ];
  const proposed = toCommercialAmendmentDraftLines(predecessor).map((line) => line.description === "Optional B" ? { ...line, is_selected: true, unit_price: 0 } : line);
  const summary = buildCommercialAmendmentChangeSummary({ predecessorItems: predecessor, proposedLines: proposed, currentTotal: 100, discount: 0, vatRate: 0, proposedPersistedTotal: 100 });
  assert.equal(summary.hasChanges, true);
  assert.equal(summary.optionalChanges, 1);
  assert.equal(summary.delta, 0);
});

test("dirty preview total includes the established proportional VAT basis", () => {
  const lines = toCommercialAmendmentDraftLines([item({ id: "a", description: "A", total: 100 })]);
  assert.equal(commercialAmendmentPreviewGrandTotal(lines, 10, 15), 103.5);
});

test("optional line selection controls its preview price while included components remain zero-price", () => {
  const lines = toCommercialAmendmentDraftLines([
    item({ id: "main", description: "Main item", total: 100 }),
    item({
      id: "included",
      description: "Included component",
      total: 0,
      commercialRole: "included_component",
      parentAuthorityLineId: "main",
      unitPrice: 0,
    }),
    item({
      id: "optional",
      description: "Optional item",
      total: 0,
      commercialRole: "optional_add_on",
      parentAuthorityLineId: "main",
      unitPrice: 25,
      isSelected: false,
    }),
  ]);

  assert.equal(commercialAmendmentPreviewSubtotal(lines), 100);
  assert.equal(
    commercialAmendmentPreviewSubtotal(
      lines.map((line) => line.commercial_role === "optional_add_on" ? { ...line, is_selected: true } : line),
    ),
    125,
  );
  assert.equal(lines.find((line) => line.commercial_role === "included_component")?.unit_price, 0);
});
