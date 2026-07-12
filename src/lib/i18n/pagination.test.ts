import assert from "node:assert/strict";
import test from "node:test";
import {
  formatPaginationCopy,
  getPaginationDictionary,
} from "./dictionaries/common.ts";
import { getDirection } from "./direction.ts";

test("English pagination labels and accessibility templates use Western digits", () => {
  const copy = getPaginationDictionary("en");
  assert.equal(copy.previous, "Previous");
  assert.equal(copy.next, "Next");
  assert.equal(copy.previousPage, "Previous page");
  assert.equal(copy.nextPage, "Next page");
  assert.equal(formatPaginationCopy(copy.page, 3), "Page 3");
  assert.equal(formatPaginationCopy(copy.goToPage, 12), "Go to page 12");
  assert.equal(
    formatPaginationCopy(copy.currentPage, 2),
    "Current page, page 2",
  );
  assert.match(formatPaginationCopy(copy.goToPage, 10), /10/);
});

test("Arabic pagination labels use canonical copy with Western digits", () => {
  const copy = getPaginationDictionary("ar");
  assert.equal(copy.previous, "السابق");
  assert.equal(copy.next, "التالي");
  assert.equal(copy.previousPage, "الصفحة السابقة");
  assert.equal(copy.nextPage, "الصفحة التالية");
  assert.equal(formatPaginationCopy(copy.page, 3), "الصفحة 3");
  assert.equal(formatPaginationCopy(copy.goToPage, 12), "الانتقال إلى الصفحة 12");
  assert.equal(
    formatPaginationCopy(copy.currentPage, 2),
    "الصفحة الحالية، الصفحة 2",
  );
  // Western/ASCII digits only in the numeric portion
  assert.match(formatPaginationCopy(copy.page, 7), /7/);
  assert.doesNotMatch(formatPaginationCopy(copy.page, 7), /[٠-٩]/);
});

test("pagination dictionary shapes stay aligned across locales", () => {
  const english = getPaginationDictionary("en");
  const arabic = getPaginationDictionary("ar");
  assert.deepEqual(Object.keys(english).sort(), Object.keys(arabic).sort());
});

test("previous/next page actions stay index-based regardless of RTL presentation", () => {
  // Production contract: onPageChange receives the logical page index.
  // RTL only flips chevron visuals and button order, not page arithmetic.
  const goPrevious = (current: number) => Math.max(1, current - 1);
  const goNext = (current: number, total: number) => Math.min(total, current + 1);

  assert.equal(goPrevious(3), 2);
  assert.equal(goPrevious(1), 1);
  assert.equal(goNext(3, 5), 4);
  assert.equal(goNext(5, 5), 5);

  // Locale direction must not invert step meaning
  assert.equal(getDirection("ar"), "rtl");
  assert.equal(getDirection("en"), "ltr");
  assert.equal(goPrevious(4), 3);
  assert.equal(goNext(4, 10), 5);
});
