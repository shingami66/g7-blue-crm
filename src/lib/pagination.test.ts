import assert from "node:assert/strict";
import test from "node:test";
import {
  getPaginationItems,
  LIST_PAGE_SIZES,
  normalizeListPage,
  normalizeListPageSize,
} from "./pagination.ts";

test("page size normalization accepts only 10, 20, and 50", () => {
  assert.deepEqual(LIST_PAGE_SIZES, [10, 20, 50]);
  assert.equal(normalizeListPageSize("20"), 20);
  assert.equal(normalizeListPageSize(50), 50);
  assert.equal(normalizeListPageSize("25"), 10);
  assert.equal(normalizeListPageSize("0"), 10);
});

test("page normalization clamps malformed and unsafe values to the first page", () => {
  assert.equal(normalizeListPage("3"), 3);
  assert.equal(normalizeListPage(4), 4);
  assert.equal(normalizeListPage("0"), 1);
  assert.equal(normalizeListPage("-2"), 1);
  assert.equal(normalizeListPage("999999999999999999999"), 1);
});

test("bounded page windows cover first, middle, last, and ellipsis cases", () => {
  assert.deepEqual(getPaginationItems(1, 1), [1]);
  assert.deepEqual(getPaginationItems(1, 2), [1, 2]);
  assert.deepEqual(getPaginationItems(1, 10), [1, 2, 3, 4, 5, "ellipsis", 10]);
  assert.deepEqual(getPaginationItems(5, 10), [1, "ellipsis", 4, 5, 6, "ellipsis", 10]);
  assert.deepEqual(getPaginationItems(10, 10), [1, "ellipsis", 6, 7, 8, 9, 10]);
});
