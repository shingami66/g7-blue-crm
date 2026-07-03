"use client";

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
  if (totalPages <= 1) return null;

  return (
    <div
      className={`bg-surface-container-lowest border-t border-surface-variant p-4 flex justify-between items-center rounded-b-xl border border-x-0 border-b-0 ${className}`}
    >
      <Button
        disabled={currentPage === 1}
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        aria-label="Previous page"
        size="sm"
        variant="outline"
      >
        Previous
      </Button>
      <div className="flex gap-1">
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
        disabled={currentPage === totalPages}
        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
        aria-label="Next page"
        size="sm"
        variant="outline"
      >
        Next
      </Button>
    </div>
  );
}
