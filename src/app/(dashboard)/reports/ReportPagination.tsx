import Link from "next/link";
import type { ReportCenterDictionary } from "@/lib/i18n/dictionaries/report-center";
import { UiLtrText } from "@/components/i18n/UiValueText";

export default function ReportPagination({
  pathname,
  query,
  page,
  totalPages,
  dictionary,
}: {
  pathname: string;
  query: Record<string, string | undefined>;
  page: number;
  totalPages: number;
  dictionary: ReportCenterDictionary;
}) {
  if (totalPages <= 1) return null;
  const hrefFor = (nextPage: number) => {
    const params = new URLSearchParams();
    Object.entries({ ...query, page: String(nextPage) }).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    return `${pathname}?${params.toString()}`;
  };
  return (
    <nav className="flex flex-wrap items-center justify-between gap-3 border-t border-surface-variant bg-surface-container-lowest px-4 py-3" aria-label={`${dictionary.workspace.rows} pagination`}>
      {page > 1 ? <Link href={hrefFor(page - 1)} className="rounded-md border border-outline-variant px-3 py-2 text-sm text-on-surface hover:bg-surface-container-low">{dictionary.workspace.previous}</Link> : <span />}
      <span className="text-sm text-on-surface-variant"><UiLtrText>{page}</UiLtrText> / <UiLtrText>{totalPages}</UiLtrText></span>
      {page < totalPages ? <Link href={hrefFor(page + 1)} className="rounded-md border border-outline-variant px-3 py-2 text-sm text-on-surface hover:bg-surface-container-low">{dictionary.workspace.next}</Link> : <span />}
    </nav>
  );
}
