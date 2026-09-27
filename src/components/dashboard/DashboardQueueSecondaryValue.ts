import { createElement, type ReactNode } from "react";

export function DashboardQueueSecondaryValue({
  canWrap,
  children,
}: {
  canWrap: boolean;
  children?: ReactNode;
}) {
  return createElement(
    "span",
    {
      "data-dashboard-queue-secondary": "true",
      "data-dashboard-queue-wrap-safe": canWrap ? "true" : "false",
      className: canWrap
        ? "block min-w-0 line-clamp-2 text-start text-[12px] leading-4 text-on-surface-variant [overflow-wrap:anywhere]"
        : "block min-w-0 truncate text-start text-[12px] leading-4 text-on-surface-variant",
    },
    children,
  );
}

export function DashboardQueueRowContent({
  primary,
  secondary,
  secondaryCanWrap = false,
  trailing,
}: {
  primary: ReactNode;
  secondary?: ReactNode;
  secondaryCanWrap?: boolean;
  trailing?: ReactNode;
}) {
  return createElement(
    "div",
    {
      "data-dashboard-queue-content": "true",
      className: "grid min-w-0 gap-y-0.5 text-start",
    },
    createElement(
      "div",
      { className: "flex min-w-0 items-baseline justify-between gap-3" },
      createElement(
        "span",
        {
          "data-dashboard-queue-primary": "true",
          className: "min-w-0 flex-1 text-start text-[13px] font-medium leading-5 text-on-surface",
        },
        primary,
      ),
      trailing
        ? createElement(
            "span",
            {
              "data-dashboard-queue-trailing": "true",
              className:
                "shrink-0 whitespace-nowrap text-end text-[12px] font-semibold leading-4 tabular-nums text-primary",
            },
            trailing,
          )
        : null,
    ),
    secondary
      ? createElement(
          DashboardQueueSecondaryValue,
          { canWrap: secondaryCanWrap },
          secondary,
        )
      : null,
  );
}
