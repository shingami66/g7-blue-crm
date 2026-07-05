"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Button from "@/components/ui/Button";

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
  const footerRef = useRef<HTMLDivElement>(null);
  const [isRtl, setIsRtl] = useState(false);

  useEffect(() => {
    const direction = footerRef.current?.closest("[dir]")?.getAttribute("dir");
    setIsRtl(direction === "rtl");
  }, []);

  if (totalPages <= 1) return null;

  const PreviousIcon = isRtl ? ChevronRight : ChevronLeft;
  const NextIcon = isRtl ? ChevronLeft : ChevronRight;

  return (
    <div
      ref={footerRef}
      className={`bg-surface-container-lowest border-t border-surface-variant p-4 flex flex-wrap items-center justify-between gap-3 rounded-b-xl border border-x-0 border-b-0 sm:flex-nowrap ${className}`}
    >
      <Button
        className={isRtl ? "order-3" : "order-1"}
        disabled={currentPage === 1}
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        aria-label="Previous page"
        size="sm"
        variant="outline"
      >
        <PreviousIcon size={16} />
        Previous
      </Button>
      <div className="order-2 flex gap-1" dir="ltr">
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
          <Button
            key={page}
            onClick={() => onPageChange(page)}
            aria-label={`Page ${page}`}
            aria-current={currentPage === page ? "page" : undefined}
            className="h-8 w-8 rounded"
            size="icon"
            variant={currentPage === page ? "primary" : "ghost"}
          >
            {page}
          </Button>
        ))}
      </div>
      <Button
        className={isRtl ? "order-1" : "order-3"}
        disabled={currentPage === totalPages}
        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
        aria-label="Next page"
        size="sm"
        variant="outline"
      >
        Next
        <NextIcon size={16} />
      </Button>
    </div>
  );
}
