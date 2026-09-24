import Link from "next/link";
import type { ReactNode } from "react";
import { UiDateText, UiDateTimeText } from "@/components/i18n/UiDateText";
import { UiLtrText } from "@/components/i18n/UiValueText";
import type { ReportDefinition } from "@/lib/reports/types";
import type { Locale } from "@/lib/i18n/locales";
import type { ReportCenterDictionary } from "@/lib/i18n/dictionaries/report-center";
import { getReportTimeBasisLabel } from "@/lib/reports/presentation";

export default function ReportWorkspace({
  definition,
  dictionary,
  locale,
  asOfDate,
  periodFrom,
  periodTo,
  generatedAt,
  filterPanel,
  exportHref,
  stateNote,
  children,
}: {
  definition: ReportDefinition;
  dictionary: ReportCenterDictionary;
  locale: Locale;
  asOfDate?: string | null;
  periodFrom?: string | null;
  periodTo?: string | null;
  generatedAt: string;
  filterPanel?: ReactNode;
  exportHref?: string;
  stateNote?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0 space-y-6" data-report-key={definition.key}>
      <header className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-[28px] font-semibold leading-[36px] tracking-[-0.01em] text-primary">
            {definition.title}
          </h1>
          <p className="mt-1 text-[14px] leading-5 text-on-surface-variant">
            {definition.description}
          </p>
          <Link href="/reports" className="mt-2 inline-flex min-h-7 items-center text-xs font-medium text-primary/80 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40">
            {dictionary.workspace.backToReports}
          </Link>
        </div>
        {exportHref ? (
          <Link
            href={exportHref}
            className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-white hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            {dictionary.workspace.export}
          </Link>
        ) : null}
      </header>

      <section className="min-w-0 space-y-2 text-xs leading-5 text-on-surface-variant" aria-label={dictionary.workspace.definition}>
        <div className="flex min-w-0 flex-wrap gap-x-4 gap-y-1">
          <span className="min-w-0">{dictionary.workspace.timeBasis}: {getReportTimeBasisLabel(definition, dictionary.workspace)}</span>
          <span className="min-w-0">{dictionary.workspace.source}: <bdi dir="auto">{definition.sourceDomain}</bdi></span>
          <span className="min-w-0">{dictionary.workspace.timezone}: <UiLtrText>Asia/Riyadh (+03:00)</UiLtrText></span>
          <span className="min-w-0">{dictionary.workspace.generated}: <UiDateTimeText locale={locale} value={generatedAt} options={{ timeZone: "Asia/Riyadh" }} /></span>
          {periodFrom || periodTo ? (
            <span className="min-w-0">
              {dictionary.workspace.period}: <UiDateText locale={locale} value={periodFrom ?? periodTo ?? ""} />
              {periodFrom && periodTo ? <> – <UiDateText locale={locale} value={periodTo} /></> : null}
            </span>
          ) : null}
          {asOfDate ? <span className="min-w-0">{dictionary.workspace.asOf}: <UiDateText locale={locale} value={asOfDate} /></span> : null}
        </div>
        <details className="group w-fit max-w-full">
          <summary className="cursor-pointer rounded-sm font-medium text-primary underline decoration-primary/40 underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40">
            {dictionary.workspace.definition}
          </summary>
          <dl className="mt-2 grid min-w-0 gap-x-5 gap-y-1 border-s-2 border-surface-variant ps-3 sm:grid-cols-[auto_minmax(0,1fr)]">
            <dt className="font-semibold">{dictionary.workspace.definition}</dt>
            <dd className="min-w-0 text-on-surface">{definition.description}</dd>
            <dt className="font-semibold">{dictionary.workspace.freshness}</dt>
            <dd className="min-w-0 text-on-surface">{definition.freshness}</dd>
          </dl>
        </details>
      </section>

      {filterPanel ? <section className="min-w-0" aria-label={dictionary.workspace.filters}>{filterPanel}</section> : null}
      {stateNote ? <div className="min-w-0">{stateNote}</div> : null}
      <div className="min-w-0">{children}</div>
    </div>
  );
}
