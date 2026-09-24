import { AuthDependencyError, ForbiddenError, UnauthorizedError } from "@/lib/auth/errors";
import { getCurrentSessionEffectiveLocale } from "@/lib/i18n/session-locale";
import { getReportCenterDictionary } from "@/lib/i18n/dictionaries/report-center";
import { getReportDefinitions } from "@/lib/reports/catalog";
import { DEFAULT_EXCEL_EXPORT_CHROME_AR, DEFAULT_EXCEL_EXPORT_CHROME_EN, buildExcelReportBuffer } from "@/lib/reports/exportExcel";
import { getAccountsPayableExportColumns } from "@/lib/reports/exportColumns";
import { getReportTimeBasisLabel } from "@/lib/reports/presentation";
import { readAccountsPayableExport, MAX_EXPORT_ROWS } from "@/lib/reports/reporting";
import type { ReportAccountsPayableRow } from "@/lib/reports/types";

export const dynamic = "force-dynamic";

function text(value: string | null): string | undefined { return value || undefined; }

export async function GET(request: Request) {
  const url = new URL(request.url);
  const statusValue = url.searchParams.get("status");
  const status = statusValue === "unpaid" || statusValue === "partially_paid" || statusValue === "paid" ? statusValue : "all";
  try {
    const locale = await getCurrentSessionEffectiveLocale();
    const dictionary = getReportCenterDictionary(locale);
    const definition = getReportDefinitions(locale).find((item) => item.key === "accounts_payable")!;
    const supplierSearch = text(url.searchParams.get("supplierSearch"));
    const serviceSearch = text(url.searchParams.get("serviceSearch"));
    const dueFrom = text(url.searchParams.get("dueFrom"));
    const dueTo = text(url.searchParams.get("dueTo"));
    const exported = await readAccountsPayableExport({ status, supplierSearch, serviceSearch, dueFrom, dueTo });
    const report = exported.data;
    const generatedAt = new Date();
    const fileName = "accounts-payable-current.xlsx";
    const statusLabel = status === "unpaid" ? dictionary.ap.unpaid : status === "partially_paid" ? dictionary.ap.partiallyPaid : status === "paid" ? dictionary.ap.paidStatus : dictionary.ap.allStatuses;
    const buffer = await buildExcelReportBuffer<ReportAccountsPayableRow>({
      metadata: {
        brandName: "G7 BLUE",
        reportTitle: definition.title,
        definition: definition.description,
        source: definition.sourceDomain,
        timeBasis: getReportTimeBasisLabel(definition, dictionary.workspace),
        timeZone: "Asia/Riyadh",
        generatedAt,
        filters: [
          dictionary.ap.currentOnly,
          `${dictionary.ap.status}: ${statusLabel}`,
          ...(supplierSearch ? [`${dictionary.ap.supplier}: ${supplierSearch}`] : []),
          ...(serviceSearch ? [`${dictionary.ap.service}: ${serviceSearch}`] : []),
          ...(dueFrom ? [`${dictionary.workspace.fromDate}: ${dueFrom}`] : []),
          ...(dueTo ? [`${dictionary.workspace.toDate}: ${dueTo}`] : []),
          ...(exported.truncated ? [`${dictionary.workspace.exportedRows}: ${report.rows.length} (${dictionary.workspace.exportLimit}: ${MAX_EXPORT_ROWS})`] : []),
        ],
        totalRecords: report.detailTotalCount,
        fileName,
      },
      locale,
      chrome: locale === "ar" ? DEFAULT_EXCEL_EXPORT_CHROME_AR : DEFAULT_EXCEL_EXPORT_CHROME_EN,
      rows: report.rows,
      columns: getAccountsPayableExportColumns(dictionary),
      summary: {
        metrics: [
          { label: dictionary.ap.payable, value: report.payableAmount, format: "currency" },
          { label: dictionary.ap.paid, value: report.paidAmount, format: "currency" },
          { label: dictionary.ap.outstanding, value: report.outstandingAmount, format: "currency" },
          { label: dictionary.ap.openBills, value: report.openBillCount, format: "number" },
        ],
      },
    });
    return new Response(buffer, { headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": `attachment; filename="${fileName}"`, "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof UnauthorizedError) return new Response("Authentication required", { status: 401 });
    if (error instanceof ForbiddenError) return new Response("Forbidden", { status: 403 });
    if (error instanceof AuthDependencyError) return new Response("Report unavailable", { status: 503 });
    console.error("[Reports] AP export failed:", error instanceof Error ? error.message : "Unknown");
    return new Response("Report unavailable", { status: 503 });
  }
}
