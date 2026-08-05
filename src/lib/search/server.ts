import { getSearchTermVariants } from "./sanitize.ts";

/**
 * Build a bounded PostgREST OR expression for server-side human-text search.
 * Search terms are sanitized before they become filter syntax.
 */
export function buildIlikeOrFilter(
  columns: readonly string[],
  query: string | undefined,
): string | undefined {
  if (columns.length === 0 || !query) return undefined;

  const variants = getSearchTermVariants(query);
  if (variants.length === 0) return undefined;

  return variants
    .flatMap((variant) => columns.map((column) => `${column}.ilike.${toIlikeValue(variant)}`))
    .join(",");
}

function toIlikeValue(variant: string): string {
  const escaped = variant.replaceAll("\\", "\\\\").replaceAll('"', '\\"');
  return /[,.():\\"]/.test(variant) ? `"*${escaped}*"` : `*${escaped}*`;
}
