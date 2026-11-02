import type { ListPageSize } from "@/lib/pagination";
import { recordListReturnTo, recordNavigationHref, type RecordListSearchParams } from "../record-navigation/return-to.ts";

export type SupplierPaymentsPageSize = ListPageSize;
export type SupplierPaymentsSearchParams = RecordListSearchParams & { page?: string; pageSize?: string };

export function supplierPaymentsHref(page: number, pageSize: SupplierPaymentsPageSize, currentParams?: SupplierPaymentsSearchParams): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(currentParams ?? {})) {
    if (key === "page" || key === "pageSize" || key === "returnTo" || value === undefined) continue;
    for (const entry of typeof value === "string" ? [value] : value) params.append(key, entry);
  }
  if (page > 1) params.set("page", String(page));
  if (pageSize !== 10) params.set("pageSize", String(pageSize));
  const query = params.toString();
  return query ? `/supplier-payments?${query}` : "/supplier-payments";
}

export function supplierPaymentsReturnTo(params: SupplierPaymentsSearchParams): string {
  return recordListReturnTo("/supplier-payments", params);
}

export function supplierPaymentDetailHref(id: string, returnTo: string): string {
  return recordNavigationHref("/supplier-payments", id, returnTo);
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
