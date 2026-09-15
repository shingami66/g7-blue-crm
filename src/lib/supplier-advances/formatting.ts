import { formatSarAmount } from "@/lib/i18n/formatting";

/** Display an advance amount in the currency inherited from its commitment. */
export function formatSupplierAdvanceAmount(currency: string, value: number): string {
  const code = currency.trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(code) || !Number.isFinite(value)) return "—";
  if (code === "SAR") return formatSarAmount("en", value);

  const amount = new Intl.NumberFormat("en-SA", {
    numberingSystem: "latn",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
  return `${code} ${amount}`;
}
