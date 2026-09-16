import type { ListPageSize } from "@/lib/pagination";

export type SupplierAdvancesPageSize = ListPageSize;

export function supplierAdvancesHref(page: number, pageSize: SupplierAdvancesPageSize): string {
  const params = new URLSearchParams();
  if (page > 1) params.set("page", String(page));
  if (pageSize !== 10) params.set("pageSize", String(pageSize));
  const query = params.toString();
  return query ? `/supplier-advances?${query}` : "/supplier-advances";
}

export function supplierAdvancesQueryMatchesPagination(
  params: { page?: string; pageSize?: string },
  effectivePage: number,
  effectivePageSize: SupplierAdvancesPageSize,
): boolean {
  const pageMatches = params.page === undefined || params.page === String(effectivePage);
  const pageSizeMatches = params.pageSize === undefined || params.pageSize === String(effectivePageSize);
  return pageMatches && pageSizeMatches;
}
