"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ChevronsLeft, ChevronsRight, ChevronLeft, ChevronRight } from "lucide-react";
import type { RecordNavigationDictionary } from "@/lib/i18n/dictionaries/record-navigation";
import {
  isExternalHref,
  isModifiedNavigationEvent,
  isSameNavigationHref,
  useGlobalNavigationPending,
} from "@/components/ui/useGlobalNavigationPending";
import { createRecordNavigationGuard } from "./record-navigation-guard";

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
  pendingLabel?: string;
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
  pendingLabel = dictionary.title,
}: RecordNavigationProps) {
  const items = [
    { key: "first", label: dictionary.first, id: navigation.first, Icon: ChevronsLeft },
    { key: "previous", label: dictionary.previous, id: navigation.previous, Icon: ChevronLeft },
    { key: "next", label: dictionary.next, id: navigation.next, Icon: ChevronRight },
    { key: "last", label: dictionary.last, id: navigation.last, Icon: ChevronsRight },
  ] as const;
  const { isPending, push } = useGlobalNavigationPending();
  const guardRef = useRef(createRecordNavigationGuard());
  const hasSeenPendingRef = useRef(false);
  const [isPagerLocked, setIsPagerLocked] = useState(false);
  const [showPending, setShowPending] = useState(false);

  useEffect(() => {
    if (isPending) {
      hasSeenPendingRef.current = true;
      const timer = window.setTimeout(() => setShowPending(true), 150);
      return () => window.clearTimeout(timer);
    }

    if (!hasSeenPendingRef.current || !isPagerLocked) {
      return;
    }

    guardRef.current.release();
    hasSeenPendingRef.current = false;
    const unlockTimer = window.setTimeout(() => setIsPagerLocked(false), 0);
    return () => window.clearTimeout(unlockTimer);
  }, [isPending, isPagerLocked]);

  useEffect(() => {
    if (isPending || !showPending) return;

    const resetTimer = window.setTimeout(() => setShowPending(false), 0);
    return () => window.clearTimeout(resetTimer);
  }, [isPending, showPending]);

  function handleNavigationClick(event: React.MouseEvent<HTMLAnchorElement>, href: string) {
    if (
      event.defaultPrevented ||
      isModifiedNavigationEvent(event.nativeEvent) ||
      isExternalHref(href) ||
      isSameNavigationHref(href)
    ) {
      return;
    }

    if (isPending || isPagerLocked || !guardRef.current.acquire()) {
      event.preventDefault();
      return;
    }

    event.preventDefault();
    setIsPagerLocked(true);
    setShowPending(false);
    push(href, { label: pendingLabel });
  }

  const isGuarded = isPending || isPagerLocked;

  return (
    <nav
      aria-label={`${dictionary.title}: ${recordType}`}
      aria-busy={isGuarded || undefined}
      className="flex items-center gap-1 rounded-lg border border-outline-variant bg-surface px-1 py-0.5"
      dir="ltr"
      data-record-navigation-pending={showPending ? "true" : undefined}
    >
      <span className="sr-only">{dictionary.title}</span>
      <span aria-hidden="true" className={`ms-1 inline-block size-1.5 shrink-0 rounded-full bg-current align-middle opacity-0 transition-opacity duration-150 motion-reduce:transition-none ${showPending ? "opacity-70 motion-safe:animate-pulse" : ""}`} />
      {showPending && <span aria-live="polite" className="sr-only">{pendingLabel}</span>}
      {items.map(({ key, label, id, Icon }) => (
        id ? (
          <Link
            key={key}
            href={hrefFor(basePath, id, returnTo)}
            aria-disabled={isGuarded || undefined}
            aria-label={`${label} ${recordType}`}
            title={`${label} ${recordType}`}
            onClick={(event) => handleNavigationClick(event, hrefFor(basePath, id, returnTo))}
            className="inline-flex size-8 items-center justify-center rounded-md text-primary transition-colors hover:bg-primary-fixed focus:outline-none focus:ring-2 focus:ring-primary/40 aria-disabled:cursor-not-allowed aria-disabled:opacity-45"
          >
            <Icon size={14} aria-hidden="true" />
          </Link>
        ) : (
          <button key={key} type="button" disabled aria-disabled="true" aria-label={`${label} ${recordType}`} title={`${label} ${recordType}`} className="inline-flex size-8 items-center justify-center rounded-md text-on-surface-variant opacity-45">
            <Icon size={14} aria-hidden="true" />
          </button>
        )
      ))}
    </nav>
  );
}
