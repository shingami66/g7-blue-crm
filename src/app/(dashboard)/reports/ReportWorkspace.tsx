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
  presentation,
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
  presentation?: {
    description: string;
    contextSummary: ReactNode;
    detailsLabel: string;
    currentOnlyDetail?: { label: string; value: string };
    generatedAtDetail?: { label: string; value: ReactNode };
  };
  stateNote?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className={presentation ? "min-w-0 space-y-4" : "min-w-0 space-y-6"} data-report-key={definition.key}>
      <header className={presentation ? "flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-start sm:gap-5" : "flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"}>
        <div className="min-w-0">
          <h1 className="text-[28px] font-semibold leading-[36px] tracking-[-0.01em] text-primary">
            {definition.title}
          </h1>
          <p className="mt-1 text-[14px] leading-5 text-on-surface-variant">
            {presentation?.description ?? definition.description}
          </p>
        </div>
        {exportHref ? (
          <a href={exportHref} aria-label={dictionary.workspace.export} className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-white hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40">
            {dictionary.workspace.export}
          </a>
        ) : null}
      </header>

      <section className={presentation ? "flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-xs leading-5 text-on-surface-variant" : "min-w-0 space-y-2 text-xs leading-5 text-on-surface-variant"} aria-label={dictionary.workspace.definition}>
        {presentation ? (
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">{presentation.contextSummary}</div>
        ) : (
          <div className="flex min-w-0 flex-wrap gap-x-4 gap-y-1">
            <span className="min-w-0">{dictionary.workspace.timeBasis}: {getReportTimeBasisLabel(definition, dictionary.workspace)}</span>
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
        )}
        <details className="group w-fit max-w-full">
          <summary className="cursor-pointer rounded-sm font-medium text-primary underline decoration-primary/40 underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40">
            {presentation?.detailsLabel ?? dictionary.workspace.definition}
          </summary>
          <dl className="mt-2 grid min-w-0 gap-x-5 gap-y-1 border-s-2 border-surface-variant ps-3 sm:grid-cols-[auto_minmax(0,1fr)]">
            <dt className="font-semibold">{dictionary.workspace.definition}</dt>
            <dd className="min-w-0 text-on-surface">{definition.description}</dd>
            <dt className="font-semibold">{dictionary.workspace.source}</dt>
            <dd className="min-w-0 text-on-surface"><bdi dir="auto">{definition.sourceDomain}</bdi></dd>
            <dt className="font-semibold">{dictionary.workspace.timeBasis}</dt>
            <dd className="min-w-0 text-on-surface">{getReportTimeBasisLabel(definition, dictionary.workspace)}</dd>
            {presentation?.currentOnlyDetail ? (
              <>
                <dt className="font-semibold">{presentation.currentOnlyDetail.label}</dt>
                <dd className="min-w-0 text-on-surface">{presentation.currentOnlyDetail.value}</dd>
              </>
            ) : null}
            <dt className="font-semibold">{dictionary.workspace.timezone}</dt>
            <dd className="min-w-0 text-on-surface"><UiLtrText>Asia/Riyadh (+03:00)</UiLtrText></dd>
            {presentation?.generatedAtDetail ? (
              <>
                <dt className="font-semibold">{presentation.generatedAtDetail.label}</dt>
                <dd className="min-w-0 text-on-surface">{presentation.generatedAtDetail.value}</dd>
              </>
            ) : (
              <>
                <dt className="font-semibold">{dictionary.workspace.generated}</dt>
                <dd className="min-w-0 text-on-surface"><UiDateTimeText locale={locale} value={generatedAt} options={{ timeZone: "Asia/Riyadh" }} /></dd>
              </>
            )}
            {(periodFrom || periodTo) ? <><dt className="font-semibold">{dictionary.workspace.period}</dt><dd className="min-w-0 text-on-surface"><UiDateText locale={locale} value={periodFrom ?? periodTo ?? ""} />{periodFrom && periodTo ? <> – <UiDateText locale={locale} value={periodTo} /></> : null}</dd></> : null}
            {asOfDate ? <><dt className="font-semibold">{dictionary.workspace.asOf}</dt><dd className="min-w-0 text-on-surface"><UiDateText locale={locale} value={asOfDate} /></dd></> : null}
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
