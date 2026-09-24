import Link from "next/link";
import type { ReactNode } from "react";
import { UiDateText, UiDateTimeText } from "@/components/i18n/UiDateText";
import { UiLtrText } from "@/components/i18n/UiValueText";
import PageHeader from "@/components/ui/PageHeader";
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
      <PageHeader title={definition.title} subtitle={definition.description}>
        {exportHref ? (
          <Link
            href={exportHref}
            className="inline-flex min-h-10 items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-white hover:bg-primary/90"
          >
            {dictionary.workspace.export}
          </Link>
        ) : null}
      </PageHeader>

      <section className="rounded-xl border border-surface-variant bg-surface-container-lowest p-4" aria-label={dictionary.workspace.definition}>
        <div className="grid min-w-0 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="min-w-0">
            <dt className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">{dictionary.workspace.definition}</dt>
            <dd className="mt-1 text-sm text-on-surface">{definition.description}</dd>
          </div>
          <div className="min-w-0">
            <dt className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">{dictionary.workspace.source}</dt>
            <dd className="mt-1 break-words text-sm text-on-surface"><bdi dir="auto">{definition.sourceDomain}</bdi></dd>
          </div>
          <div className="min-w-0">
            <dt className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">{dictionary.workspace.timeBasis}</dt>
            <dd className="mt-1 text-sm text-on-surface">{timeBasisLabel(definition, dictionary)}</dd>
          </div>
          <div className="min-w-0">
            <dt className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">{dictionary.workspace.freshness}</dt>
            <dd className="mt-1 text-sm text-on-surface">{definition.freshness}</dd>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 border-t border-surface-variant pt-3 text-sm text-on-surface-variant">
          <span>{dictionary.workspace.timezone}: <UiLtrText>Asia/Riyadh (+03:00)</UiLtrText></span>
          {periodFrom || periodTo ? (
            <span>
              {dictionary.workspace.period}: <UiDateText locale={locale} value={periodFrom ?? periodTo ?? ""} />
              {periodFrom && periodTo ? <> – <UiDateText locale={locale} value={periodTo} /></> : null}
            </span>
          ) : null}
          {asOfDate ? <span>{dictionary.workspace.asOf}: <UiDateText locale={locale} value={asOfDate} /></span> : null}
          <span>{dictionary.workspace.generated}: <UiDateTimeText locale={locale} value={generatedAt} options={{ timeZone: "Asia/Riyadh" }} /></span>
        </div>
      </section>

      {filterPanel ? <section aria-label={dictionary.workspace.filters}>{filterPanel}</section> : null}
      {stateNote ? <div>{stateNote}</div> : null}
      {children}
    </div>
  );
}
