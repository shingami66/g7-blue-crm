"use client";

import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import Button from "@/components/ui/Button";
import { useLocale } from "@/components/i18n/LocaleProvider";
import {
  formatPaginationCopy,
  getPaginationDictionary,
} from "@/lib/i18n/dictionaries/common";
import { getDirection } from "@/lib/i18n/direction";
import {
  getPaginationItems,
  LIST_PAGE_SIZES,
  type ListPageSize,
} from "@/lib/pagination";

interface PaginationFooterProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  paginationMode?: "legacy" | "bounded";
  total?: number;
  pageSize?: ListPageSize;
  isPending?: boolean;
  onPageSizeChange?: (pageSize: ListPageSize) => void;
  className?: string;
}

export default function PaginationFooter({
  currentPage,
  totalPages,
  onPageChange,
  paginationMode = "legacy",
  total = 0,
  pageSize = LIST_PAGE_SIZES[0],
  isPending = false,
  onPageSizeChange,
  className = "",
}: PaginationFooterProps) {
  const locale = useLocale();
  const copy = getPaginationDictionary(locale);
  const isRtl = getDirection(locale) === "rtl";

  if (paginationMode === "legacy" && totalPages <= 1) return null;
  if (paginationMode === "bounded" && total <= 0) return null;

  // Visual chevrons follow reading direction; handlers always step page index, not visual side.
  const PreviousIcon = isRtl ? ChevronRight : ChevronLeft;
  const NextIcon = isRtl ? ChevronLeft : ChevronRight;

  if (paginationMode === "bounded") {
    const visibleStart = total === 0 ? 0 : (currentPage - 1) * pageSize + 1;
    const visibleEnd = Math.min(currentPage * pageSize, total);
    const items = getPaginationItems(currentPage, totalPages);
    const FirstIcon = isRtl ? ChevronsRight : ChevronsLeft;
    const LastIcon = isRtl ? ChevronsLeft : ChevronsRight;

    return (
      <nav
        aria-label={copy.pageSizeLabel}
        aria-busy={isPending || undefined}
        className={`bg-surface-container-lowest border-t border-surface-variant p-3 flex flex-wrap items-center justify-between gap-3 rounded-b-xl border border-x-0 border-b-0 ${className}`}
      >
        <label className="order-1 flex shrink-0 items-center gap-2 text-[13px] text-on-surface-variant">
          <span className="sr-only">{copy.pageSizeLabel}</span>
          <span aria-hidden="true">{copy.pageSize}</span>
          <select
            value={pageSize}
            disabled={isPending}
            onChange={(event) => onPageSizeChange?.(Number(event.target.value) as ListPageSize)}
            aria-label={copy.pageSizeLabel}
            className="rounded-md border border-outline-variant bg-surface px-2 py-1.5 text-on-surface focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            {LIST_PAGE_SIZES.map((size) => <option key={size} value={size}>{size}</option>)}
          </select>
        </label>

        <div className="order-2 flex min-w-0 max-w-full items-center justify-center gap-1 overflow-x-auto" dir="ltr">
          <Button
            className="shrink-0"
            disabled={isPending || currentPage === 1}
            onClick={() => onPageChange(1)}
            aria-label={copy.firstPage}
            size="icon"
            variant="outline"
          ><FirstIcon aria-hidden size={16} /></Button>
          <Button
            className="shrink-0"
            disabled={isPending || currentPage === 1}
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            aria-label={copy.previousPage}
            size="sm"
            variant="outline"
          ><PreviousIcon aria-hidden size={16} /><span className="hidden sm:inline">{copy.previous}</span></Button>
          {items.map((item, index) => item === "ellipsis" ? (
            <span key={`ellipsis-${index}`} className="px-1 text-on-surface-variant" aria-hidden="true">…</span>
          ) : (
            <Button
              key={item}
              disabled={isPending}
              onClick={() => onPageChange(item)}
              aria-label={item === currentPage ? formatPaginationCopy(copy.currentPage, item) : formatPaginationCopy(copy.goToPage, item)}
              aria-current={item === currentPage ? "page" : undefined}
              className="h-8 w-8 shrink-0 rounded"
              size="icon"
              variant={item === currentPage ? "primary" : "ghost"}
            ><span dir="ltr">{item}</span></Button>
          ))}
          <Button
            className="shrink-0"
            disabled={isPending || currentPage === totalPages}
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            aria-label={copy.nextPage}
            size="sm"
            variant="outline"
          ><span className="hidden sm:inline">{copy.next}</span><NextIcon aria-hidden size={16} /></Button>
          <Button
            className="shrink-0"
            disabled={isPending || currentPage === totalPages}
            onClick={() => onPageChange(totalPages)}
            aria-label={copy.lastPage}
            size="icon"
            variant="outline"
          ><LastIcon aria-hidden size={16} /></Button>
        </div>

        <span className="order-3 shrink-0 text-[13px] text-on-surface-variant">
          {total === 0 ? copy.showingZero : copy.showingRange.replace("{start}", String(visibleStart)).replace("{end}", String(visibleEnd)).replace("{total}", String(total))}
        </span>
      </nav>
    );
  }

  return (
    <div
      className={`bg-surface-container-lowest border-t border-surface-variant p-4 flex flex-wrap items-center justify-between gap-3 rounded-b-xl border border-x-0 border-b-0 sm:flex-nowrap ${className}`}
    >
      <Button
        className={`min-w-0 shrink ${isRtl ? "order-3" : "order-1"}`}
        disabled={isPending || currentPage === 1}
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
              disabled={isPending}
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
        disabled={isPending || currentPage === totalPages}
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
