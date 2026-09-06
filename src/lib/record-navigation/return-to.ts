export function safeRecordReturnTo(value: unknown, fallback: string): string {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || /[\r\n]/.test(value)) return fallback;
  const allowed = ["/customers", "/services", "/quotations", "/invoices", "/suppliers"];
  const allowedModulePath = allowed.some((prefix) => value === prefix || value.startsWith(`${prefix}?`));
  const allowedSupplierRecordPath = /^\/suppliers\/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}(?:\?[^#]*)?$/iu.test(value);
  const allowedServiceRecordPath = /^\/services\/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}(?:\?[^#]*)?$/iu.test(value);
  const allowedServiceProcurementPath = /^\/services\/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\/procurement(?:\?[^#]*)?$/iu.test(value);
  const allowedServiceCommitmentsPath = /^\/services\/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\/commitments(?:\?[^#]*)?$/iu.test(value);
  const allowedSupplierQuotationHistoryPath = /^\/suppliers\/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\/quotations(?:\?[^#]*)?$/iu.test(value);
  const allowedSupplierQuotationNewPath = /^\/suppliers\/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\/quotations\/new(?:\?[^#]*)?$/iu.test(value);
  const allowedSupplierQuotationDetailPath = /^\/suppliers\/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\/quotations\/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}(?:\?[^#]*)?$/iu.test(value);
  const allowedCustomerRecordPath = /^\/customers\/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}(?:\?[^#]*)?$/iu.test(value);
  const allowedQuotationRecordPath = /^\/quotations\/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}(?:\?[^#]*)?$/iu.test(value);
  const allowedInvoiceRecordPath = /^\/invoices\/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}(?:\?[^#]*)?$/iu.test(value);

  return (allowedModulePath || allowedSupplierRecordPath ||
    allowedServiceRecordPath ||
    allowedServiceProcurementPath ||
    allowedServiceCommitmentsPath ||
    allowedSupplierQuotationHistoryPath ||
    allowedSupplierQuotationNewPath ||
    allowedSupplierQuotationDetailPath ||
    allowedCustomerRecordPath ||
    allowedQuotationRecordPath ||
    allowedInvoiceRecordPath)
    ? value
    : fallback;
}

export function appendReturnTo(targetHref: string, returnTo: string): string {
  const url = new URL(targetHref, "https://local.g7");
  url.searchParams.set("returnTo", returnTo);
  return `${url.pathname}${url.search}`;
}

export function buildReturnToUrl(basePath: string, parentReturnTo?: string | null): string {
  if (!parentReturnTo) return basePath;
  return appendReturnTo(basePath, parentReturnTo);
}
