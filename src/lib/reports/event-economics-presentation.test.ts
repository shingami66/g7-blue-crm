import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { getReportCenterDictionary } from "../i18n/dictionaries/report-center.ts";
import { EVENT_ECONOMICS_VIEW_COLUMNS, getEventAmountTone } from "./presentation.ts";

test("Event Cost & Margin exposes the approved overview, cost, and commercial column models", () => {
  assert.deepEqual(EVENT_ECONOMICS_VIEW_COLUMNS.overview, ["service", "budget", "actual", "eac", "forecast", "status"]);
  assert.deepEqual(EVENT_ECONOMICS_VIEW_COLUMNS.cost, ["service", "budget", "commitment", "actual", "paid", "outstanding", "etc", "eac"]);
  assert.deepEqual(EVENT_ECONOMICS_VIEW_COLUMNS.commercial, ["service", "commercialValue", "forecast", "close", "finalActual", "finalMargin"]);
});

test("Event summary and warning consume authoritative whole-result metadata, not page rows", () => {
  const page = readFileSync(join(import.meta.dirname, "../../app/(dashboard)/reports/event-economics/page.tsx"), "utf8");
  assert.match(page, /totalCount=\{report\.pagination\.total\}/);
  assert.match(page, /summary=\{report\.summary\}/);
  assert.match(page, /report\.summary\.completenessSummaryState === "unavailable"/);
  assert.match(page, /value === null[\s\S]*?completenessSummaryUnavailable/);
  assert.doesNotMatch(page, /getEventEconomicsSummaryCounts|report\.rows\.some/);
});

test("Event monetary presentation distinguishes real zero from unavailable amounts", () => {
  assert.equal(getEventAmountTone(0), "zero");
  assert.equal(getEventAmountTone(null), "unavailable");
  assert.equal(getEventAmountTone(1), "meaningful");
  assert.equal(getEventAmountTone(-1), "meaningful");
});

test("Event report completeness, source warning, and compact context labels are localized", () => {
  const en = getReportCenterDictionary("en").event;
  const ar = getReportCenterDictionary("ar").event;

  assert.equal(en.status, "Status");
  assert.equal(en.eventsShown, "Events shown");
  assert.match(en.completenessSummaryUnavailable, /whole-result completeness summary is unavailable/i);
  assert.equal(en.historicalLabel, "Historical");
  assert.match(en.incompleteSourceWarning, /authoritative[\s\S]*not zero/i);
  assert.equal(ar.status, "الحالة");
  assert.equal(ar.eventsShown, "الفعاليات المعروضة");
  assert.match(ar.completenessSummaryUnavailable, /ملخص اكتمال النتائج الكاملة غير متاح/);
  assert.equal(ar.historicalLabel, "تاريخي");
  assert.equal(en.paid, "Paid");
  assert.equal(en.outstanding, "Outstanding");
  assert.equal(en.etc, "Estimate to Complete (ETC)");
  assert.equal(en.eac, "Estimate at Completion (EAC)");
  assert.equal(ar.paid, "المدفوع");
  assert.equal(ar.outstanding, "المتبقي");
  assert.equal(ar.etc, "المتبقي المتوقع (ETC)");
  assert.equal(ar.eac, "عند الإتمام (EAC)");
  assert.match(ar.incompleteSourceWarning, /معتمدة[\s\S]*كأصفار/);
});
