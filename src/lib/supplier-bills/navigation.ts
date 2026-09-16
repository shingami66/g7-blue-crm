export type SupplierBillsPageSize = 10 | 20 | 50;

export function supplierBillsHref(page: number, pageSize: SupplierBillsPageSize): string {
  const params = new URLSearchParams();
  if (page > 1) params.set("page", String(page));
  if (pageSize !== 10) params.set("pageSize", String(pageSize));
  const query = params.toString();
  return query ? `/supplier-bills?${query}` : "/supplier-bills";
}

export function supplierBillsQueryMatchesPagination(
  params: { page?: string; pageSize?: string },
  effectivePage: number,
  effectivePageSize: SupplierBillsPageSize,
): boolean {
  const pageMatches = params.page === undefined || params.page === String(effectivePage);
  const pageSizeMatches = params.pageSize === undefined || params.pageSize === String(effectivePageSize);
  return pageMatches && pageSizeMatches;
}
