export const LIST_PAGE_SIZES = [10, 20, 50] as const;

export type ListPageSize = (typeof LIST_PAGE_SIZES)[number];
export type PaginationItem = number | "ellipsis";

export function normalizeListPage(value: unknown): number {
  if (typeof value === "number") {
    return Number.isSafeInteger(value) && value > 0 ? value : 1;
  }

  if (typeof value !== "string" || !/^[1-9]\d*$/.test(value)) return 1;
  const page = Number(value);
  return Number.isSafeInteger(page) ? page : 1;
}

export function normalizeListPageSize(value: unknown): ListPageSize {
  const numericValue = typeof value === "string" ? Number(value) : value;
  return LIST_PAGE_SIZES.includes(numericValue as ListPageSize)
    ? (numericValue as ListPageSize)
    : LIST_PAGE_SIZES[0];
}

export function getPaginationItems(
  currentPage: number,
  totalPages: number,
): PaginationItem[] {
  if (totalPages <= 1) return totalPages === 1 ? [1] : [];
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  if (currentPage <= 4) return [1, 2, 3, 4, 5, "ellipsis", totalPages];
  if (currentPage >= totalPages - 3) {
    return [
      1,
      "ellipsis",
      totalPages - 4,
      totalPages - 3,
      totalPages - 2,
      totalPages - 1,
      totalPages,
    ];
  }

  return [
    1,
    "ellipsis",
    currentPage - 1,
    currentPage,
    currentPage + 1,
    "ellipsis",
    totalPages,
  ];
}
