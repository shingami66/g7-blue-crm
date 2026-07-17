export type AuthoritativeMoneyField =
  | { kind: "value"; amount: number }
  | { kind: "unavailable" };

const CANONICAL_DECIMAL_MONEY = /^\d+(?:\.\d+)?$/;

export function parseAuthoritativeMoney(rawAmount: unknown): number | null {
  let amount: number;

  if (typeof rawAmount === "number") {
    amount = rawAmount;
  } else if (typeof rawAmount === "string") {
    const normalizedAmount = rawAmount.trim();
    if (!CANONICAL_DECIMAL_MONEY.test(normalizedAmount)) return null;
    amount = Number(normalizedAmount);
  } else {
    return null;
  }

  if (!Number.isFinite(amount) || amount < 0) return null;
  return Object.is(amount, -0) ? 0 : amount;
}

export function sumAuthoritativeMoney(
  rawAmounts: readonly unknown[],
): number | null {
  let total = 0;

  for (const rawAmount of rawAmounts) {
    const amount = parseAuthoritativeMoney(rawAmount);
    if (amount == null) return null;

    total += amount;
    if (!Number.isFinite(total)) return null;
  }

  return total;
}

export function toAuthoritativeMoneyField(
  amount: number | null,
): AuthoritativeMoneyField {
  const authoritativeAmount = parseAuthoritativeMoney(amount);
  return authoritativeAmount == null
    ? { kind: "unavailable" }
    : { kind: "value", amount: authoritativeAmount };
}

export function isAuthoritativeZero(
  field: AuthoritativeMoneyField,
): boolean {
  return field.kind === "value" && field.amount === 0;
}
