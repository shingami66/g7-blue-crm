import type { ReactNode } from "react";

export default function ReportMetricCard({ label, value, note }: { label: string; value: ReactNode; note?: ReactNode }) {
  return (
    <div className="min-w-0 rounded-xl border border-surface-variant bg-surface-container-lowest p-4">
      <dt className="text-sm text-on-surface-variant">{label}</dt>
      <dd className="mt-2 text-xl font-semibold text-primary">{value}</dd>
      {note ? <div className="mt-1 text-xs text-on-surface-variant">{note}</div> : null}
    </div>
  );
}
