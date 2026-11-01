import { recordNavigationHref } from "../record-navigation/return-to.ts";

export type SupplierBillsPageSize = 10 | 20 | 50;

export type SupplierBillsSearchParams = Readonly<Record<string, string | string[] | undefined>> & {
  page?: string;
  pageSize?: string;
};

export function supplierBillsHref(
  page: number,
  pageSize: SupplierBillsPageSize,
  currentParams?: SupplierBillsSearchParams,
): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(currentParams ?? {})) {
    if (key === "page" || key === "pageSize" || key === "returnTo" || value === undefined) continue;
    for (const entry of typeof value === "string" ? [value] : value) params.append(key, entry);
  }
  if (page > 1) params.set("page", String(page));
  if (pageSize !== 10) params.set("pageSize", String(pageSize));
  const query = params.toString();
  return query ? `/supplier-bills?${query}` : "/supplier-bills";
}

export function supplierBillsReturnTo(params: SupplierBillsSearchParams): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (key === "returnTo" || value === undefined) continue;
    for (const entry of typeof value === "string" ? [value] : value) query.append(key, entry);
  }
  const search = query.toString();
  return search ? `/supplier-bills?${search}` : "/supplier-bills";
}

export function supplierBillDetailHref(id: string, returnTo: string): string {
  return recordNavigationHref("/supplier-bills", id, returnTo);
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
