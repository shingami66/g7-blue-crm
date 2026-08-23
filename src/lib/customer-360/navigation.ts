import { sanitizeSearchTerm } from "../search/sanitize.ts";

export function customerInvoiceWorkspaceHref(customerName: string): string | null {
  const search = sanitizeSearchTerm(customerName);
  if (!search) return null;

  const params = new URLSearchParams({ searchMode: "customer", search });
  return `/invoices?${params.toString()}`;
}
