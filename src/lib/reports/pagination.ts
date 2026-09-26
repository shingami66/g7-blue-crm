import { normalizeListPage } from "../pagination.ts";

const MAX_POSTGRES_INTEGER = 2_147_483_647;

export function normalizeReportPage(value: unknown, pageSize = 20): number {
  const page = normalizeListPage(value);
  if (!Number.isSafeInteger(pageSize) || pageSize < 1) return 1;

  const maxPageForOffset = Math.floor(MAX_POSTGRES_INTEGER / pageSize) + 1;
  return page <= maxPageForOffset ? page : 1;
}

export function getReportTotalPages(total: number, pageSize = 20): number {
  if (!Number.isFinite(total) || !Number.isSafeInteger(pageSize) || pageSize < 1) return 1;
  return Math.max(1, Math.ceil(Math.max(0, total) / pageSize));
}

export function clampReportPage(page: number, totalPages: number): number {
  const normalizedPage = normalizeListPage(page);
  const normalizedTotalPages = normalizeListPage(totalPages);
  return Math.min(normalizedPage, normalizedTotalPages);
}

export function buildReportPageHref(
  pathname: string,
  query: Record<string, string | undefined>,
  page: number,
): string {
  const params = new URLSearchParams();
  Object.entries({ ...query, page: String(normalizeListPage(page)) }).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });
  return `${pathname}?${params.toString()}`;
}
