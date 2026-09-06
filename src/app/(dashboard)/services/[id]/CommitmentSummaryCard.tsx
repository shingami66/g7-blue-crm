import Link from "next/link";
import { isolateBidiText } from "@/lib/i18n/bidi";
import { formatSarAmount, formatUiNumber } from "@/lib/i18n/formatting";
import type { ServicesDictionary } from "@/lib/i18n/dictionaries/services";
import type { ApprovedCommitment } from "@/lib/procurement/commitment-receipt-types";

type Props = {
  serviceId: string;
  returnTo?: string;
  workspaceHref?: string;
  commitments: ApprovedCommitment[];
  loadError?: boolean;
  dictionary: ServicesDictionary;
};

export default function CommitmentSummaryCard({
  serviceId,
  returnTo,
  workspaceHref,
  commitments,
  loadError = false,
  dictionary,
}: Props) {
  const summary = dictionary.commitmentSummary;
  const targetWorkspaceHref = workspaceHref ?? (returnTo
    ? `/services/${serviceId}/commitments?returnTo=${encodeURIComponent(returnTo)}`
    : `/services/${serviceId}/commitments`);

  const activeCommitments = commitments.filter((commitment) => commitment.status === "open").length;
  const totalAuthorized = commitments.reduce((sum, commitment) => sum + (commitment.authorizedAmount || 0), 0);
  const totalOpen = commitments.reduce((sum, commitment) => sum + (commitment.openCommitmentAmount || 0), 0);
  const totalReceipts = commitments.reduce((sum, commitment) => sum + (commitment.receipts?.length || 0), 0);

  return (
    <section className="overflow-hidden rounded-xl border border-surface-variant bg-surface-container-lowest">
      <div className="flex flex-col gap-3 border-b border-surface-variant bg-surface-bright px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="font-semibold text-primary">{summary.title}</h3>
          <p className="mt-1 text-[13px] text-on-surface-variant">{summary.subtitle}</p>
        </div>
        <Link
          href={targetWorkspaceHref}
          className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-lg bg-primary px-4 py-2 text-[13px] font-semibold text-on-primary transition-colors hover:bg-primary-container focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        >
          {summary.openWorkspace}
        </Link>
      </div>
      {loadError ? (
        <p className="p-5 text-[14px] text-error" role="alert">{summary.loadError}</p>
      ) : (
        <dl className="grid grid-cols-2 gap-x-5 gap-y-5 p-5 sm:grid-cols-4">
          <SummaryMetric
            label={summary.activeCommitments}
            value={formatUiNumber(dictionary.locale, activeCommitments)}
            numeric
          />
          <SummaryMetric
            label={summary.authorizedAmount}
            value={formatSarAmount(dictionary.locale, totalAuthorized, { isolate: true })}
            numeric
          />
          <SummaryMetric
            label={summary.openAmount}
            value={formatSarAmount(dictionary.locale, totalOpen, { isolate: true })}
            numeric
          />
          <SummaryMetric
            label={summary.serviceReceipts}
            value={formatUiNumber(dictionary.locale, totalReceipts)}
            numeric
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
