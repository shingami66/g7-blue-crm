import assert from "node:assert/strict";
import test from "node:test";
import { buildReportPageHref, clampReportPage, getReportTotalPages, normalizeReportPage } from "./pagination.ts";

test("report page input accepts positive integer pages and protects integer RPC offsets", () => {
  assert.equal(normalizeReportPage("2", 20), 2);
  assert.equal(normalizeReportPage("1.5", 20), 1);
  assert.equal(normalizeReportPage("0", 20), 1);
  assert.equal(normalizeReportPage("-1", 20), 1);
  assert.equal(normalizeReportPage("invalid", 20), 1);
  assert.equal(normalizeReportPage("9007199254740992", 20), 1);
  assert.equal(normalizeReportPage("107374184", 20), 1);
  assert.equal(normalizeReportPage("107374183", 20), 107374183);
});

test("report page totals and final-page clamping cover empty and partial last pages", () => {
  assert.equal(getReportTotalPages(0, 20), 1);
  assert.equal(getReportTotalPages(25, 20), 2);
  assert.equal(getReportTotalPages(45, 20), 3);
  assert.equal(clampReportPage(2, 3), 2);
  assert.equal(clampReportPage(99, 3), 3);
  assert.equal(clampReportPage(99, 0), 1);
});

test("report page links preserve active report filters and analytical view", () => {
  assert.equal(
    buildReportPageHref("/reports/event-economics", {
      asOf: "2026-09-25",
      search: "Riyadh",
      completeness: "PARTIAL",
      closeState: "open",
      view: "cost",
    }, 3),
    "/reports/event-economics?asOf=2026-09-25&search=Riyadh&completeness=PARTIAL&closeState=open&view=cost&page=3",
  );
});
