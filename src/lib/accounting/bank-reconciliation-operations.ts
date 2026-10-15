import { parseSarAsHalalah } from "./journal-operations";

function isZeroSar(value: string): boolean {
  const westernDigits = value
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
    .replace("٫", ".");
  return /^0(?:\.0{1,2})?$/.test(westernDigits);
}

/** Converts SAR text to a safe integer halalah amount without floating-point arithmetic. */
export function parseSarAsSafeHalalahNumber(input: string, options: { allowZero?: boolean } = {}): number | null {
  const trimmed = input.trim();
  const negative = trimmed.startsWith("-");
  const magnitudeText = negative ? trimmed.slice(1) : trimmed;
  let magnitude = parseSarAsHalalah(magnitudeText);
  if (magnitude === null && options.allowZero && isZeroSar(magnitudeText)) magnitude = "0";
  if (magnitude === null) return null;
  const absolute = BigInt(magnitude);
  if (absolute > BigInt(Number.MAX_SAFE_INTEGER)) return null;
  const signed = negative ? -absolute : absolute;
  return Number(signed);
}
