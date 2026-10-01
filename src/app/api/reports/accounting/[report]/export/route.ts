import { AuthDependencyError, ForbiddenError, UnauthorizedError } from "@/lib/auth/errors";
import { formatHalalahForExcel } from "@/lib/accounting/exact-money";
import { getAccountingW10HReport } from "@/lib/accounting/queries";
import { getW10HTotalLabel } from "@/lib/accounting/w10h-presentation";
import { accountingW10HReportInputSchema } from "@/lib/accounting/schemas";
import { getCurrentSessionEffectiveLocale } from "@/lib/i18n/session-locale";
import { getReportCenterDictionary } from "@/lib/i18n/dictionaries/report-center";
import { getReportDefinitions } from "@/lib/reports/catalog";
import {
  DEFAULT_EXCEL_EXPORT_CHROME_AR,
  DEFAULT_EXCEL_EXPORT_CHROME_EN,
  buildExcelReportBuffer,
  type ExcelColumn,
  type ExcelSummaryTable,
} from "@/lib/reports/exportExcel";
import { getReportTimeBasisLabel } from "@/lib/reports/presentation";

export const dynamic = "force-dynamic";

type FlatRow = Record<string, unknown>;
const REPORT_TYPES: Record<string, "GENERAL_LEDGER" | "TRIAL_BALANCE" | "PROFIT_AND_LOSS" | "BALANCE_SHEET"> = {
  "general-ledger": "GENERAL_LEDGER",
  "trial-balance": "TRIAL_BALANCE",
  "profit-and-loss": "PROFIT_AND_LOSS",
  "balance-sheet": "BALANCE_SHEET",
};
const EXPORT_PAGE_SIZE = 500;
const EXPORT_LIMIT = 50_000;

function field(row: FlatRow, key: string, locale: "en" | "ar"): string {
  const localizedKey = locale === "ar" && key === "label_en" ? "label_ar"
    : locale === "ar" && key === "account_name_en" ? "account_name_ar" : key;
  const value = row[localizedKey];
  if (value === null || value === undefined) return "";
  if (typeof value === "string" && key.endsWith("halalah")) {
    try { return formatHalalahForExcel(value); } catch { return value; }
  }
  return typeof value === "string" || typeof value === "number" || typeof value === "boolean"
    ? String(value)
    : JSON.stringify(value);
}

function columnsFor(reportType: FlatRow["report_type"], rows: FlatRow[], locale: "en" | "ar"): ExcelColumn<FlatRow>[] {
  const isArabic = locale === "ar";
  const keys = reportType === "GENERAL_LEDGER"
    ? ["accounting_date", "journal_id", "journal_version", "source_domain", "account_code", "account_name_en", "side", "amount_halalah", "service_id", "service_number", "reversal_of_journal_id", "correction_group_id"]
    : reportType === "TRIAL_BALANCE"
      ? ["account_code", "account_name_en", "opening_debit_halalah", "opening_credit_halalah", "period_debit_halalah", "period_credit_halalah", "ending_debit_halalah", "ending_credit_halalah", "journal_evidence"]
      : ["section_key", "line_key", "label_en", "account_code", "account_name_en", "amount_halalah", "journal_evidence"];
  const labels: Record<string, [string, string]> = {
    accounting_date: ["Accounting date", "تاريخ المحاسبة"], journal_id: ["Journal ID", "معرّف القيد"],
    journal_version: ["Journal version", "إصدار القيد"], source_domain: ["Source domain", "مجال المصدر"],
    account_code: ["Account code", "رمز الحساب"], account_name_en: ["Account name", "اسم الحساب"],
    side: ["Side", "الطرف"], amount_halalah: ["Amount (SAR)", "المبلغ (ريال سعودي)"],
    service_id: ["Service ID", "معرّف الخدمة"], service_number: ["Service", "الخدمة"],
    reversal_of_journal_id: ["Reversal of", "يعكس القيد"], correction_group_id: ["Correction group", "مجموعة التصحيح"],
    opening_debit_halalah: ["Opening debit", "مدين أول المدة"], opening_credit_halalah: ["Opening credit", "دائن أول المدة"],
    period_debit_halalah: ["Period debit", "مدين الفترة"], period_credit_halalah: ["Period credit", "دائن الفترة"],
    ending_debit_halalah: ["Ending debit", "مدين آخر المدة"], ending_credit_halalah: ["Ending credit", "دائن آخر المدة"],
    section_key: ["Section", "القسم"], line_key: ["Statement line", "بند القوائم"], label_en: ["Line label", "اسم البند"],
    journal_evidence: ["Journal evidence", "أدلة القيود"],
  };
  return keys.map((key) => ({
    header: labels[key]?.[isArabic ? 1 : 0] ?? key,
    key,
    format: "text",
    width: key.includes("journal") || key.endsWith("_id") ? 34 : key.includes("name") ? 30 : 20,
    value: (row) => field(row, key, locale),
  }));
}

