const EXACT_SAR_AMOUNT = /^\d+(?:\.\d{1,2})?$/;
const SAR_AMOUNT_TEXT = /^[+]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/;

function getDecimalScale(value: string): number | null {
  const unsignedValue = value.startsWith("+") ? value.slice(1) : value;
  const [coefficient, exponentText] = unsignedValue.toLowerCase().split("e");
  const [integerPart, fractionalPart = ""] = coefficient.split(".");
  const digits = `${integerPart}${fractionalPart}`;
  const exponent = exponentText ? Number(exponentText) : 0;

  if (/^0+$/.test(digits) || !Number.isSafeInteger(exponent)) {
    return null;
  }

  const trailingZeroCount = digits.length - digits.replace(/0+$/, "").length;
  return Math.max(0, fractionalPart.length - exponent - trailingZeroCount);
}

export function isExactPositiveSarAmountText(value: unknown): value is string {
  if (typeof value !== "string") return false;

  const normalizedValue = value.trim();
  if (!SAR_AMOUNT_TEXT.test(normalizedValue)) return false;

  const decimalScale = getDecimalScale(normalizedValue);
  return decimalScale !== null && decimalScale <= 2;
}

export function parseExactPositiveSarAmountText(value: unknown): number | null {
  if (!isExactPositiveSarAmountText(value)) return null;

  const numericAmount = Number(value);
  return isExactPositiveSarAmount(numericAmount) ? numericAmount : null;
}

export function isExactPositiveSarAmount(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value > 0 &&
    EXACT_SAR_AMOUNT.test(value.toString())
  );
}
