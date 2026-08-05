export type BusinessYear = number;

export const BUSINESS_YEAR_COOKIE = "g7_business_year";

export type BusinessYearBounds = {
  start: string;
  end: string;
};

export type BusinessYearIntervalBounds = {
  start: string;
  end: string;
};

const YEAR_PATTERN = /^(\d{4})-/;

export function getCurrentBusinessYear(now = new Date()): BusinessYear {
  return Number(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Riyadh",
      year: "numeric",
    }).format(now),
  );
}

export function getBusinessYearBounds(year: BusinessYear): BusinessYearBounds {
  return { start: `${year}-01-01`, end: `${year + 1}-01-01` };
}

export function getBusinessYearIntervalBounds(
  year: BusinessYear,
): BusinessYearIntervalBounds {
  return { start: `${year}-01-01`, end: `${year}-12-31` };
}

/**
 * Services without an end date are already rendered as a single scheduled
 * date throughout the Service detail surfaces, so their effective end is the
 * recorded start date for Business Year overlap purposes.
 */
export function serviceOverlapsBusinessYear(
  startDate: string | null | undefined,
  endDate: string | null | undefined,
  year: BusinessYear,
): boolean {
  if (!startDate) return false;
  const effectiveEndDate = endDate ?? startDate;
  if (effectiveEndDate < startDate) return false;
  const bounds = getBusinessYearIntervalBounds(year);
  return startDate <= bounds.end && effectiveEndDate >= bounds.start;
}

/**
 * PostgREST OR branches for the same inclusive interval rule used by
 * serviceOverlapsBusinessYear. A missing end date is only accepted when the
 * start date itself falls inside the selected year.
 */
export function getServiceBusinessYearFilter(year: BusinessYear): string {
  const bounds = getBusinessYearIntervalBounds(year);
  return [
    `and(event_start_date.gte.${bounds.start},event_start_date.lte.${bounds.end},event_end_date.is.null)`,
    `and(event_start_date.lte.${bounds.end},event_end_date.gte.${bounds.start})`,
  ].join(",");
}

export function normalizeBusinessYear(
  value: unknown,
  currentYear = getCurrentBusinessYear(),
): BusinessYear {
  if (typeof value !== "string" && typeof value !== "number") return currentYear;
  const candidate = Number(value);
  if (!Number.isInteger(candidate) || candidate < 2000 || candidate > currentYear) {
    return currentYear;
  }
  return candidate;
}

export function parseBusinessYear(
  value: unknown,
  currentYear = getCurrentBusinessYear(),
): BusinessYear {
  return normalizeBusinessYear(value, currentYear);
}

export function cleanBusinessYearParam(
  year: BusinessYear,
  currentYear = getCurrentBusinessYear(),
): string | undefined {
  return year === currentYear ? undefined : String(year);
}

export function deriveBusinessYearOptions(
  dateValues: readonly (string | null | undefined)[],
  currentYear = getCurrentBusinessYear(),
): BusinessYear[] {
  const years = new Set<BusinessYear>([currentYear]);
  for (const value of dateValues) {
    if (!value) continue;
    const match = YEAR_PATTERN.exec(value);
    if (!match) continue;
    const year = Number(match[1]);
    if (year >= 2000 && year <= currentYear) years.add(year);
  }
  return [...years].sort((left, right) => right - left);
}
