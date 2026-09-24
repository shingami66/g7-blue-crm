import { AuthDependencyError, ForbiddenError, UnauthorizedError } from "@/lib/auth/errors";
import { getCurrentSessionEffectiveLocale } from "@/lib/i18n/session-locale";
import { getReportCenterDictionary } from "@/lib/i18n/dictionaries/report-center";
import { DEFAULT_EXCEL_EXPORT_CHROME_AR, DEFAULT_EXCEL_EXPORT_CHROME_EN, buildExcelReportBuffer } from "@/lib/reports/exportExcel";
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
    const asOfValue = url.searchParams.get("asOf");
    const locale = await getCurrentSessionEffectiveLocale();
    const dictionary = getReportCenterDictionary(locale);
    const exported = await readEventEconomicsExport({ asOfDate: text(asOfValue), search: text(url.searchParams.get("search")), completeness, closeState });
    const report = exported.data;
    const fileName = `event-economics-${report.asOfDate}.xlsx`;
    const buffer = await buildExcelReportBuffer<ReportEventEconomicsRow>({
      metadata: {
        companyName: "G7",
        brandName: "G7 CRM",
        reportTitle: dictionary.event.title,
        generatedAt: new Date(),
        filters: [
          `${dictionary.workspace.asOf}: ${report.asOfDate}`,
          completeness === "all" ? dictionary.event.allCompleteness : completeness,
          closeState === "all" ? dictionary.event.allCloseStates : closeState,
          ...(url.searchParams.get("search") ? [url.searchParams.get("search") as string] : []),
          exported.truncated ? `${dictionary.workspace.rows}: ${MAX_EXPORT_ROWS} bounded export rows` : `${dictionary.workspace.rows}: ${report.pagination.total}`,
        ],
        totalRecords: report.pagination.total,
        sheetName: dictionary.event.title.slice(0, 31),
        fileName,
      },
      locale,
      chrome: locale === "ar" ? DEFAULT_EXCEL_EXPORT_CHROME_AR : DEFAULT_EXCEL_EXPORT_CHROME_EN,
      rows: report.rows,
      columns: [
        { header: dictionary.event.title, key: "serviceNumber", format: "text", value: (row) => `${row.serviceNumber} · ${row.serviceTitle}` },
        { header: dictionary.ar.customer, key: "customerName", format: "text", value: (row) => row.customerName ?? dictionary.event.noCustomerIdentity },
        { header: dictionary.event.approvedBudget, key: "approvedBudgetCost", format: "currency" },
        { header: dictionary.event.commitment, key: "openCommitment", format: "currency" },
        { header: dictionary.event.actual, key: "actualCost", format: "currency" },
        { header: dictionary.event.paid, key: "paidCost", format: "currency" },
        { header: dictionary.event.outstanding, key: "outstandingCost", format: "currency" },
        { header: dictionary.event.etc, key: "etc", format: "currency" },
        { header: dictionary.event.eac, key: "eac", format: "currency" },
        { header: dictionary.event.commercialValue, key: "netApprovedCommercialValue", format: "currency" },
        { header: dictionary.event.forecastMargin, key: "forecastMargin", format: "currency" },
        { header: dictionary.event.completeness, key: "completenessStatus", format: "text" },
        { header: dictionary.event.closeState, key: "closeState", format: "text" },
        { header: dictionary.event.finalActual, key: "finalActualCost", format: "currency" },
        { header: dictionary.event.finalMargin, key: "finalManagerialMargin", format: "currency" },
      ],
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
