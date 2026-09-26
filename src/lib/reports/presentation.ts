import type { ReportCenterDictionary } from "@/lib/i18n/dictionaries/report-center";
import type { ReportDefinition } from "./types";

export type EventEconomicsView = "overview" | "cost" | "commercial";

export type EventEconomicsColumnKey =
  | "service"
  | "budget"
  | "commitment"
  | "actual"
  | "paid"
  | "outstanding"
  | "etc"
  | "eac"
  | "commercialValue"
  | "forecast"
  | "status"
  | "close"
  | "finalActual"
  | "finalMargin";

export const EVENT_ECONOMICS_VIEW_COLUMNS = {
  overview: ["service", "budget", "actual", "eac", "forecast", "status"],
  cost: ["service", "budget", "commitment", "actual", "paid", "outstanding", "etc", "eac"],
  commercial: ["service", "commercialValue", "forecast", "close", "finalActual", "finalMargin"],
} as const satisfies Record<EventEconomicsView, readonly EventEconomicsColumnKey[]>;

export function getEventEconomicsColumnAlignment(key: EventEconomicsColumnKey): "start" | "end" | "center" {
  if (key === "service" || key === "status") return "start";
  if (key === "close") return "center";
  return "end";
}

export function getEventAmountTone(amount: number | null): "unavailable" | "zero" | "meaningful" {
  if (amount === null) return "unavailable";
  if (amount === 0) return "zero";
  return "meaningful";
}

export const EVENT_ECONOMICS_VIEW_OPTIONS = [
  { key: "overview", labelKey: "overview" },
  { key: "cost", labelKey: "costAnalysis" },
  { key: "commercial", labelKey: "commercialClose" },
] as const satisfies readonly { key: EventEconomicsView; labelKey: keyof ReportCenterDictionary["event"]["views"] }[];

export function resolveEventEconomicsView(value: string | undefined): EventEconomicsView {
  return value === "cost" || value === "commercial" ? value : "overview";
}

export function buildEventEconomicsViewHref(
  view: EventEconomicsView,
  filters: Partial<Record<"asOf" | "search" | "completeness" | "closeState", string>>,
  page = 1,
): string {
  const params = new URLSearchParams();
  params.set("view", view);
  for (const key of ["asOf", "search", "completeness", "closeState"] as const) {
    const value = filters[key];
    if (value) params.set(key, value);
  }
  if (Number.isSafeInteger(page) && page > 1) params.set("page", String(page));
  return `/reports/event-economics?${params.toString()}`;
}

export function getReportTimeBasisLabel(
  definition: Pick<ReportDefinition, "timeModel">,
  dictionary: Pick<ReportCenterDictionary["workspace"], "currentOnly" | "historicalAsOf" | "periodAndAsOf">,
): string {
  if (definition.timeModel === "current_only") return dictionary.currentOnly;
  if (definition.timeModel === "historical_as_of") return dictionary.historicalAsOf;
  return dictionary.periodAndAsOf;
}
