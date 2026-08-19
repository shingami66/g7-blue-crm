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
  placement?: "top" | "bottom";
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
  placement = "top",
  className = "",
}: PaginationFooterProps) {
  const locale = useLocale();
  const copy = getPaginationDictionary(locale);
  const isRtl = getDirection(locale) === "rtl";

  if (paginationMode === "legacy" && totalPages <= 1) return null;
  if (paginationMode === "bounded" && total <= 0) return null;

  // Visual chevrons follow reading direction; handlers always step page index.
  const PreviousIcon = isRtl ? ChevronRight : ChevronLeft;
  const NextIcon = isRtl ? ChevronLeft : ChevronRight;

  const borderClasses =
    placement === "top"
      ? "border-b border-surface-variant"
      : "border-t border-surface-variant rounded-b-xl";

  if (paginationMode === "bounded") {
    const visibleStart = total === 0 ? 0 : (currentPage - 1) * pageSize + 1;
    const visibleEnd = Math.min(currentPage * pageSize, total);
    const FirstIcon = isRtl ? ChevronsRight : ChevronsLeft;
    const LastIcon = isRtl ? ChevronsLeft : ChevronsRight;
    const [pageOfBeforeCurrent, pageOfAfterCurrent = ""] = copy.pageOf.split("{current}");
    const [pageOfBetween, pageOfAfterTotal = ""] = pageOfAfterCurrent.split("{total}");

    return (
      <nav
        aria-label={copy.paginationLabel}
        aria-busy={isPending || undefined}
        className={`bg-surface-container-lowest px-3 py-2 flex flex-wrap items-center justify-between gap-3 ${borderClasses} ${className}`}
      >
        <span className="shrink-0 text-[13px] text-on-surface-variant">
          {total === 0 ? copy.showingZero : copy.showingRange.replace("{start}", String(visibleStart)).replace("{end}", String(visibleEnd)).replace("{total}", String(total))}
        </span>

        <div className="flex min-w-0 max-w-full flex-wrap items-center justify-end gap-2">
          <label className="flex shrink-0 items-center gap-2 text-[13px] text-on-surface-variant">
            <span>{copy.pageSize}</span>
            <select
              value={pageSize}
              disabled={isPending}
              onChange={(event) => onPageSizeChange?.(Number(event.target.value) as ListPageSize)}
              aria-label={copy.pageSizeLabel}
              className="h-8 rounded-md border border-outline-variant bg-surface px-2 text-[13px] text-on-surface focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              {LIST_PAGE_SIZES.map((size) => <option key={size} value={size}>{size}</option>)}
            </select>
          </label>

          <label className="flex shrink-0 items-center gap-2 text-[13px] text-on-surface-variant">
            <span>{copy.goTo}</span>
            <select
              value={currentPage}
              disabled={isPending || totalPages <= 1}
              onChange={(event) => onPageChange(Number(event.target.value))}
              aria-label={copy.goTo}
              className="h-8 rounded-md border border-outline-variant bg-surface px-2 text-[13px] text-on-surface focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              dir="ltr"
            >
              {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
                <option key={page} value={page}>{page}</option>
              ))}
            </select>
          </label>

          <span className="shrink-0 text-[13px] text-on-surface-variant">
            {pageOfBeforeCurrent}<bdi dir="ltr">{currentPage}</bdi>{pageOfBetween}<bdi dir="ltr">{totalPages}</bdi>{pageOfAfterTotal}
          </span>

          <div className="flex shrink-0 items-center justify-center gap-1">
            <Button
              className="h-8 w-8 shrink-0 rounded"
              disabled={isPending || currentPage === 1}
              onClick={() => onPageChange(1)}
              aria-label={copy.firstPage}
              title={copy.firstPage}
              size="icon"
              variant="outline"
            >
              <FirstIcon aria-hidden size={15} />
            </Button>
            <Button
              className="h-8 w-8 shrink-0 rounded"
              disabled={isPending || currentPage === 1}
              onClick={() => onPageChange(Math.max(1, currentPage - 1))}
              aria-label={copy.previousPage}
              title={copy.previousPage}
              size="icon"
              variant="outline"
            >
              <PreviousIcon aria-hidden size={15} />
            </Button>
            <Button
              className="h-8 w-8 shrink-0 rounded"
              disabled={isPending || currentPage === totalPages}
              onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
              aria-label={copy.nextPage}
              title={copy.nextPage}
              size="icon"
              variant="outline"
            >
              <NextIcon aria-hidden size={15} />
            </Button>
            <Button
              className="h-8 w-8 shrink-0 rounded"
              disabled={isPending || currentPage === totalPages}
              onClick={() => onPageChange(totalPages)}
              aria-label={copy.lastPage}
              title={copy.lastPage}
              size="icon"
              variant="outline"
            >
              <LastIcon aria-hidden size={15} />
            </Button>
          </div>
        </div>
      </nav>
    );
  }

  return (
    <div
      className={`bg-surface-container-lowest px-3 py-2 flex flex-wrap items-center justify-between gap-3 ${borderClasses} sm:flex-nowrap ${className}`}
    >
      <Button
        className="h-8 w-8 shrink-0 rounded"
        disabled={isPending || currentPage === 1}
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        aria-label={copy.previousPage}
        title={copy.previousPage}
        size="icon"
        variant="outline"
      >
        <PreviousIcon aria-hidden size={15} className="shrink-0" />
      </Button>
      <div className="flex max-w-full flex-wrap justify-center gap-1" dir="ltr">
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
              title={
                isCurrent
                  ? formatPaginationCopy(copy.currentPage, page)
                  : formatPaginationCopy(copy.goToPage, page)
              }
              aria-current={isCurrent ? "page" : undefined}
              className="h-8 w-8 shrink-0 rounded text-[13px]"
              size="icon"
              variant={isCurrent ? "primary" : "ghost"}
            >
              <span dir="ltr">{page}</span>
            </Button>
          );
        })}
      </div>
      <Button
        className="h-8 w-8 shrink-0 rounded"
        disabled={isPending || currentPage === totalPages}
        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
        aria-label={copy.nextPage}
        title={copy.nextPage}
        size="icon"
        variant="outline"
      >
        <NextIcon aria-hidden size={15} className="shrink-0" />
      </Button>
    </div>
  );
}
