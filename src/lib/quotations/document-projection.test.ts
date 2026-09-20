import assert from "node:assert/strict";
import test from "node:test";
import { groupQuotationItemsForDocument, projectQuotationItemsForDocument } from "./document-projection.ts";
import type { QuotationItem } from "./types.ts";

function item(overrides: Partial<QuotationItem>): QuotationItem {
  return {
    id: "id",
    quotationId: "quotation",
    description: "Line",
    details: null,
    category: "",
    qty: 1,
    unitPrice: 10,
    vat: 0,
    total: 10,
    commercialRole: "authority_line",
    parentAuthorityLineId: null,
    isSelected: true,
    unit: "unit",
    descriptionAr: null,
    discountAllocated: 0,
    ...overrides,
  };
}

test("quotation document projection keeps every package parent-first and contiguous", () => {
  const rootA = item({ id: "a", description: "Package A", createdAt: "2026-01-01T00:00:00Z" });
  const rootB = item({ id: "b", description: "Package B", createdAt: "2026-01-02T00:00:00Z" });
  const childA = item({
    id: "a-child",
    description: "Included A",
    commercialRole: "included_component",
    parentAuthorityLineId: "a",
    unitPrice: 0,
    total: 0,
    createdAt: "2026-01-03T00:00:00Z",
  });
  const childB = item({
    id: "b-child",
    description: "Optional B",
    commercialRole: "optional_add_on",
    parentAuthorityLineId: "b",
    isSelected: false,
    unitPrice: 30,
    total: 0,
    createdAt: "2026-01-04T00:00:00Z",
  });

  const projected = projectQuotationItemsForDocument([childA, rootB, childB, rootA]);
  const groups = groupQuotationItemsForDocument([childA, rootB, childB, rootA]);

  assert.deepEqual(projected.map((line) => line.id), ["a", "a-child", "b", "b-child"]);
  assert.deepEqual(
    groups.flatMap((group) => group.rows.map((row) => row.displayNumber)),
    ["1", "1.1", "2", "2.1"],
  );
  assert.equal(projected.length, 4);
  assert.equal(new Set(projected.map((line) => line.id)).size, 4);
});

test("nested quotation document numbering remains deterministic across persisted row order", () => {
  const root = item({ id: "root", createdAt: "2026-01-01T00:00:00Z" });
  const firstChild = item({
    id: "first-child",
    parentAuthorityLineId: "root",
    commercialRole: "included_component",
    createdAt: "2026-01-02T00:00:00Z",
  });
  const secondChild = item({
    id: "second-child",
    parentAuthorityLineId: "root",
    commercialRole: "optional_add_on",
    createdAt: "2026-01-03T00:00:00Z",
  });
  const grandchild = item({
    id: "grandchild",
    parentAuthorityLineId: "first-child",
    commercialRole: "included_component",
    createdAt: "2026-01-04T00:00:00Z",
  });

  const groups = groupQuotationItemsForDocument([grandchild, secondChild, root, firstChild]);

  assert.deepEqual(
    groups.flatMap((group) => group.rows.map((row) => [row.item.id, row.displayNumber, row.depth])),
    [
      ["root", "1", 0],
      ["first-child", "1.1", 1],
      ["grandchild", "1.1.1", 2],
      ["second-child", "1.2", 1],
    ],
  );
});

test("document projection preserves financial and commercial facts", () => {
  const lines = [
    item({ id: "root", total: 100, unitPrice: 100, discountAllocated: 10 }),
    item({
      id: "included",
      parentAuthorityLineId: "root",
      commercialRole: "included_component",
      unitPrice: 0,
      total: 0,
    }),
    item({
      id: "optional",
      parentAuthorityLineId: "root",
      commercialRole: "optional_add_on",
      isSelected: false,
      unitPrice: 25,
      total: 0,
    }),
  ];

  const before = lines.map(({ id, unitPrice, total, discountAllocated, commercialRole, parentAuthorityLineId, isSelected }) => ({
    id, unitPrice, total, discountAllocated, commercialRole, parentAuthorityLineId, isSelected,
  }));
  const groups = groupQuotationItemsForDocument(lines);
  const after = groups.flatMap((group) => group.items).map(({ id, unitPrice, total, discountAllocated, commercialRole, parentAuthorityLineId, isSelected }) => ({
    id, unitPrice, total, discountAllocated, commercialRole, parentAuthorityLineId, isSelected,
  }));

  assert.deepEqual(after.sort((left, right) => left.id.localeCompare(right.id)), before.sort((left, right) => left.id.localeCompare(right.id)));
});

test("invalid legacy children are retained once without inventing a parent", () => {
  const orphan = item({ id: "orphan", parentAuthorityLineId: "missing" });
  const projected = projectQuotationItemsForDocument([orphan]);
  assert.deepEqual(projected.map((line) => line.id), ["orphan"]);
});

test("document projection does not fall back to database row order", () => {
  const rows = [
    item({ id: "z-root", description: "Z root", createdAt: undefined }),
    item({ id: "a-root", description: "A root", createdAt: undefined }),
  ];

  assert.deepEqual(
    projectQuotationItemsForDocument(rows).map((item) => item.id),
    ["a-root", "z-root"],
  );
});
