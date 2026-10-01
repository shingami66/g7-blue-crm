const HALALAH_PER_SAR = BigInt(100);
const SIGNED_INTEGER = /^-?(0|[1-9][0-9]*)$/;

/** Format an authoritative signed halalah string without converting it to Number. */
export function formatHalalahAsSar(halalah: string): string {
  if (!SIGNED_INTEGER.test(halalah)) throw new Error("Invalid halalah amount");
  const value = BigInt(halalah);
  const negative = value < BigInt(0);
  const absolute = negative ? -value : value;
  const whole = absolute / HALALAH_PER_SAR;
  const fraction = String(absolute % HALALAH_PER_SAR).padStart(2, "0");
  const groupedWhole = new Intl.NumberFormat("en", {
    useGrouping: true,
    maximumFractionDigits: 0,
  }).format(whole);
  return `${negative && absolute !== BigInt(0) ? "-" : ""}${groupedWhole}.${fraction}`;
}

/** Text-only Excel value: exact, currency-labelled, and handled by the exporter’s injection guard. */
export function formatHalalahForExcel(halalah: string): string {
  return `SAR ${formatHalalahAsSar(halalah)}`;
}