function summaryTable(accounts: FlatRow[], locale: "en" | "ar"): ExcelSummaryTable | undefined {
  if (!accounts.length) return undefined;
  const arabic = locale === "ar";
  const headers = arabic
    ? ["رمز الحساب", "الحساب", "الرصيد الافتتاحي", "مدين الفترة", "دائن الفترة", "الرصيد الختامي"]
    : ["Account code", "Account", "Opening", "Period debit", "Period credit", "Closing"];
  const amountKeys = ["opening_balance_halalah", "debit_activity_halalah", "credit_activity_halalah", "closing_balance_halalah"];
  return {
    title: arabic ? "ملخص الأستاذ حسب الحساب" : "Ledger account summary",
    columns: headers.map((header) => ({ header, format: "text", width: 24 })),
    rows: accounts.map((row) => [
      field(row, "account_code", locale),
      field(row, "account_name_en", locale),
      ...amountKeys.map((key) => field(row, key, locale)),
    ]),
  };
}

function errorResponse(error: unknown): Response {
  if (error instanceof UnauthorizedError) return new Response("Authentication required", { status: 401 });
  if (error instanceof ForbiddenError) return new Response("Forbidden", { status: 403 });
  if (error instanceof AuthDependencyError) return new Response("Report unavailable", { status: 503 });
  if (error instanceof RangeError) return new Response("Export exceeds the bounded 50,000 row limit", { status: 413 });
  return new Response("Report unavailable", { status: 503 });
}

