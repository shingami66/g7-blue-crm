export type QuotationDiscountType = "fixed_sar" | "percentage";

export type PercentageDiscountLine = {
  line_key: string;
  parent_line_key: string | null;
  commercial_role: "authority_line" | "included_component" | "optional_add_on";
  qty: number;
  unit_price: number;
  is_selected: boolean;
};

type DecimalParts = { coefficient: bigint; scale: number };

function decimalParts(value: number): DecimalParts | null {
  if (!Number.isFinite(value) || value < 0) return null;
  const text = String(value).toLowerCase();
  const [mantissa, exponentText] = text.split("e");
  const exponent = exponentText === undefined ? 0 : Number(exponentText);
  if (!Number.isInteger(exponent)) return null;
  const decimalIndex = mantissa.indexOf(".");
  const scale = (decimalIndex < 0 ? 0 : mantissa.length - decimalIndex - 1) - exponent;
  const digits = mantissa.replace(".", "");
  if (!/^\d+$/.test(digits)) return null;
  let coefficient = BigInt(digits);
  if (scale < 0) {
    coefficient *= BigInt(10) ** BigInt(-scale);
    return { coefficient, scale: 0 };
  }
  return { coefficient, scale };
}

function roundNonnegative(numerator: bigint, denominator: bigint): bigint {
  return (numerator + denominator / BigInt(2)) / denominator;
}

function lineAmountHalalas(line: PercentageDiscountLine): bigint | null {
  const quantity = decimalParts(line.qty);
  const unitPrice = decimalParts(line.unit_price);
  if (!quantity || !unitPrice) return null;
  const product = quantity.coefficient * unitPrice.coefficient;
  const denominator = BigInt(10) ** BigInt(quantity.scale + unitPrice.scale);
  return roundNonnegative(product * BigInt(100), denominator);
}

/** Converts a user-entered percentage with at most two decimal places to basis points. */
export function parseDiscountPercentageToBps(value: string): number | null {
  const normalized = value.trim();
  const match = /^(\d{1,3})(?:\.(\d{1,2}))?$/.exec(normalized);
  if (!match) return null;
  const whole = BigInt(match[1]);
  const fraction = BigInt((match[2] ?? "").padEnd(2, "0") || "0");
  const basisPoints = whole * BigInt(100) + fraction;
  return basisPoints <= BigInt(10_000) ? Number(basisPoints) : null;
}

export function eligiblePercentageBaseHalalas(lines: readonly PercentageDiscountLine[]): bigint | null {
  const authorityLineKeys = new Set(
    lines.filter((line) => line.commercial_role === "authority_line").map((line) => line.line_key),
  );
  let total = BigInt(0);
  for (const line of lines) {
    const isEligibleRoot = line.commercial_role === "authority_line";
    const isSelectedOptional =
      line.commercial_role === "optional_add_on" &&
      line.is_selected &&
      line.parent_line_key !== null &&
      authorityLineKeys.has(line.parent_line_key);
    if (!isEligibleRoot && !isSelectedOptional) continue;
    const amount = lineAmountHalalas(line);
    if (amount === null) return null;
    total += amount;
  }
  return total;
}

export function resolvePercentageDiscountHalalas(
  eligibleBaseHalalas: bigint,
  discountPercentageBps: number,
): bigint | null {
  if (
    eligibleBaseHalalas < BigInt(0) ||
    !Number.isInteger(discountPercentageBps) ||
    discountPercentageBps < 0 ||
    discountPercentageBps > 10_000
  ) {
    return null;
  }
  return roundNonnegative(eligibleBaseHalalas * BigInt(discountPercentageBps), BigInt(10_000));
}

export function previewPercentageDiscountSar(
  lines: readonly PercentageDiscountLine[],
  discountPercentageBps: number | null,
): number | null {
  if (discountPercentageBps === null) return null;
  const baseHalalas = eligiblePercentageBaseHalalas(lines);
  if (baseHalalas === null) return null;
  const discountHalalas = resolvePercentageDiscountHalalas(baseHalalas, discountPercentageBps);
  if (discountHalalas === null) return null;
  return Number(discountHalalas) / 100;
}
