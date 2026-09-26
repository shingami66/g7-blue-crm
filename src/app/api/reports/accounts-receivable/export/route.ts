import { AuthDependencyError, ForbiddenError, UnauthorizedError } from "@/lib/auth/errors";
import { getCurrentSessionEffectiveLocale } from "@/lib/i18n/session-locale";
import { resolveRecordTitle } from "@/lib/i18n/record-title";
import { getReportCenterDictionary } from "@/lib/i18n/dictionaries/report-center";
import { getReportDefinitions } from "@/lib/reports/catalog";
import { DEFAULT_EXCEL_EXPORT_CHROME_AR, DEFAULT_EXCEL_EXPORT_CHROME_EN, buildExcelReportBuffer } from "@/lib/reports/exportExcel";
import { getAccountsReceivableExportColumns } from "@/lib/reports/exportColumns";
import { resolveReportFilters } from "@/lib/reports/filters";
import { getReportTimeBasisLabel } from "@/lib/reports/presentation";
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
    const definition = getReportDefinitions(locale).find((item) => item.key === "accounts_receivable")!;
    const exported = await readAccountsReceivableExport(filters);
    const report = exported.data;
    const generatedAt = new Date();
    const fileName = `accounts-receivable-${report.asOfDate}.xlsx`;
    const buffer = await buildExcelReportBuffer<ReportReceivableRow>({
      metadata: {
        brandName: "G7 BLUE",
        reportTitle: definition.title,
        definition: definition.description,
        source: definition.sourceDomain,
        timeBasis: getReportTimeBasisLabel(definition, dictionary.workspace),
        periodAsOf: `${dictionary.workspace.period}: ${report.periodFrom} – ${report.periodTo} · ${dictionary.workspace.asOf}: ${report.asOfDate}`,
        timeZone: "Asia/Riyadh",
        generatedAt,
        filters: [
          `${dictionary.workspace.asOf}: ${report.asOfDate}`,
          ...(filters.from ? [`${dictionary.workspace.fromDate}: ${filters.from}`] : []),
          ...(filters.to ? [`${dictionary.workspace.toDate}: ${filters.to}`] : []),
          ...(exported.truncated ? [`${dictionary.workspace.exportedRows}: ${report.rows.length} (${dictionary.workspace.exportLimit}: ${MAX_EXPORT_ROWS})`] : []),
        ],
        totalRecords: report.detailTotalCount,
        fileName,
      },
      locale,
      chrome: locale === "ar" ? DEFAULT_EXCEL_EXPORT_CHROME_AR : DEFAULT_EXCEL_EXPORT_CHROME_EN,
      rows: report.rows,
      columns: getAccountsReceivableExportColumns(dictionary, locale),
      summary: {
        metrics: [
          { label: dictionary.ar.billed, value: report.billedAmount, format: "currency" },
          { label: dictionary.ar.collectedCash, value: report.collectedCashAmount, format: "currency" },
          { label: dictionary.ar.outstanding, value: report.totalOutstanding, format: "currency" },
          { label: dictionary.ar.overdue, value: report.totalOverdue, format: "currency" },
        ],
        tables: [
          {
            title: dictionary.ar.ageing,
            columns: [
              { header: dictionary.ar.notDue, format: "currency", width: 18 },
              { header: dictionary.ar.oneToThirty, format: "currency", width: 18 },
              { header: dictionary.ar.thirtyOneToSixty, format: "currency", width: 18 },
              { header: dictionary.ar.sixtyOneToNinety, format: "currency", width: 18 },
              { header: dictionary.ar.ninetyOnePlus, format: "currency", width: 18 },
            ],
            rows: [[report.notDueAmount, report.ageing1To30Amount, report.ageing31To60Amount, report.ageing61To90Amount, report.ageing91PlusAmount]],
          },
          ...(report.outstandingCustomers.length > 0 ? [{
            title: dictionary.ar.customerRanking,
            columns: [
              { header: dictionary.ar.customer, format: "text" as const, width: 34 },
              { header: dictionary.ar.outstandingColumn, format: "currency" as const, width: 18 },
            ],
            rows: report.outstandingCustomers.slice(0, 10).map((customer) => [
              customer.company ? resolveRecordTitle(locale, customer.company) : dictionary.ar.noCustomerIdentity,
              customer.amount,
            ]),
          }] : []),
        ],
      },
    });
    return new Response(buffer, { headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": `attachment; filename="${fileName}"`, "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof UnauthorizedError) return new Response("Authentication required", { status: 401 });
    if (error instanceof ForbiddenError) return new Response("Forbidden", { status: 403 });
    if (error instanceof AuthDependencyError) return new Response("Report unavailable", { status: 503 });
    console.error("[Reports] AR export failed:", error instanceof Error ? error.message : "Unknown");
    return new Response("Report unavailable", { status: 503 });
  }
}
