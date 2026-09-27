import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import test from "node:test";
import { DashboardQueueRowContent } from "../../components/dashboard/DashboardQueueSecondaryValue.ts";
import {
  DASHBOARD_ACTION_PREVIEW_LIMIT,
  getDashboardActionCenterPresentation,
  getDashboardMainColumnsPresentation,
  getDashboardPreview,
} from "./presentation.ts";

test("action center omits empty groups, preserves unavailable truth, and uses owner priority order", () => {
  const visible = getDashboardActionCenterPresentation([
    { id: "service-start", status: "ready", itemCount: 2 },
    { id: "cash-advance-issue", status: "ready", itemCount: 0 },
    { id: "expense-finance-review", status: "ready", itemCount: 1 },
    { id: "quotation-approval", status: "ready", itemCount: 3 },
    { id: "invoice-follow-up", status: "ready", itemCount: 1 },
  ]);

  assert.deepEqual(visible.visibleGroupIds, [
    "invoice-follow-up",
    "quotation-approval",
    "expense-finance-review",
    "service-start",
  ]);
  assert.equal(visible.hasUnavailableSource, false);
  assert.equal(visible.showEmptyState, false);

  const allEmpty = getDashboardActionCenterPresentation([
    { id: "invoice-follow-up", status: "ready", itemCount: 0 },
    { id: "quotation-approval", status: "ready", itemCount: 0 },
  ]);
  assert.deepEqual(allEmpty.visibleGroupIds, []);
  assert.equal(allEmpty.showEmptyState, true);

  const unavailable = getDashboardActionCenterPresentation([
    { id: "invoice-follow-up", status: "unavailable", itemCount: 0 },
    { id: "quotation-approval", status: "ready", itemCount: 0 },
  ]);
  assert.equal(unavailable.hasUnavailableSource, true);
  assert.equal(unavailable.showEmptyState, false);
});

test("View all appears only when actionable rows exist beyond the rendered preview", () => {
  const items = ["one", "two", "three", "four"];
  assert.equal(DASHBOARD_ACTION_PREVIEW_LIMIT, 3);

  const twoRows = getDashboardPreview(items.slice(0, 2));
  assert.equal(twoRows.items.length, 2);
  assert.equal(twoRows.hasMore, false);

  const exactlyThreeRows = getDashboardPreview(items.slice(0, 3));
  assert.equal(exactlyThreeRows.items.length, 3);
  assert.equal(exactlyThreeRows.hasMore, false);

  const fourRows = getDashboardPreview(items);
  assert.equal(fourRows.items.length, 3);
  assert.equal(fourRows.hasMore, true);

  // The source can truthfully indicate further rows even when only three are loaded locally.
  const sourceHasMore = getDashboardPreview(items.slice(0, 3), true);
  assert.equal(sourceHasMore.items.length, 3);
  assert.equal(sourceHasMore.hasMore, true);

  assert.deepEqual(getDashboardPreview(items), {
    items: ["one", "two", "three"],
    hasMore: true,
  });
});

test("main dashboard columns omit empty permission-driven columns and retain the 5/7 split when populated", () => {
  const both = getDashboardMainColumnsPresentation({
    hasActionCenter: true,
    hasOperationsFocus: true,
    hasRecentActivity: true,
  });
  assert.deepEqual(
    [both.shouldRender, both.showActionCenter, both.showRightColumn, both.actionCenterClassName, both.rightColumnClassName],
    [true, true, true, "min-w-0 lg:col-span-5", "min-w-0 space-y-5 lg:col-span-7"],
  );

  const actionsOnly = getDashboardMainColumnsPresentation({
    hasActionCenter: true,
    hasOperationsFocus: false,
    hasRecentActivity: false,
  });
  assert.equal(actionsOnly.shouldRender, true);
  assert.equal(actionsOnly.showRightColumn, false);
  assert.equal(actionsOnly.actionCenterClassName, "min-w-0 lg:col-span-12");
  assert.equal(actionsOnly.rightColumnClassName, null);

  const rightOnly = getDashboardMainColumnsPresentation({
    hasActionCenter: false,
    hasOperationsFocus: false,
    hasRecentActivity: true,
  });
  assert.equal(rightOnly.showActionCenter, false);
  assert.equal(rightOnly.actionCenterClassName, null);
  assert.equal(rightOnly.rightColumnClassName, "min-w-0 space-y-5 lg:col-span-12");

  const noContent = getDashboardMainColumnsPresentation({
    hasActionCenter: false,
    hasOperationsFocus: false,
    hasRecentActivity: false,
  });
  assert.equal(noContent.shouldRender, false);
});

test("Action Center rows keep primary, optional trailing value, and bounded secondary context in one hierarchy", () => {
  const longDescription = "W8A expense description requiring review with Arabic details مراجعة مصروفات إضافية";
  const markup = renderToStaticMarkup(
    createElement(
      DashboardQueueRowContent,
      {
        primary: createElement("bdi", { dir: "ltr" }, "EXP-2026-0012"),
        trailing: createElement("bdi", { dir: "ltr" }, "SAR 1,250.00"),
        secondary: createElement("bdi", { dir: "auto" }, longDescription),
        secondaryCanWrap: true,
      },
    ),
  );

  assert.match(markup, /data-dashboard-queue-content="true"/);
  assert.match(markup, /data-dashboard-queue-primary="true"/);
  assert.match(markup, /data-dashboard-queue-trailing="true"/);
  assert.match(markup, /data-dashboard-queue-secondary="true"/);
  assert.match(markup, /data-dashboard-queue-wrap-safe="true"/);
  assert.match(markup, /class="[^"]*line-clamp-2[^"]*\[overflow-wrap:anywhere\]/);
  assert.match(markup, /<bdi dir="auto">W8A expense description requiring review with Arabic details مراجعة مصروفات إضافية<\/bdi>/);
  assert.ok(markup.indexOf("data-dashboard-queue-primary") < markup.indexOf("data-dashboard-queue-trailing"));
  assert.ok(markup.indexOf("data-dashboard-queue-trailing") < markup.indexOf("data-dashboard-queue-secondary"));
});
