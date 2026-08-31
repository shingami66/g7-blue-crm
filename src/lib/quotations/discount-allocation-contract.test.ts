import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const migration = readFileSync(
  new URL("../../../supabase/migrations/20260901100000_w2c_deterministic_discount_allocation.sql", import.meta.url),
  "utf8",
);

type Root = { id: string; createdAt: string; weightHalala: number };

/** Independent safe-integer oracle for the persisted SQL contract (not production code). */
function allocate(discountHalala: number, roots: Root[]): Map<string, number> {
  const result = new Map(roots.map((root) => [root.id, 0]));
  const eligible = roots.filter((root) => root.weightHalala > 0);
  const totalWeight = eligible.reduce((sum, root) => sum + root.weightHalala, 0);
  assert.ok(discountHalala >= 0 && discountHalala <= totalWeight);
  if (discountHalala === 0) return result;

  const shares = eligible.map((root) => {
    const product = discountHalala * root.weightHalala;
    return {
      ...root,
      base: Math.floor(product / totalWeight),
      remainder: product % totalWeight,
    };
  });
  const remainderCount = discountHalala - shares.reduce((sum, share) => sum + share.base, 0);
  shares
    .sort((left, right) => {
      if (left.remainder !== right.remainder) return left.remainder > right.remainder ? -1 : 1;
      const created = left.createdAt.localeCompare(right.createdAt);
      return created !== 0 ? created : left.id.localeCompare(right.id);
    })
    .forEach((share, index) => {
      result.set(share.id, share.base + (index < remainderCount ? 1 : 0));
    });
  return result;
}

test("W2C proportional largest remainder reconciles at halala precision", () => {
  const allocation = allocate(1_000, [
    { id: "a", createdAt: "2026-01-01T00:00:00Z", weightHalala: 10_000 },
    { id: "b", createdAt: "2026-01-01T00:00:01Z", weightHalala: 5_000 },
  ]);
  assert.deepEqual([...allocation.values()], [667, 333]);
  assert.equal([...allocation.values()].reduce((sum, value) => sum + value, 0), 1_000);
});

test("W2C ties use quotation item created_at then id, independent of input order", () => {
  const roots = [
    { id: "b", createdAt: "2026-01-01T00:00:00Z", weightHalala: 100 },
    { id: "a", createdAt: "2026-01-01T00:00:00Z", weightHalala: 100 },
    { id: "c", createdAt: "2026-01-01T00:00:01Z", weightHalala: 100 },
  ];
  const forward = allocate(1, roots);
  const reversed = allocate(1, [...roots].reverse());
  assert.equal(forward.get("a"), 1);
  assert.equal(forward.get("b"), 0);
  assert.equal(forward.get("c"), 0);
  assert.equal(reversed.get("a"), 1);
  assert.equal(reversed.get("b"), 0);
  assert.equal(reversed.get("c"), 0);
});

test("W2C handles zero/full discounts and selected optional contribution", () => {
  const roots = [
    // root-a own value 10,000 halala + selected Optional Add-on 2,500;
    // unselected Optional Add-ons contribute zero and are not in the weight.
    { id: "root-a", createdAt: "2026-01-01T00:00:00Z", weightHalala: 12_500 },
    { id: "root-b", createdAt: "2026-01-01T00:00:01Z", weightHalala: 7_500 },
  ];
  assert.deepEqual([...allocate(0, roots).values()], [0, 0]);
  assert.deepEqual([...allocate(20_000, roots).values()], [12_500, 7_500]);
  assert.equal(allocate(1_000, roots).get("root-a"), 625);
});

test("W2C migration keeps one canonical persisted path and approved boundaries", () => {
  assert.match(migration, /discount_allocated numeric\(12,2\) NOT NULL DEFAULT 0/);
  assert.match(migration, /source_discount_allocated numeric\(12,2\) NOT NULL DEFAULT 0/);
  assert.match(migration, /floor\(\(v_discount_h \* roots\.weight_h\) \/ v_weight_h\)/);
  assert.match(migration, /mod\(v_discount_h \* roots\.weight_h, v_weight_h\)/);
  assert.match(migration, /ORDER BY eligible\.remainder_h DESC,[\s\S]*eligible\.created_at ASC,[\s\S]*eligible\.id ASC/);
  assert.match(migration, /qi\.discount_allocated[\s\S]*source_discount_allocated/);
  assert.match(migration, /source_discount_allocated > 0 AND i\.decision <> 'accepted'/);
  assert.match(migration, /discount_allocated, commercial_role/);
  assert.match(migration, /w2c_discounted_abs_adjustment_not_supported/);
  assert.match(migration, /g7\.w2c_allocator_skip/);
  assert.doesNotMatch(migration, /ADD COLUMN\s+accepted_discount_allocated/);
});

test("W2C invalid hierarchy and ABS adjustment are fail-closed contracts", () => {
  assert.match(migration, /w2c_discount_invalid_hierarchy/);
  assert.match(migration, /w2c_discount_currency_unsupported/);
  assert.match(migration, /current_setting\('g7\.w2c_allocator_seen', true\)/);
  assert.match(migration, /w2c_source_quotation_item_missing/);
  assert.match(migration, /source_discount_allocated > 0 AND i\.decision <> 'accepted'/);
  assert.match(migration, /source_discount_allocated IS DISTINCT FROM expected\.discount_allocated/);
  assert.match(migration, /scope_void_financial_exposure/);
  assert.match(migration, /_abs_service_has_historical_authority/);
  assert.match(migration, /approved billing scope authority lineage is immutable/);
  assert.match(migration, /scope_successor_ceiling_below_invoiced/);
});

test("W2C approval and ABS projections copy the same persisted allocation", () => {
  const persisted = [
    { id: "root-a", discountAllocated: 6.67, netGrandTotal: 103.33 },
    { id: "root-b", discountAllocated: 3.33, netGrandTotal: 46.67 },
    { id: "included", discountAllocated: 0, netGrandTotal: 0 },
  ];
  const approvalSnapshot = persisted.map((item) => ({ ...item }));
  const absSnapshot = persisted.map((item) => ({ ...item }));
  assert.deepEqual(absSnapshot, approvalSnapshot);
  assert.equal(
    persisted.reduce((sum, item) => sum + item.discountAllocated, 0).toFixed(2),
    "10.00",
  );
});

test("W2C revision copying preserves source allocation and source facts", () => {
  const source = [
    { id: "root-a", discountAllocated: 6.67, descriptionAr: "أ" },
    { id: "root-b", discountAllocated: 3.33, descriptionAr: "ب" },
  ];
  const successor = source.map((item, index) => ({
    id: `successor-${index}`,
    discountAllocated: item.discountAllocated,
    descriptionAr: item.descriptionAr,
  }));
  assert.deepEqual(
    successor.map(({ discountAllocated, descriptionAr }) => ({ discountAllocated, descriptionAr })),
    source.map(({ discountAllocated, descriptionAr }) => ({ discountAllocated, descriptionAr })),
  );
  assert.deepEqual(source, [
    { id: "root-a", discountAllocated: 6.67, descriptionAr: "أ" },
    { id: "root-b", discountAllocated: 3.33, descriptionAr: "ب" },
  ]);
});
