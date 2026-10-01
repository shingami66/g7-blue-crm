import { redirect } from "next/navigation";
import { AuthDependencyError, ForbiddenError, UnauthorizedError } from "@/lib/auth/errors";
import { formatHalalahAsSar } from "@/lib/accounting/exact-money";
import { getAccountingW10HReport } from "@/lib/accounting/queries";
import { getW10HTotalLabel } from "@/lib/accounting/w10h-presentation";
import { getCurrentSessionEffectiveLocale } from "@/lib/i18n/session-locale";
import { getReportCenterDictionary } from "@/lib/i18n/dictionaries/report-center";
import { getReportDefinitions } from "@/lib/reports/catalog";
import { getReportTotalPages, normalizeReportPage } from "@/lib/reports/pagination";
import type { ReportDefinition } from "@/lib/reports/types";
import { accountingW10HReportInputSchema } from "@/lib/accounting/schemas";
import ReportPagination from "../ReportPagination";
import ReportState from "../ReportState";
import ReportWorkspace from "../ReportWorkspace";

export const dynamic = "force-dynamic";

const REPORTS = {
  "general-ledger": { key: "general_ledger", type: "GENERAL_LEDGER" },
  "trial-balance": { key: "trial_balance", type: "TRIAL_BALANCE" },
  "profit-and-loss": { key: "profit_and_loss", type: "PROFIT_AND_LOSS" },
  "balance-sheet": { key: "balance_sheet", type: "BALANCE_SHEET" },
} as const;

type Query = Record<string, string | string[] | undefined>;
type FlatRow = Record<string, unknown>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function isDate(value: string | undefined): value is string {
  return value !== undefined && /^\d{4}-\d{2}-\d{2}$/.test(value)
    && !Number.isNaN(new Date(`${value}T00:00:00.000Z`).valueOf())
    && new Date(`${value}T00:00:00.000Z`).toISOString().slice(0, 10) === value;
}

function cutoffWithOffset(value: string | undefined): string | null {
  if (!value) return null;
  if (/Z$|[+-]\d{2}:\d{2}$/.test(value)) return value;
  return `${value}+03:00`;
}

function text(row: FlatRow, key: string): string {
  const value = row[key];
  if (typeof value === "string") return value;
  if (value === null || value === undefined) return "—";
  return typeof value === "object" ? JSON.stringify(value) : String(value);
}

function money(row: FlatRow, key: string): string {
  const value = row[key];
  if (typeof value !== "string" || !/^-?(0|[1-9][0-9]*)$/.test(value)) return "—";
  return `SAR ${formatHalalahAsSar(value)}`;
}

type Column = { key: string; en: string; ar: string; money?: boolean };

const COLUMNS: Record<keyof typeof REPORTS, Column[]> = {
  "general-ledger": [
    { key: "accounting_date", en: "Accounting date", ar: "تاريخ المحاسبة" },
    { key: "journal_id", en: "Journal ID", ar: "معرّف القيد" },
    { key: "journal_version", en: "Version", ar: "الإصدار" },
    { key: "source_domain", en: "Source", ar: "المصدر" },
    { key: "account_code", en: "Account", ar: "الحساب" },
    { key: "side", en: "Side", ar: "الطرف" },
    { key: "amount_halalah", en: "Amount (SAR)", ar: "المبلغ (ريال سعودي)", money: true },
    { key: "service_number", en: "Service", ar: "الخدمة" },
    { key: "reversal_of_journal_id", en: "Reverses", ar: "يعكس القيد" },
    { key: "journal_evidence", en: "Journal evidence", ar: "أدلة القيود" },
  ],
  "trial-balance": [
    { key: "account_code", en: "Account", ar: "الحساب" },
    { key: "account_name_en", en: "Account name", ar: "اسم الحساب" },
    { key: "opening_debit_halalah", en: "Opening debit", ar: "مدين أول المدة", money: true },
    { key: "opening_credit_halalah", en: "Opening credit", ar: "دائن أول المدة", money: true },
    { key: "period_debit_halalah", en: "Period debit", ar: "مدين الفترة", money: true },
    { key: "period_credit_halalah", en: "Period credit", ar: "دائن الفترة", money: true },
    { key: "ending_debit_halalah", en: "Ending debit", ar: "مدين آخر المدة", money: true },
    { key: "ending_credit_halalah", en: "Ending credit", ar: "دائن آخر المدة", money: true },
    { key: "journal_evidence", en: "Journal evidence", ar: "أدلة القيود" },
    { key: "service_attribution", en: "Service attribution", ar: "إسناد الخدمة" },
  ],
  "profit-and-loss": [
    { key: "section_key", en: "Section", ar: "القسم" },
    { key: "line_key", en: "Statement line", ar: "بند القوائم" },
    { key: "label_en", en: "Line label", ar: "اسم البند" },
    { key: "account_code", en: "Account", ar: "الحساب" },
    { key: "account_name_en", en: "Account name", ar: "اسم الحساب" },
    { key: "amount_halalah", en: "Amount (SAR)", ar: "المبلغ (ريال سعودي)", money: true },
    { key: "journal_evidence", en: "Journal evidence", ar: "أدلة القيود" },
  ],
  "balance-sheet": [
    { key: "section_key", en: "Section", ar: "القسم" },
    { key: "line_key", en: "Statement line", ar: "بند القوائم" },
    { key: "label_en", en: "Line label", ar: "اسم البند" },
    { key: "account_code", en: "Account", ar: "الحساب" },
    { key: "account_name_en", en: "Account name", ar: "اسم الحساب" },
    { key: "amount_halalah", en: "Amount (SAR)", ar: "المبلغ (ريال سعودي)", money: true },
    { key: "journal_evidence", en: "Journal evidence", ar: "أدلة القيود" },
  ],
};

