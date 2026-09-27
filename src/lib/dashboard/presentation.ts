export const DASHBOARD_ACTION_PREVIEW_LIMIT = 3;

const ACTION_GROUP_ORDER = [
  "invoice-follow-up",
  "quotation-approval",
  "expense-finance-review",
  "cash-advance-issue",
  "service-start",
] as const;

export type DashboardActionQueueSummary = {
  id: string;
  status: "ready" | "unavailable";
  itemCount: number;
};

export function getDashboardMainColumnsPresentation({
  hasActionCenter,
  hasOperationsFocus,
  hasRecentActivity,
}: {
  hasActionCenter: boolean;
  hasOperationsFocus: boolean;
  hasRecentActivity: boolean;
}) {
  const hasRightContent = hasOperationsFocus || hasRecentActivity;
  const showActionCenter = hasActionCenter;
  const showRightColumn = hasRightContent;

  return {
    shouldRender: showActionCenter || showRightColumn,
    showActionCenter,
    showRightColumn,
    actionCenterClassName: showActionCenter
      ? `min-w-0 ${showRightColumn ? "lg:col-span-5" : "lg:col-span-12"}`
      : null,
    rightColumnClassName: showRightColumn
      ? `min-w-0 space-y-5 ${showActionCenter ? "lg:col-span-7" : "lg:col-span-12"}`
      : null,
  };
}

export function getDashboardActionCenterPresentation(
  groups: readonly DashboardActionQueueSummary[],
) {
  const visibleGroupIds = groups
    .filter((group) => group.status === "ready" && group.itemCount > 0)
    .map((group) => group.id)
    .sort((left, right) => {
      const leftIndex = ACTION_GROUP_ORDER.indexOf(left as (typeof ACTION_GROUP_ORDER)[number]);
      const rightIndex = ACTION_GROUP_ORDER.indexOf(right as (typeof ACTION_GROUP_ORDER)[number]);
      return (leftIndex < 0 ? ACTION_GROUP_ORDER.length : leftIndex)
        - (rightIndex < 0 ? ACTION_GROUP_ORDER.length : rightIndex);
    });
  const hasUnavailableSource = groups.some((group) => group.status === "unavailable");

  return {
    visibleGroupIds,
    hasUnavailableSource,
    showEmptyState: visibleGroupIds.length === 0 && !hasUnavailableSource,
  };
}

export function getDashboardPreview<T>(items: readonly T[], sourceHasMore = false) {
  return {
    items: items.slice(0, DASHBOARD_ACTION_PREVIEW_LIMIT),
    hasMore: sourceHasMore || items.length > DASHBOARD_ACTION_PREVIEW_LIMIT,
  };
}
