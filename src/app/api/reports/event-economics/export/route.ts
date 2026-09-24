import { AuthDependencyError, ForbiddenError, UnauthorizedError } from "@/lib/auth/errors";
import { getCurrentSessionEffectiveLocale } from "@/lib/i18n/session-locale";
import { getReportCenterDictionary } from "@/lib/i18n/dictionaries/report-center";
import { getReportDefinitions } from "@/lib/reports/catalog";
import { DEFAULT_EXCEL_EXPORT_CHROME_AR, DEFAULT_EXCEL_EXPORT_CHROME_EN, buildExcelReportBuffer } from "@/lib/reports/exportExcel";
import { getEventEconomicsExportColumns, getEventEconomicsOverviewSummary } from "@/lib/reports/exportColumns";
import { getReportTimeBasisLabel } from "@/lib/reports/presentation";
import { readEventEconomicsExport, MAX_EXPORT_ROWS } from "@/lib/reports/reporting";
import type { ReportEventEconomicsRow } from "@/lib/reports/types";

export const dynamic = "force-dynamic";

function text(value: string | null): string | undefined { return value || undefined; }

export async function GET(request: Request) {
  const url = new URL(request.url);
  const completenessValue = url.searchParams.get("completeness");
  const completeness = completenessValue === "COMPLETE" || completenessValue === "PARTIAL" || completenessValue === "UNAVAILABLE" ? completenessValue : "all";
  const closeStateValue = url.searchParams.get("closeState");
  const closeState = closeStateValue === "open" || closeStateValue === "closed" ? closeStateValue : "all";
  try {
    const asOfDate = text(url.searchParams.get("asOf"));
    const search = text(url.searchParams.get("search"));
    const locale = await getCurrentSessionEffectiveLocale();
    const dictionary = getReportCenterDictionary(locale);
    const definition = getReportDefinitions(locale).find((item) => item.key === "event_economics")!;
    const exported = await readEventEconomicsExport({ asOfDate, search, completeness, closeState });
    const report = exported.data;
    const generatedAt = new Date();
    const fileName = `event-economics-${report.asOfDate}.xlsx`;
    const completenessLabel = completeness === "COMPLETE" ? dictionary.event.complete : completeness === "PARTIAL" ? dictionary.event.partial : completeness === "UNAVAILABLE" ? dictionary.event.unavailable : dictionary.event.allCompleteness;
    const closeStateLabel = closeState === "open" ? dictionary.event.open : closeState === "closed" ? dictionary.event.closed : dictionary.event.allCloseStates;
    const buffer = await buildExcelReportBuffer<ReportEventEconomicsRow>({
      metadata: {
        brandName: "G7 BLUE",
        reportTitle: definition.title,
        definition: definition.description,
        source: definition.sourceDomain,
        timeBasis: getReportTimeBasisLabel(definition, dictionary.workspace),
        timeZone: "Asia/Riyadh",
        generatedAt,
        filters: [
          `${dictionary.workspace.asOf}: ${report.asOfDate}`,
          `${dictionary.event.completeness}: ${completenessLabel}`,
          `${dictionary.event.closeState}: ${closeStateLabel}`,
          ...(search ? [`${dictionary.workspace.search}: ${search}`] : []),
          ...(exported.truncated ? [`${dictionary.workspace.exportedRows}: ${report.rows.length} (${dictionary.workspace.exportLimit}: ${MAX_EXPORT_ROWS})`] : []),
        ],
        totalRecords: report.pagination.total,
        fileName,
      },
      locale,
      chrome: locale === "ar" ? DEFAULT_EXCEL_EXPORT_CHROME_AR : DEFAULT_EXCEL_EXPORT_CHROME_EN,
      rows: report.rows,
      columns: getEventEconomicsExportColumns(dictionary),
      summary: { tables: [getEventEconomicsOverviewSummary(report.rows, dictionary)] },
    });
    return new Response(buffer, { headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": `attachment; filename="${fileName}"`, "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof Error && error.message === "invalid_as_of") return new Response("Invalid as-of date", { status: 400 });
    if (error instanceof UnauthorizedError) return new Response("Authentication required", { status: 401 });
    if (error instanceof ForbiddenError) return new Response("Forbidden", { status: 403 });
    if (error instanceof AuthDependencyError) return new Response("Report unavailable", { status: 503 });
    console.error("[Reports] Event export failed:", error instanceof Error ? error.message : "Unknown");
    return new Response("Report unavailable", { status: 503 });
  }
}