const LEDGER_ACCOUNT_COLUMNS: Column[] = [
  { key: "account_code", en: "Account", ar: "الحساب" },
  { key: "account_name_en", en: "Account name", ar: "اسم الحساب" },
  { key: "opening_balance_halalah", en: "Opening", ar: "الرصيد الافتتاحي", money: true },
  { key: "debit_activity_halalah", en: "Period debit", ar: "مدين الفترة", money: true },
  { key: "credit_activity_halalah", en: "Period credit", ar: "دائن الفترة", money: true },
  { key: "closing_balance_halalah", en: "Closing", ar: "الرصيد الختامي", money: true },
];

export default async function AccountingReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ report: string }>;
  searchParams: Promise<Query>;
}) {
  const [{ report: slug }, query] = await Promise.all([params, searchParams]);
  if (!(slug in REPORTS)) redirect("/reports");
  const reportKey = slug as keyof typeof REPORTS;
  const config = REPORTS[reportKey];
  const locale = await getCurrentSessionEffectiveLocale();
  const dictionary = getReportCenterDictionary(locale);
  const definition = getReportDefinitions(locale).find((item) => item.key === config.key) as ReportDefinition;
  const today = new Date().toISOString().slice(0, 10);
  const from = first(query.from) ?? `${today.slice(0, 4)}-01-01`;
  const through = first(query.through) ?? today;
  const cutoffText = first(query.cutoff);
  const serviceId = first(query.serviceId) ?? null;
  const accountId = first(query.accountId) ?? null;
  const pageText = first(query.page);
  const pageSize = 50;
  const page = normalizeReportPage(pageText, pageSize);
  const cutoff = cutoffWithOffset(cutoffText);
  const queryValues = {
    from,
    through,
    ...(cutoffText ? { cutoff: cutoffText } : {}),
    ...(serviceId ? { serviceId } : {}),
    ...(accountId ? { accountId } : {}),
  };

  let result: Awaited<ReturnType<typeof getAccountingW10HReport>> | null = null;
  let failure: "forbidden" | "unavailable" | "error" | "invalid" | null = null;
  const input = accountingW10HReportInputSchema.safeParse({
    report_type: config.type,
    from_date: from,
    through_date: through,
    recorded_at_cutoff: cutoff,
    account_id: accountId,
    service_id: serviceId,
    offset: (page - 1) * pageSize,
    limit: pageSize,
  });
  if (!isDate(from) || !isDate(through) || !input.success) {
    failure = "invalid";
  } else {
    try {
      result = await getAccountingW10HReport(input.data);
    } catch (error) {
      if (error instanceof UnauthorizedError) redirect("/sign-in");
      failure = error instanceof ForbiddenError ? "forbidden" : error instanceof AuthDependencyError ? "unavailable" : "error";
    }
  }

  const report = result;
  const totalPages = report ? getReportTotalPages(report.total_count, pageSize) : 0;
  const stateMessage = report?.state === "NOT_INITIALIZED"
    ? (locale === "ar" ? "لم يتم تهيئة الملف المحاسبي في هذه البيئة." : "The accounting profile is not initialized in this environment.")
    : report?.state === "MAPPING_REQUIRED"
      ? (locale === "ar" ? "يلزم إعداد ربط معتمد للقوائم المالية." : "An approved financial-statement mapping is required.")
      : null;
  const provisionalNotice = locale === "ar"
    ? "مخرجات محاسبية داخلية مؤقتة. ليست قوائم مالية نظامية. يلزم التحقق المهني قبل الاستخدام الحي أو النظامي."
    : "Provisional internal accounting output. Not a statutory financial statement. Professional validation is required before live or statutory use.";
  const serviceAnalysisNote = serviceId && (reportKey === "profit-and-loss" || reportKey === "balance-sheet")
    ? (locale === "ar" ? "تحليل محاسبي حسب الخدمة؛ ليس هامشاً إدارياً للفعالية." : "Service-filtered accounting analysis; this is not managerial Event Costing margin.")
    : null;

  return (
    <div dir={locale === "ar" ? "rtl" : "ltr"} data-w10h-report={config.type}>
      <ReportWorkspace
        definition={definition}
        dictionary={dictionary}
        locale={locale}
        periodFrom={reportKey === "balance-sheet" ? null : from}
        periodTo={reportKey === "balance-sheet" ? null : through}
        asOfDate={reportKey === "balance-sheet" ? through : null}
        generatedAt={report?.generated_at ?? new Date().toISOString()}
        exportHref={`/api/reports/accounting/${slug}/export?${new URLSearchParams(queryValues).toString()}`}
        presentation={{
          description: definition.description,
          detailsLabel: dictionary.workspace.definition,
          contextSummary: <>
            <span>{locale === "ar" ? "تاريخ التسجيل حتى" : "Recorded at cutoff"}: <bdi dir="ltr">{report?.recorded_at_cutoff ?? (cutoff ?? (locale === "ar" ? "الآن" : "now"))}</bdi></span>
            {report?.mapping_version ? <span>{locale === "ar" ? "إصدار الربط" : "Mapping version"}: <bdi dir="ltr">{report.mapping_version}</bdi></span> : null}
          </>,
        }}
        filterPanel={<form action={`/reports/${slug}`} method="get" className="grid gap-3 rounded-xl border border-surface-variant bg-surface-container-lowest p-4 md:grid-cols-3">
          {reportKey === "balance-sheet" ? <input type="hidden" name="from" value={from} /> : <label className="grid gap-1 text-sm"><span>{locale === "ar" ? "من تاريخ المحاسبة" : "Accounting date from"}</span><input type="date" name="from" required defaultValue={from} className="min-h-10 rounded-md border border-outline-variant bg-surface px-3" /></label>}
          <label className="grid gap-1 text-sm"><span>{locale === "ar" ? (reportKey === "balance-sheet" ? "تاريخ الميزانية حتى" : "إلى تاريخ المحاسبة") : (reportKey === "balance-sheet" ? "Balance-sheet date" : "Accounting date through")}</span><input type="date" name="through" required defaultValue={through} className="min-h-10 rounded-md border border-outline-variant bg-surface px-3" /></label>
          <label className="grid gap-1 text-sm"><span>{locale === "ar" ? "حد وقت التسجيل (الوقت المحلي بتوقيت الرياض افتراضياً)" : "Recorded-at cutoff (local input defaults to Riyadh time)"}</span><input type="datetime-local" name="cutoff" defaultValue={cutoffText?.slice(0, 16)} className="min-h-10 rounded-md border border-outline-variant bg-surface px-3" /></label>
          <label className="grid gap-1 text-sm"><span>{locale === "ar" ? "معرّف الخدمة (اختياري)" : "Service ID (optional)"}</span><input type="text" name="serviceId" defaultValue={serviceId ?? ""} className="min-h-10 rounded-md border border-outline-variant bg-surface px-3" /></label>
          {reportKey === "general-ledger" ? <label className="grid gap-1 text-sm"><span>{locale === "ar" ? "معرّف الحساب (اختياري)" : "Account ID (optional)"}</span><input type="text" name="accountId" defaultValue={accountId ?? ""} className="min-h-10 rounded-md border border-outline-variant bg-surface px-3" /></label> : null}
          <div className="flex items-end"><button type="submit" className="min-h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-white">{dictionary.workspace.apply}</button></div>
        </form>}
      >
        <div className="space-y-4">
          <p className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950" role="note">{provisionalNotice}</p>
          {serviceAnalysisNote ? <p className="rounded-lg border border-surface-variant bg-surface-container-lowest p-3 text-sm">{serviceAnalysisNote}</p> : null}
          {failure ? <ReportState status={failure} dictionary={dictionary} /> : null}
          {stateMessage ? <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-5 text-sm" role="status">{stateMessage}</div> : null}
          {report && report.state !== "NOT_INITIALIZED" && report.state !== "MAPPING_REQUIRED" ? <>
            <section className="rounded-xl border border-surface-variant bg-surface-container-lowest p-4" aria-label={locale === "ar" ? "اكتمال التقرير" : "Report completeness"}>
              <div className="flex flex-wrap items-center gap-2">
                <strong>{locale === "ar" ? "حالة الاكتمال" : "Completeness"}:</strong>
                <span className="rounded-full bg-surface-container-high px-3 py-1 text-xs font-semibold" data-completeness={report.state}>{report.state}</span>
              </div>
              {report.reason_codes.length ? <ul className="mt-2 list-disc ps-5 text-sm text-on-surface-variant">{report.reason_codes.map((reason) => <li key={reason}><code>{reason}</code></li>)}</ul> : null}
            </section>
            {report.totals ? <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label={locale === "ar" ? "إجماليات التقرير" : "Report totals"}>
              {Object.entries(report.totals).map(([key, value]) => <div key={key} className="rounded-xl border border-surface-variant bg-surface-container-lowest p-4">
                <div className="text-xs text-on-surface-variant">{getW10HTotalLabel(key, locale)}</div>
                <div className="mt-1 break-all font-semibold text-on-surface">{key.endsWith("halalah") && typeof value === "string" ? `SAR ${formatHalalahAsSar(value)}` : String(value)}</div>
              </div>)}
            </section> : null}
            {reportKey === "general-ledger" && report.accounts?.length ? <ReportTable rows={report.accounts} columns={LEDGER_ACCOUNT_COLUMNS} locale={locale} /> : null}
            <p className="text-xs text-on-surface-variant">{locale === "ar" ? "إجمالي الصفوف" : "Total rows"}: <bdi dir="ltr">{report.total_count}</bdi></p>
            <ReportTable rows={report.rows} columns={COLUMNS[reportKey]} locale={locale} />
            <ReportPagination pathname={`/reports/${slug}`} query={queryValues} page={page} totalPages={totalPages} dictionary={dictionary} />
          </> : null}
        </div>
      </ReportWorkspace>
    </div>
  );
}

function ReportTable({ rows, columns, locale }: { rows: FlatRow[]; columns: Column[]; locale: "en" | "ar" }) {
  if (rows.length === 0) return <div className="rounded-xl border border-surface-variant bg-surface-container-lowest p-5 text-sm text-on-surface-variant">{locale === "ar" ? "لا توجد تفاصيل ضمن الحدود المحددة." : "No details fall within the selected boundaries."}</div>;
  return <div className="overflow-x-auto rounded-xl border border-surface-variant bg-surface-container-lowest">
    <table className="min-w-full border-collapse text-sm">
      <thead className="bg-surface-container-low text-start text-xs text-on-surface-variant"><tr>{columns.map((column) => <th key={column.key} scope="col" className="whitespace-nowrap px-3 py-2 text-start">{locale === "ar" ? column.ar : column.en}</th>)}</tr></thead>
      <tbody>{rows.map((row, index) => <tr key={`${text(row, "journal_id")}-${text(row, "account_id")}-${index}`} className="border-t border-surface-variant">{columns.map((column) => <td key={column.key} className="max-w-72 whitespace-nowrap px-3 py-2 text-start">
        {column.money ? <bdi dir="ltr">{money(row, column.key)}</bdi> : <bdi dir={column.key.includes("id") || column.key.includes("date") ? "ltr" : "auto"}>{text(row, locale === "ar" && column.key === "label_en" ? "label_ar" : locale === "ar" && column.key === "account_name_en" ? "account_name_ar" : column.key)}</bdi>}
      </td>)}</tr>)}</tbody>
    </table>
  </div>;
}
