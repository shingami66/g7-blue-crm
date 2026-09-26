import Link from "next/link";
import type { ReportCenterDictionary } from "@/lib/i18n/dictionaries/report-center";

export default function AccountsReceivableFilters({
  dictionary,
  values,
}: {
  dictionary: ReportCenterDictionary;
  values: Record<string, string | undefined>;
}) {
  return (
    <form method="get" className="grid min-w-0 grid-cols-1 gap-3 rounded-xl border border-surface-variant bg-surface-container-lowest p-4 sm:grid-cols-2 xl:grid-cols-12">
      <fieldset className="min-w-0 sm:col-span-2 xl:col-span-6">
        <legend className="sr-only">{dictionary.workspace.period}</legend>
        <div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2">
          <label className="flex min-w-0 flex-col gap-1 text-sm text-on-surface-variant"><span>{dictionary.workspace.fromDate}</span><input name="from" type="date" defaultValue={values.from} className="h-10 w-full min-w-0 rounded-md border border-outline-variant bg-surface px-2 text-sm text-on-surface" /></label>
          <label className="flex min-w-0 flex-col gap-1 text-sm text-on-surface-variant"><span>{dictionary.workspace.toDate}</span><input name="to" type="date" defaultValue={values.to} className="h-10 w-full min-w-0 rounded-md border border-outline-variant bg-surface px-2 text-sm text-on-surface" /></label>
        </div>
      </fieldset>
      <label className="flex min-w-0 flex-col gap-1 text-sm text-on-surface-variant xl:col-span-3"><span>{dictionary.workspace.asOf}</span><input name="asOf" type="date" defaultValue={values.asOf} className="h-10 w-full min-w-0 rounded-md border border-outline-variant bg-surface px-2 text-sm text-on-surface" /></label>
      <div className="flex min-w-0 flex-wrap items-center gap-2 sm:col-span-2 xl:col-span-3 xl:justify-end">
        <button type="submit" className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-5 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40">{dictionary.workspace.apply}</button>
        <Link href="/reports/accounts-receivable" className="inline-flex h-10 items-center justify-center rounded-md border border-outline-variant px-5 text-sm text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40">{dictionary.workspace.clear}</Link>
      </div>
    </form>
  );
}
