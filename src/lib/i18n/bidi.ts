export const FIRST_STRONG_ISOLATE = "\u2068";
export const POP_DIRECTIONAL_ISOLATE = "\u2069";

export function isolateBidiText(value: string): string {
  return `${FIRST_STRONG_ISOLATE}${value}${POP_DIRECTIONAL_ISOLATE}`;
}