export async function GET(request: Request, context: { params: Promise<{ report: string }> }) {
  try {
    const [{ report: slug }, locale] = await Promise.all([context.params, getCurrentSessionEffectiveLocale()]);
    const reportType = REPORT_TYPES[slug];
    if (!reportType) return new Response("Not found", { status: 404 });
    const url = new URL(request.url);
    const from = url.searchParams.get("from") ?? `${new Date().toISOString().slice(0, 4)}-01-01`;
    const through = url.searchParams.get("through") ?? new Date().toISOString().slice(0, 10);
    const serviceId = url.searchParams.get("serviceId");
    const accountId = url.searchParams.get("accountId");
    const rawCutoff = url.searchParams.get("cutoff");
    const cutoff = rawCutoff ? (/Z$|[+-]\d{2}:\d{2}$/.test(rawCutoff) ? rawCutoff : `${rawCutoff}+03:00`) : null;
    const firstInput = accountingW10HReportInputSchema.safeParse({
      report_type: reportType, from_date: from, through_date: through, recorded_at_cutoff: cutoff,
      account_id: accountId, service_id: serviceId, offset: 0, limit: EXPORT_PAGE_SIZE,
    });
    if (!firstInput.success) return new Response("Invalid report filters", { status: 400 });

    const firstPage = await getAccountingW10HReport(firstInput.data);
    const rows = [...firstPage.rows];
    const fixedCutoff = firstPage.recorded_at_cutoff;
    let offset = EXPORT_PAGE_SIZE;
    while (firstPage.has_more && offset <= EXPORT_LIMIT) {
      if (rows.length + EXPORT_PAGE_SIZE > EXPORT_LIMIT) throw new RangeError("W10H export row bound exceeded");
      const input = accountingW10HReportInputSchema.parse({
        ...firstInput.data, recorded_at_cutoff: fixedCutoff, offset, limit: EXPORT_PAGE_SIZE,
      });
      const nextPage = await getAccountingW10HReport(input);
      if (nextPage.state !== firstPage.state || nextPage.recorded_at_cutoff !== fixedCutoff) {
        throw new AuthDependencyError("Accounting report boundary changed during export");
      }
      rows.push(...nextPage.rows);
      if (!nextPage.has_more) break;
      offset += EXPORT_PAGE_SIZE;
    }
    if (offset > EXPORT_LIMIT && firstPage.has_more) throw new RangeError("W10H export row bound exceeded");

    const dictionary = getReportCenterDictionary(locale);
    const definition = getReportDefinitions(locale).find((item) => item.route === `/reports/${slug}`);
    if (!definition) return new Response("Not found", { status: 404 });
    const fileName = `accounting-${slug}-${through}.xlsx`;
    const notices = [
      locale === "ar" ? "مخرجات محاسبية داخلية مؤقتة. ليست قوائم مالية نظامية." : "Provisional internal accounting output. Not a statutory financial statement.",
      `${locale === "ar" ? "حالة الاكتمال" : "Completeness"}: ${firstPage.state}`,
      ...firstPage.reason_codes,
    ];
    const periodAsOf = reportType === "BALANCE_SHEET"
      ? `${locale === "ar" ? "حتى تاريخ" : "As of"}: ${through}; recorded at ${fixedCutoff}`
      : `${from} — ${through}; recorded at ${fixedCutoff}`;
    const ledgerSummary = reportType === "GENERAL_LEDGER" ? summaryTable(firstPage.accounts ?? [], locale) : undefined;
    const buffer = await buildExcelReportBuffer<FlatRow>({
      metadata: {
        brandName: "G7 BLUE",
        reportTitle: definition.title,
        definition: definition.description,
        source: definition.sourceDomain,
        timeBasis: getReportTimeBasisLabel(definition, dictionary.workspace),
        periodAsOf,
        timeZone: "Asia/Riyadh",
        generatedAt: new Date(firstPage.generated_at),
        filters: [
          ...(reportType === "BALANCE_SHEET" ? [] : [`${dictionary.workspace.fromDate}: ${from}`]),
          `${reportType === "BALANCE_SHEET" ? (locale === "ar" ? "تاريخ الميزانية" : "Balance-sheet date") : dictionary.workspace.toDate}: ${through}`,
          `${locale === "ar" ? "وقت التسجيل حتى" : "Recorded-at cutoff"}: ${fixedCutoff}`,
          ...(serviceId ? [`Service ID: ${serviceId}`] : []),
          ...(accountId ? [`Account ID: ${accountId}`] : []),
        ],
        totalRecords: firstPage.total_count,
        fileName,
      },
      locale,
      chrome: locale === "ar" ? DEFAULT_EXCEL_EXPORT_CHROME_AR : DEFAULT_EXCEL_EXPORT_CHROME_EN,
      columns: columnsFor(reportType, rows, locale),
      rows,
      summary: {
        notices,
        tables: ledgerSummary ? [ledgerSummary] : [],
        metrics: firstPage.totals ? Object.entries(firstPage.totals).map(([key, value]) => ({
          label: getW10HTotalLabel(key, locale),
          value: typeof value === "string" && key.endsWith("halalah") ? formatHalalahForExcel(value) : String(value),
        })) : [],
      },
    });
    return new Response(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
