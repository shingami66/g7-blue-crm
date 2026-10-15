const HALALAH_PER_SAR = BigInt(100);
const SAR_DECIMAL = /^(0|[1-9][0-9]*)(?:\.([0-9]{1,2}))?$/;
const ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";
const PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹";

/** Convert a positive SAR amount to integer halalah without Number rounding. */
export function parseSarAsHalalah(input: string): string | null {
  const normalized = input
    .trim()
    .replace(/[٠-٩]/g, (digit) => String(ARABIC_DIGITS.indexOf(digit)))
    .replace(/[۰-۹]/g, (digit) => String(PERSIAN_DIGITS.indexOf(digit)))
    .replace("٫", ".");
  if (normalized.length > 40) return null;
  const match = SAR_DECIMAL.exec(normalized);
  if (!match) return null;
  const whole = BigInt(match[1]!);
  const fraction = BigInt((match[2] ?? "").padEnd(2, "0") || "0");
  const halalah = whole * HALALAH_PER_SAR + fraction;
  return halalah > BigInt(0) ? halalah.toString() : null;
}

/** Render a non-negative halalah amount in an editable exact decimal form. */
export function halalahToSarInput(halalah: string): string {
  if (!/^(0|[1-9][0-9]*)$/.test(halalah)) throw new Error("Invalid halalah amount");
  const value = BigInt(halalah);
  const whole = value / HALALAH_PER_SAR;
  const fraction = String(value % HALALAH_PER_SAR).padStart(2, "0");
  return whole.toString() + "." + fraction;
}
