import type { ListPageSize } from "@/lib/pagination";

export type SupplierPaymentsPageSize = ListPageSize;

export function supplierPaymentsHref(page: number, pageSize: SupplierPaymentsPageSize): string {
  const params = new URLSearchParams();
  if (page > 1) params.set("page", String(page));
  if (pageSize !== 10) params.set("pageSize", String(pageSize));
  const query = params.toString();
  return query ? `/supplier-payments?${query}` : "/supplier-payments";
}

export function supplierPaymentsQueryMatchesPagination(
  params: { page?: string; pageSize?: string },
  effectivePage: number,
  effectivePageSize: SupplierPaymentsPageSize,
): boolean {
  const pageMatches = params.page === undefined || params.page === String(effectivePage);
  const pageSizeMatches = params.pageSize === undefined || params.pageSize === String(effectivePageSize);
  return pageMatches && pageSizeMatches;
}
