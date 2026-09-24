import { AuthDependencyError, ForbiddenError, UnauthorizedError } from "@/lib/auth/errors";
import { getCurrentSessionEffectiveLocale } from "@/lib/i18n/session-locale";
import { getReportCenterDictionary } from "@/lib/i18n/dictionaries/report-center";
import { DEFAULT_EXCEL_EXPORT_CHROME_AR, DEFAULT_EXCEL_EXPORT_CHROME_EN, buildExcelReportBuffer } from "@/lib/reports/exportExcel";
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
    const exported = await readAccountsPayableExport({
      status,
      supplierSearch: text(url.searchParams.get("supplierSearch")),
      serviceSearch: text(url.searchParams.get("serviceSearch")),
      dueFrom: text(url.searchParams.get("dueFrom")),
      dueTo: text(url.searchParams.get("dueTo")),
    });
    const report = exported.data;
    const fileName = "accounts-payable-current.xlsx";
    const buffer = await buildExcelReportBuffer<ReportAccountsPayableRow>({
      metadata: {
        companyName: "G7",
        brandName: "G7 CRM",
        reportTitle: dictionary.ap.title,
        generatedAt: new Date(),
        filters: [
          dictionary.ap.currentOnly,
          status === "all" ? dictionary.ap.allStatuses : status,
          ...([url.searchParams.get("supplierSearch"), url.searchParams.get("serviceSearch"), url.searchParams.get("dueFrom"), url.searchParams.get("dueTo")].filter(Boolean) as string[]),
          exported.truncated ? `${dictionary.workspace.rows}: ${MAX_EXPORT_ROWS} bounded export rows` : `${dictionary.workspace.rows}: ${report.detailTotalCount}`,
        ],
        totalRecords: report.detailTotalCount,
        sheetName: dictionary.ap.title.slice(0, 31),
        fileName,
      },
      locale,
      chrome: locale === "ar" ? DEFAULT_EXCEL_EXPORT_CHROME_AR : DEFAULT_EXCEL_EXPORT_CHROME_EN,
      rows: report.rows,
      columns: [
        { header: dictionary.ap.bill, key: "billNumber", format: "text" },
        { header: dictionary.ap.supplier, key: "supplierName", format: "text", value: (row) => row.supplierName ?? dictionary.ap.noSupplierIdentity },
        { header: dictionary.ap.service, key: "serviceTitle", format: "text", value: (row) => row.serviceNumber && row.serviceTitle ? `${row.serviceNumber} · ${row.serviceTitle}` : dictionary.ap.noServiceIdentity },
        { header: dictionary.ap.invoiceDate, key: "invoiceDate", format: "date" },
        { header: dictionary.ap.dueDate, key: "dueDate", format: "date" },
        { header: dictionary.ap.status, key: "status", format: "text" },
        { header: dictionary.ap.payable, key: "payableAmount", format: "currency" },
        { header: dictionary.ap.paid, key: "paidAmount", format: "currency" },
        { header: dictionary.ap.outstanding, key: "outstandingAmount", format: "currency" },
      ],
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
