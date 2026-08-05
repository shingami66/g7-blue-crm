const SEARCH_DIRECTIONAL_CONTROLS = /[\u061c\u200e\u200f\u202a-\u202e\u2066-\u2069]/g;

export function sanitizeSearchTerm(rawQuery: string): string {
  return rawQuery
    .normalize("NFKC")
    .replace(SEARCH_DIRECTIONAL_CONTROLS, "")
    .trim()
    .slice(0, 80)
    .replace(/[*%_]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeArabic(value: string): string {
  return value
    .replace(/[\u0610-\u061a\u064b-\u065f\u0670\u06d6-\u06ed]/g, "")
    .replace(/[\u0622\u0623\u0625\u0671]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ـ/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Return a bounded set of Arabic spelling variants for server-side ILIKE search.
 * The original spelling is retained so mixed-script and exact identifier searches stay intact.
 */
export function getSearchTermVariants(rawQuery: string): string[] {
  const sanitized = sanitizeSearchTerm(rawQuery);
  if (!sanitized) return [];

  const normalized = normalizeArabic(sanitized);
  const variants = new Set<string>([sanitized, normalized]);
  const choices: Array<{ token: string; values: string[] }> = [
    { token: "ا", values: ["ا", "أ", "إ", "آ", "ٱ"] },
    { token: "ي", values: ["ي", "ى"] },
  ];

  for (const { token, values } of choices) {
    if (!normalized.includes(token)) continue;
    const next = new Set<string>();
    for (const current of variants) {
      for (const value of values) {
        next.add(current.replace(new RegExp(token, "g"), value));
        if (next.size >= 24) break;
      }
      if (next.size >= 24) break;
    }
    for (const value of next) variants.add(value);
  }

  return Array.from(variants).filter(Boolean).slice(0, 24);
}
