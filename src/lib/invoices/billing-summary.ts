import type { Locale } from "../i18n/locales.ts";
import { formatSarAmount } from "../i18n/formatting.ts";

export function formatServiceBillingSummaryAmount(
  amount: number | null | undefined,
  locale: Locale,
  unavailableLabel: string,
): string {
  return amount != null
    ? formatSarAmount(locale, amount)
    : unavailableLabel;
}
