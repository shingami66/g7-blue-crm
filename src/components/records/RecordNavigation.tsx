import Link from "next/link";
import { ChevronsLeft, ChevronsRight, ChevronLeft, ChevronRight } from "lucide-react";
import type { RecordNavigationDictionary } from "@/lib/i18n/dictionaries/record-navigation";

export interface RecordNavigationState {
  first: string | null;
  previous: string | null;
  next: string | null;
  last: string | null;
}

interface RecordNavigationProps {
  basePath: string;
  recordType: string;
  navigation: RecordNavigationState;
  dictionary: RecordNavigationDictionary;
  returnTo?: string;
}

function hrefFor(basePath: string, id: string, returnTo?: string) {
  const returnParam = returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : "";
  return `${basePath}/${id}${returnParam}`;
}

export default function RecordNavigation({
  basePath,
  recordType,
  navigation,
  dictionary,
  returnTo,
}: RecordNavigationProps) {
  const items = [
    { key: "first", label: dictionary.first, id: navigation.first, Icon: ChevronsLeft },
    { key: "previous", label: dictionary.previous, id: navigation.previous, Icon: ChevronLeft },
    { key: "next", label: dictionary.next, id: navigation.next, Icon: ChevronRight },
    { key: "last", label: dictionary.last, id: navigation.last, Icon: ChevronsRight },
  ] as const;

  return (
    <nav aria-label={`${dictionary.title}: ${recordType}`} className="flex items-center gap-1 rounded-lg border border-outline-variant bg-surface px-1 py-1" dir="ltr">
      <span className="sr-only">{dictionary.title}</span>
      {items.map(({ key, label, id, Icon }) => (
        id ? (
          <Link key={key} href={hrefFor(basePath, id, returnTo)} aria-label={`${label} ${recordType}`} title={`${label} ${recordType}`} className="inline-flex min-h-9 items-center gap-1 rounded-md px-2 text-[12px] font-semibold text-primary transition-colors hover:bg-primary-fixed focus:outline-none focus:ring-2 focus:ring-primary/40">
            <Icon size={15} aria-hidden="true" />
            <span className="hidden sm:inline">{label}</span>
          </Link>
        ) : (
          <button key={key} type="button" disabled aria-disabled="true" aria-label={`${label} ${recordType}`} title={`${label} ${recordType}`} className="inline-flex min-h-9 items-center gap-1 rounded-md px-2 text-[12px] font-semibold text-on-surface-variant opacity-45">
            <Icon size={15} aria-hidden="true" />
            <span className="hidden sm:inline">{label}</span>
          </button>
        )
      ))}
    </nav>
  );
}
