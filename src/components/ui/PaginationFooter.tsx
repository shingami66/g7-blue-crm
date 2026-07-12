"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Button from "@/components/ui/Button";
import { useLocale } from "@/components/i18n/LocaleProvider";
import {
  formatPaginationCopy,
  getPaginationDictionary,
} from "@/lib/i18n/dictionaries/common";
import { getDirection } from "@/lib/i18n/direction";

interface PaginationFooterProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export default function PaginationFooter({
  currentPage,
  totalPages,
  onPageChange,
  className = "",
}: PaginationFooterProps) {
  const locale = useLocale();
  const copy = getPaginationDictionary(locale);
  const isRtl = getDirection(locale) === "rtl";

  if (totalPages <= 1) return null;

  // Visual chevrons follow reading direction; handlers always step page index, not visual side.
  const PreviousIcon = isRtl ? ChevronRight : ChevronLeft;
  const NextIcon = isRtl ? ChevronLeft : ChevronRight;

  return (
    <div
      className={`bg-surface-container-lowest border-t border-surface-variant p-4 flex flex-wrap items-center justify-between gap-3 rounded-b-xl border border-x-0 border-b-0 sm:flex-nowrap ${className}`}
    >
      <Button
        className={`min-w-0 shrink ${isRtl ? "order-3" : "order-1"}`}
        disabled={currentPage === 1}
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        aria-label={copy.previousPage}
        size="sm"
        variant="outline"
      >
        <PreviousIcon aria-hidden size={16} className="shrink-0" />
        <span className="truncate">{copy.previous}</span>
      </Button>
      <div className="order-2 flex max-w-full flex-wrap justify-center gap-1" dir="ltr">
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
          const isCurrent = currentPage === page;
          return (
            <Button
              key={page}
              onClick={() => onPageChange(page)}
              aria-label={
                isCurrent
                  ? formatPaginationCopy(copy.currentPage, page)
                  : formatPaginationCopy(copy.goToPage, page)
              }
              aria-current={isCurrent ? "page" : undefined}
              className="h-8 w-8 shrink-0 rounded"
              size="icon"
              variant={isCurrent ? "primary" : "ghost"}
            >
              <span dir="ltr">{page}</span>
            </Button>
          );
        })}
      </div>
      <Button
        className={`min-w-0 shrink ${isRtl ? "order-1" : "order-3"}`}
        disabled={currentPage === totalPages}
        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
        aria-label={copy.nextPage}
        size="sm"
        variant="outline"
      >
        <span className="truncate">{copy.next}</span>
        <NextIcon aria-hidden size={16} className="shrink-0" />
      </Button>
    </div>
  );
}
