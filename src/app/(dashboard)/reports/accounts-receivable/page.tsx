import { redirect } from "next/navigation";
import { AuthDependencyError, ForbiddenError, UnauthorizedError } from "@/lib/auth/errors";
import { getCurrentSessionEffectiveLocale } from "@/lib/i18n/session-locale";
import { getReportCenterDictionary } from "@/lib/i18n/dictionaries/report-center";
import { getReportDefinitions } from "@/lib/reports/catalog";
import { resolveReportFilters } from "@/lib/reports/filters";
import { buildReportPageHref, clampReportPage, getReportTotalPages, normalizeReportPage } from "@/lib/reports/pagination";
import { getAccountsReceivableReport, hasReportData } from "@/lib/reports/reporting";
import type { ReportDefinition } from "@/lib/reports/types";
import ReportState from "../ReportState";
import ReportWorkspace from "../ReportWorkspace";
import AccountsReceivableFilters from "./AccountsReceivableFilters";
import AccountsReceivableReportContent, { getReceivablesPresentation } from "./AccountsReceivableReportContent";

export const dynamic = "force-dynamic";

function value(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function exportQuery(values: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  Object.entries(values).forEach(([key, item]) => { if (item) params.set(key, item); });
  return `/api/reports/accounts-receivable/export?${params.toString()}`;
}

export default async function AccountsReceivableReportPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const locale = await getCurrentSessionEffectiveLocale();
  const dictionary = getReportCenterDictionary(locale);
  const definition = getReportDefinitions(locale).find((item) => item.key === "accounts_receivable") as ReportDefinition;
  const query = await searchParams;
  const from = value(query.from);
  const to = value(query.to);
  const asOf = value(query.asOf);
  const requestedPage = value(query.page);
  const page = normalizeReportPage(requestedPage);
  const { filters, error: filterError } = resolveReportFilters({ from, to, asOf });
  const queryValues = { from, to, asOf };

  if (filterError) {
    return <ReportWorkspace definition={definition} dictionary={dictionary} locale={locale} generatedAt={new Date().toISOString()} presentation={getReceivablesPresentation(locale, dictionary, filters.asOf)} filterPanel={<AccountsReceivableFilters dictionary={dictionary} values={queryValues} />}><ReportState status="error" dictionary={dictionary} /></ReportWorkspace>;
  }

  let result: Awaited<ReturnType<typeof getAccountsReceivableReport>> | null = null;
  let loadFailure: "forbidden" | "unavailable" | "error" | null = null;
  try {
    result = await getAccountsReceivableReport({ filters, page, pageSize: 20 });
  } catch (error) {
    if (error instanceof UnauthorizedError) redirect("/sign-in");
    loadFailure = error instanceof ForbiddenError ? "forbidden" : error instanceof AuthDependencyError ? "unavailable" : "error";
  }
  if (loadFailure || !result || !hasReportData(result)) {
    return <ReportWorkspace definition={definition} dictionary={dictionary} locale={locale} generatedAt={new Date().toISOString()} presentation={getReceivablesPresentation(locale, dictionary, filters.asOf)} filterPanel={<AccountsReceivableFilters dictionary={dictionary} values={queryValues} />}><ReportState status={loadFailure ?? result?.status ?? "error"} dictionary={dictionary} /></ReportWorkspace>;
  }
  const report = result.data;
  const finalPage = clampReportPage(page, getReportTotalPages(report.detailTotalCount));
  if (requestedPage !== undefined && requestedPage !== String(page)) {
    redirect(buildReportPageHref("/reports/accounts-receivable", queryValues, page));
  }
  if (finalPage !== page) {
    redirect(buildReportPageHref("/reports/accounts-receivable", queryValues, finalPage));
  }
  return (
      <ReportWorkspace
        definition={definition}
        dictionary={dictionary}
        locale={locale}
        asOfDate={report.asOfDate}
        periodFrom={report.periodFrom}
        periodTo={report.periodTo}
        generatedAt={new Date().toISOString()}
        exportHref={exportQuery(queryValues)}
        presentation={getReceivablesPresentation(locale, dictionary, report.asOfDate)}
        filterPanel={<AccountsReceivableFilters dictionary={dictionary} values={queryValues} />}
      >
        <AccountsReceivableReportContent report={report} locale={locale} dictionary={dictionary} page={page} queryValues={queryValues} />
      </ReportWorkspace>
    );
}
