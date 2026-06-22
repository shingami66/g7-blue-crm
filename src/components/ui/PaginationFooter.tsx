"use client";

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
      <button
        disabled={currentPage === 1}
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        className="px-3 py-1 bg-surface border border-outline-variant rounded text-[14px] text-on-surface hover:bg-surface-container-low disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        aria-label="Previous page"
      >
        Previous
      </button>
      <div className="flex gap-1">
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            className={`w-8 h-8 flex items-center justify-center rounded text-[14px] font-semibold transition-colors ${
              currentPage === page
                ? "bg-primary text-white"
                : "bg-surface text-on-surface hover:bg-surface-container-low border border-transparent hover:border-outline-variant"
            }`}
            aria-label={`Page ${page}`}
            aria-current={currentPage === page ? "page" : undefined}
          >
            {page}
          </button>
        ))}
      </div>
      <button
        disabled={currentPage === totalPages}
        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
        className="px-3 py-1 bg-surface border border-outline-variant rounded text-[14px] text-on-surface hover:bg-surface-container-low disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        aria-label="Next page"
      >
        Next
      </button>
    </div>
  );
}
