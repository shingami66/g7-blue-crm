import Link from "next/link";
import { isolateBidiText } from "@/lib/i18n/bidi";
import { formatUiNumber } from "@/lib/i18n/formatting";
import type { ServicesDictionary } from "@/lib/i18n/dictionaries/services";
import type { ProcurementRequirement } from "@/lib/procurement/types";

type Props = {
  serviceId: string;
  returnTo?: string;
  requirements: ProcurementRequirement[];
  supplierQuotationCount: number | null;
  loadError?: boolean;
  dictionary: ServicesDictionary;
};

export default function ProcurementSummaryCard({
  serviceId,
  returnTo,
  requirements,
  supplierQuotationCount,
  loadError = false,
  dictionary,
}: Props) {
  const summary = dictionary.procurementSummary;
  const workspaceHref = returnTo
    ? "/services/" + serviceId + "/procurement?returnTo=" + encodeURIComponent(returnTo)
    : "/services/" + serviceId + "/procurement";
  const candidateSuppliers = Array.from(new Map(
    requirements
      .flatMap((requirement) => requirement.candidates)
      .map((candidate) => [candidate.supplierId, candidate.supplierName]),
  ).values());
  const selectedSuppliers = Array.from(new Set(
    requirements
      .map((requirement) => requirement.selectedSupplierName)
      .filter((name): name is string => Boolean(name)),
  ));
  const openRequirements = requirements.filter((requirement) => requirement.selectionStatus === "open").length;

  return (
    <section className="overflow-hidden rounded-xl border border-surface-variant bg-surface-container-lowest">
      <div className="flex flex-col gap-3 border-b border-surface-variant bg-surface-bright px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="font-semibold text-primary">{summary.title}</h3>
          <p className="mt-1 text-[13px] text-on-surface-variant">{summary.subtitle}</p>
        </div>
        <Link
          href={workspaceHref}
          className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-lg bg-primary px-4 py-2 text-[13px] font-semibold text-on-primary transition-colors hover:bg-primary-container focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        >
          {summary.openWorkspace}
        </Link>
      </div>
      {loadError ? (
        <p className="p-5 text-[14px] text-error" role="alert">{summary.loadError}</p>
      ) : (
        <dl className="grid grid-cols-2 gap-x-5 gap-y-5 p-5 sm:grid-cols-4">
          <SummaryMetric label={summary.openRequirements} value={formatUiNumber(dictionary.locale, openRequirements)} numeric />
          <SummaryMetric label={summary.candidateSuppliers} value={formatUiNumber(dictionary.locale, candidateSuppliers.length)} numeric />
          <SummaryMetric label={summary.supplierQuotations} value={supplierQuotationCount === null ? summary.unavailable : formatUiNumber(dictionary.locale, supplierQuotationCount)} numeric={supplierQuotationCount !== null} />
          <SummaryMetric
            label={summary.selectedSupplier}
            value={selectedSuppliers.length > 0 ? selectedSuppliers.join(", ") : summary.noneSelected}
            numeric={false}
          />
        </dl>
      )}
    </section>
  );
}

function SummaryMetric({ label, value, numeric }: { label: string; value: string; numeric: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="text-[12px] font-semibold text-on-surface-variant">{label}</dt>
      <dd className="mt-1 break-words text-[14px] font-semibold text-on-surface">
        {numeric ? (
          <span dir="ltr" className="inline-block tabular-nums">
            {value}
          </span>
        ) : (
          isolateBidiText(value)
        )}
      </dd>
    </div>
  );
}
