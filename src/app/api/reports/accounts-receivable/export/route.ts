import { AuthDependencyError, ForbiddenError, UnauthorizedError } from "@/lib/auth/errors";
import { getCurrentSessionEffectiveLocale } from "@/lib/i18n/session-locale";
import { getReportCenterDictionary } from "@/lib/i18n/dictionaries/report-center";
import { DEFAULT_EXCEL_EXPORT_CHROME_AR, DEFAULT_EXCEL_EXPORT_CHROME_EN, buildExcelReportBuffer } from "@/lib/reports/exportExcel";
import { resolveReportFilters } from "@/lib/reports/filters";
import { readAccountsReceivableExport, MAX_EXPORT_ROWS } from "@/lib/reports/reporting";
import type { ReportReceivableRow } from "@/lib/reports/types";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const { filters, error: filterError } = resolveReportFilters({
    from: url.searchParams.get("from") ?? undefined,
    to: url.searchParams.get("to") ?? undefined,
    asOf: url.searchParams.get("asOf") ?? undefined,
  });
  if (filterError) return new Response("Invalid report date range", { status: 400 });
  try {
    const locale = await getCurrentSessionEffectiveLocale();
    const dictionary = getReportCenterDictionary(locale);
    const exported = await readAccountsReceivableExport(filters);
    const report = exported.data;
    const buffer = await buildExcelReportBuffer<ReportReceivableRow>({
      metadata: {
        companyName: "G7",
        brandName: "G7 CRM",
        reportTitle: dictionary.ar.title,
        generatedAt: new Date(),
        filters: [
          `${dictionary.workspace.asOf}: ${report.asOfDate}`,
          `${dictionary.workspace.period}: ${report.periodFrom ?? ""} – ${report.periodTo ?? ""}`,
          exported.truncated ? `${dictionary.workspace.rows}: ${MAX_EXPORT_ROWS} bounded export rows` : `${dictionary.workspace.rows}: ${report.detailTotalCount}`,
        ],
        totalRecords: report.detailTotalCount,
        sheetName: dictionary.ar.title.slice(0, 31),
        fileName: `accounts-receivable-${report.asOfDate}.xlsx`,
      },
      locale,
      chrome: locale === "ar" ? DEFAULT_EXCEL_EXPORT_CHROME_AR : DEFAULT_EXCEL_EXPORT_CHROME_EN,
      rows: report.rows,
      columns: [
        { header: dictionary.ar.invoice, key: "invoiceNumber", format: "text", value: (row) => row.invoiceNumber },
        { header: dictionary.ar.customer, key: "customerName", format: "text", value: (row) => row.customerName ?? dictionary.ar.noCustomerIdentity },
        { header: dictionary.ar.service, key: "serviceTitle", format: "text", value: (row) => row.serviceNumber && row.serviceTitle ? `${row.serviceNumber} · ${row.serviceTitle}` : dictionary.ar.noServiceIdentity },
        { header: dictionary.ar.issueDate, key: "issueDate", format: "date" },
        { header: dictionary.ar.dueDate, key: "dueDate", format: "date" },
        { header: dictionary.ar.gross, key: "grossAmount", format: "currency" },
        { header: dictionary.ar.credits, key: "creditAdjustmentAmount", format: "currency", value: (row) => row.creditAdjustmentAmount + row.creditApplicationAmount },
        { header: dictionary.ar.net, key: "netReceivableAmount", format: "currency" },
        { header: dictionary.ar.settled, key: "settledAmount", format: "currency" },
        { header: dictionary.ar.outstandingColumn, key: "outstandingAmount", format: "currency" },
      ],
    });
    return new Response(buffer, { headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": `attachment; filename="${`accounts-receivable-${report.asOfDate}.xlsx`}"`, "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof UnauthorizedError) return new Response("Authentication required", { status: 401 });
    if (error instanceof ForbiddenError) return new Response("Forbidden", { status: 403 });
    if (error instanceof AuthDependencyError) return new Response("Report unavailable", { status: 503 });
    console.error("[Reports] AR export failed:", error instanceof Error ? error.message : "Unknown");
    return new Response("Report unavailable", { status: 503 });
  }
}
