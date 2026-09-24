import Link from "next/link";
import { checkPermission } from "@/lib/auth/permissions";
import { getCurrentSessionEffectiveLocale } from "@/lib/i18n/session-locale";
import { getReportCenterDictionary } from "@/lib/i18n/dictionaries/report-center";
import { getReportDefinitions } from "@/lib/reports/catalog";
import type { ReportDefinition } from "@/lib/reports/types";

export const dynamic = "force-dynamic";

async function canOpen(definition: ReportDefinition): Promise<boolean> {
  const permissions = await Promise.all(definition.requiredPermissions.map((permission) => checkPermission(permission)));
  return permissions.every(Boolean);
}

function timeBasis(definition: ReportDefinition, dictionary: ReturnType<typeof getReportCenterDictionary>) {
  if (definition.timeModel === "current_only") return dictionary.workspace.currentOnly;
  if (definition.timeModel === "historical_as_of") return dictionary.workspace.historicalAsOf;
  return dictionary.workspace.periodAndAsOf;
}

export default async function ReportsPage() {
  const locale = await getCurrentSessionEffectiveLocale();
  const dictionary = getReportCenterDictionary(locale);
  const definitions = getReportDefinitions(locale);
  const availability = await Promise.all(definitions.map((definition) => canOpen(definition)));
  const financial = definitions.filter((definition) => definition.category === "financial_operations");
  const event = definitions.filter((definition) => definition.category === "event_costing");

  return (
    <div className="min-w-0 space-y-8" data-reports-center="catalog">
      <header className="space-y-2">
        <h1 className="text-[28px] font-semibold leading-9 tracking-[-0.01em] text-primary">{dictionary.title}</h1>
        <p className="max-w-3xl text-sm text-on-surface-variant">{dictionary.subtitle}</p>
      </header>
      <CatalogGroup title={dictionary.catalog.financialOperations} definitions={financial} allDefinitions={definitions} availability={availability} dictionary={dictionary} />
      <CatalogGroup title={dictionary.catalog.eventCosting} definitions={event} allDefinitions={definitions} availability={availability} dictionary={dictionary} />
    </div>
  );
}

function CatalogGroup({
  title,
  definitions,
  allDefinitions,
  availability,
  dictionary,
}: {
  title: string;
  definitions: ReportDefinition[];
  allDefinitions: ReportDefinition[];
  availability: boolean[];
  dictionary: ReturnType<typeof getReportCenterDictionary>;
}) {
  return (
    <section className="space-y-3" aria-labelledby={`report-group-${definitions[0]?.category ?? "reports"}`}>
      <h2 id={`report-group-${definitions[0]?.category ?? "reports"}`} className="text-lg font-semibold text-primary">{title}</h2>
      <div className="grid min-w-0 gap-4 md:grid-cols-2">
        {definitions.map((definition) => {
          const index = allDefinitions.findIndex((item) => item.key === definition.key);
          const available = availability[index] === true;
          return (
            <article key={definition.key} className="min-w-0 rounded-xl border border-surface-variant bg-surface-container-lowest p-5 shadow-sm" data-report-definition={definition.key}>
              <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <h3 className="text-base font-semibold text-primary">{definition.title}</h3>
                  <p className="mt-1 text-sm leading-6 text-on-surface-variant">{definition.description}</p>
                </div>
                {available ? (
                  <Link href={definition.route} className="inline-flex shrink-0 items-center justify-center rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white hover:bg-primary/90">
                    {dictionary.catalog.open}
                  </Link>
                ) : (
                  <span className="shrink-0 rounded-full bg-surface-container-high px-3 py-1 text-xs font-semibold text-on-surface-variant">
                    {dictionary.catalog.unavailable}
                  </span>
                )}
              </div>
              <dl className="mt-5 grid min-w-0 gap-3 border-t border-surface-variant pt-4 text-sm sm:grid-cols-3">
                <div className="min-w-0"><dt className="text-xs text-on-surface-variant">{dictionary.workspace.source}</dt><dd className="mt-1 break-words text-on-surface"><bdi dir="auto">{definition.sourceDomain}</bdi></dd></div>
                <div className="min-w-0"><dt className="text-xs text-on-surface-variant">{dictionary.workspace.timeBasis}</dt><dd className="mt-1 text-on-surface">{timeBasis(definition, dictionary)}</dd></div>
                <div className="min-w-0"><dt className="text-xs text-on-surface-variant">{dictionary.workspace.freshness}</dt><dd className="mt-1 text-on-surface">{definition.freshness}</dd></div>
              </dl>
              <p className="mt-4 text-xs text-on-surface-variant">
                {definition.exportSupported ? dictionary.catalog.exportAvailable : dictionary.catalog.noExport}
              </p>
            </article>
          );
        })}
      </div>
    </section>
  );
}
