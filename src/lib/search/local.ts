import { getSearchTermVariants } from "./sanitize.ts";

export function matchesLocalSearch(
  query: string,
  fields: Array<string | number | null | undefined>,
): boolean {
  const variants = getSearchTermVariants(query).map((variant) =>
    variant.toLocaleLowerCase(),
  );
  if (variants.length === 0) return true;

  return fields.some((field) => {
    if (field === null || field === undefined) return false;
    const value = String(field).toLocaleLowerCase();
    return variants.some((variant) => value.includes(variant));
  });
}
