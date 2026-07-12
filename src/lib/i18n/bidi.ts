/**
 * Bidirectional isolation helpers for mixed Arabic/English UI.
 *
 * Preferred presentation for structured LTR values (money, dates, identifiers,
 * emails, phones, UUIDs, codes) is semantic HTML:
 *   <span dir="ltr">…</span>
 * or an equivalent CSS isolation boundary.
 *
 * Use string-level isolates only when a value must be embedded in a larger
 * plain-text / mixed-direction string and a DOM `dir` boundary is unavailable.
 *
 * - `isolateLtrText` — force LTR (LRI…PDI) for structured LTR values
 * - `isolateBidiText` — first-strong isolate (FSI…PDI) for mixed free-form labels
 *
 * Helpers never mutate the source business value; they only wrap a display copy.
 * Natural customer/service descriptions should keep `dir="auto"` where appropriate.
 */

export const LEFT_TO_RIGHT_ISOLATE = "\u2066";
export const RIGHT_TO_LEFT_ISOLATE = "\u2067";
export const FIRST_STRONG_ISOLATE = "\u2068";
export const POP_DIRECTIONAL_ISOLATE = "\u2069";

/** Isolate with first-strong direction (FSI … PDI). */
export function isolateBidiText(value: string): string {
  return `${FIRST_STRONG_ISOLATE}${value}${POP_DIRECTIONAL_ISOLATE}`;
}

/** Force left-to-right isolation (LRI … PDI) for LTR-safe structured values. */
export function isolateLtrText(value: string): string {
  return `${LEFT_TO_RIGHT_ISOLATE}${value}${POP_DIRECTIONAL_ISOLATE}`;
}
