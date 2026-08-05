import { parseUiDateInput } from "../i18n/formatting.ts";
import type { ReportFilters } from "./types";

export type ReportFilterError = "reversed";

export function isReportDate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && parseUiDateInput(value) !== null;
}

export function resolveReportFilters(searchParams: { from?: string; to?: string }): { filters: ReportFilters; error?: ReportFilterError } {
  const from = isReportDate(searchParams.from) ? searchParams.from : undefined;
  const to = isReportDate(searchParams.to) ? searchParams.to : undefined;
  if (from && to && from > to) return { filters: { from, to }, error: "reversed" };
  return { filters: { from, to } };
}

export function getQuickReportRange(days: number, now = new Date()): ReportFilters {
  const to = new Date(now);
  const from = new Date(now);
  from.setDate(from.getDate() - days + 1);
  return { from: toInputValue(from), to: toInputValue(to) };
}

function toInputValue(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
