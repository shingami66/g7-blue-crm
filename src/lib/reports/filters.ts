import { parseUiDateInput } from "../i18n/formatting.ts";
import type { ReportFilters } from "./types";
import { parseBusinessYear } from "../business-year.ts";

export type ReportFilterError = "reversed";

export function isReportDate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && parseUiDateInput(value) !== null;
}

export function resolveReportFilters(searchParams: { year?: string; from?: string; to?: string }): { filters: ReportFilters; error?: ReportFilterError } {
  const year = parseBusinessYear(searchParams.year);
  const from = isReportDate(searchParams.from) ? searchParams.from : undefined;
  const to = isReportDate(searchParams.to) ? searchParams.to : undefined;
  const filters: ReportFilters = { from, to };
  if (year) filters.year = year;
  if (from && to && from > to) return { filters, error: "reversed" };
  return { filters };
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
