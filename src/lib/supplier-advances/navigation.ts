import type { ListPageSize } from "@/lib/pagination";
import { recordListReturnTo, recordNavigationHref, type RecordListSearchParams } from "../record-navigation/return-to.ts";

export type SupplierAdvancesPageSize = ListPageSize;
export type SupplierAdvancesSearchParams = RecordListSearchParams & { page?: string; pageSize?: string };

export function supplierAdvancesHref(page: number, pageSize: SupplierAdvancesPageSize, currentParams?: SupplierAdvancesSearchParams): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(currentParams ?? {})) {
    if (key === "page" || key === "pageSize" || key === "returnTo" || value === undefined) continue;
    for (const entry of typeof value === "string" ? [value] : value) params.append(key, entry);
  }
  if (page > 1) params.set("page", String(page));
  if (pageSize !== 10) params.set("pageSize", String(pageSize));
  const query = params.toString();
  return query ? `/supplier-advances?${query}` : "/supplier-advances";
}

export function supplierAdvancesReturnTo(params: SupplierAdvancesSearchParams): string {
  return recordListReturnTo("/supplier-advances", params);
}

export function supplierAdvanceDetailHref(id: string, returnTo: string): string {
  return recordNavigationHref("/supplier-advances", id, returnTo);
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
