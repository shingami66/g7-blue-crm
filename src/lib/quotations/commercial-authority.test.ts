import assert from "node:assert/strict";
import test from "node:test";
import type { QuotationItem } from "./types.ts";
import { projectCommercialAuthority } from "./commercial-authority.ts";

function item(overrides: Partial<QuotationItem>): QuotationItem {
  return {
    id: overrides.id ?? "item",
    quotationId: "quotation-1",
    description: overrides.description ?? "Line",
    details: null,
    category: "service",
    qty: overrides.qty ?? 1,
    unitPrice: overrides.unitPrice ?? 0,
    vat: overrides.vat ?? 0,
    total: overrides.total ?? 0,
    ...overrides,
  };
}

test("projects one authority line with included and selected optional children", () => {
  const projection = projectCommercialAuthority([
    item({ id: "line-1", unitPrice: 100, total: 100 }),
    item({
      id: "included-1",
      commercialRole: "included_component",
      parentAuthorityLineId: "line-1",
      total: 0,
    }),
    item({
      id: "optional-1",
      commercialRole: "optional_add_on",
      parentAuthorityLineId: "line-1",
      isSelected: true,
      unitPrice: 25,
      total: 25,
    }),
    item({
      id: "optional-2",
      commercialRole: "optional_add_on",
      parentAuthorityLineId: "line-1",
      isSelected: false,
      unitPrice: 50,
      total: 0,
    }),
  ]);

  assert.equal(projection.issueCount, 0);
  assert.equal(projection.lines.length, 1);
  assert.equal(projection.lines[0]?.includedComponents.length, 1);
  assert.equal(projection.lines[0]?.selectedOptionalAddOns.length, 1);
  assert.equal(projection.lines[0]?.customerAmount, 125);
  assert.equal(projection.subtotal, 125);
});

test("does not create financial authority for included or unselected rows", () => {
  const projection = projectCommercialAuthority([
    item({ id: "line-1", unitPrice: 100, total: 100 }),
    item({
      id: "included-1",
      commercialRole: "included_component",
      parentAuthorityLineId: "line-1",
      unitPrice: 0,
      total: 0,
    }),
    item({
      id: "optional-1",
      commercialRole: "optional_add_on",
      parentAuthorityLineId: "line-1",
      isSelected: false,
      unitPrice: 50,
      total: 0,
    }),
  ]);

  assert.equal(projection.subtotal, 100);
  assert.equal(projection.lines[0]?.customerAmount, 100);
});

test("reports orphan components as an invalid projection", () => {
  const projection = projectCommercialAuthority([
    item({ id: "line-1", unitPrice: 100, total: 100 }),
    item({
      id: "orphan",
      commercialRole: "optional_add_on",
      parentAuthorityLineId: "missing-line",
      isSelected: true,
      total: 25,
    }),
  ]);

  assert.equal(projection.issueCount, 1);
  assert.equal(projection.subtotal, 100);
});

test("reports nested components instead of treating them as new authority", () => {
  const projection = projectCommercialAuthority([
    item({ id: "line-1", unitPrice: 100, total: 100 }),
    item({
      id: "component-1",
      commercialRole: "optional_add_on",
      parentAuthorityLineId: "line-1",
      isSelected: true,
      total: 25,
    }),
    item({
      id: "nested-component",
      commercialRole: "included_component",
      parentAuthorityLineId: "component-1",
      total: 0,
    }),
  ]);

  assert.equal(projection.issueCount, 1);
  assert.equal(projection.subtotal, 125);
});
