import Link from "next/link";
import type { ReactNode } from "react";
import { UiDateText, UiDateTimeText } from "@/components/i18n/UiDateText";
import { UiLtrText } from "@/components/i18n/UiValueText";
import { RecordBackButton } from "@/components/navigation/RecordBackButton";
import type { ReportDefinition } from "@/lib/reports/types";
import type { Locale } from "@/lib/i18n/locales";
import type { ReportCenterDictionary } from "@/lib/i18n/dictionaries/report-center";

function timeBasisLabel(definition: ReportDefinition, copy: ReportCenterDictionary) {
  if (definition.timeModel === "current_only") return copy.workspace.currentOnly;
  if (definition.timeModel === "historical_as_of") return copy.workspace.historicalAsOf;
  return copy.workspace.periodAndAsOf;
}

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
        <div className="flex min-w-0 items-start gap-3">
          <RecordBackButton
            href="/reports"
            locale={locale}
            label={dictionary.workspace.backToReports}
            ariaLabel={dictionary.workspace.backToReports}
          />
          <div className="min-w-0">
            <h1 className="text-[28px] font-semibold leading-[36px] tracking-[-0.01em] text-primary">
              {definition.title}
            </h1>
            <p className="mt-1 text-[14px] leading-5 text-on-surface-variant">
              {definition.description}
            </p>
          </div>
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

      <section className="min-w-0 rounded-xl border border-surface-variant bg-surface-container-lowest p-5" aria-label={dictionary.workspace.definition}>
        <dl className="grid min-w-0 grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2 xl:grid-cols-12">
          <div className="min-w-0 sm:col-span-2 xl:col-span-6">
            <dt className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">{dictionary.workspace.definition}</dt>
            <dd className="mt-2 max-w-3xl text-sm leading-6 text-on-surface">{definition.description}</dd>
          </div>
          <div className="min-w-0 sm:col-span-1 xl:col-span-2">
            <dt className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">{dictionary.workspace.source}</dt>
            <dd className="mt-2 break-words text-sm leading-6 text-on-surface"><bdi dir="auto">{definition.sourceDomain}</bdi></dd>
          </div>
          <div className="min-w-0 sm:col-span-1 xl:col-span-2">
            <dt className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">{dictionary.workspace.timeBasis}</dt>
            <dd className="mt-2 text-sm leading-6 text-on-surface">{timeBasisLabel(definition, dictionary)}</dd>
          </div>
          <div className="min-w-0 sm:col-span-1 xl:col-span-2">
            <dt className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">{dictionary.workspace.freshness}</dt>
            <dd className="mt-2 text-sm leading-6 text-on-surface">{definition.freshness}</dd>
          </div>
        </dl>
        <div className="mt-5 flex min-w-0 flex-wrap gap-x-6 gap-y-3 border-t border-surface-variant pt-4 text-sm leading-5 text-on-surface-variant">
          <span className="min-w-0">{dictionary.workspace.timezone}: <UiLtrText>Asia/Riyadh (+03:00)</UiLtrText></span>
          {periodFrom || periodTo ? (
            <span className="min-w-0">
              {dictionary.workspace.period}: <UiDateText locale={locale} value={periodFrom ?? periodTo ?? ""} />
              {periodFrom && periodTo ? <> – <UiDateText locale={locale} value={periodTo} /></> : null}
            </span>
          ) : null}
          {asOfDate ? <span className="min-w-0">{dictionary.workspace.asOf}: <UiDateText locale={locale} value={asOfDate} /></span> : null}
          <span className="min-w-0">{dictionary.workspace.generated}: <UiDateTimeText locale={locale} value={generatedAt} options={{ timeZone: "Asia/Riyadh" }} /></span>
        </div>
      </section>

      {filterPanel ? <section className="min-w-0" aria-label={dictionary.workspace.filters}>{filterPanel}</section> : null}
      {stateNote ? <div className="min-w-0">{stateNote}</div> : null}
      <div className="min-w-0">{children}</div>
    </div>
  );
}
