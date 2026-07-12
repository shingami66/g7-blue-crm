export function getSafeActionErrorMessage(
  errorCode: string | null | undefined,
  knownMessages: Readonly<Record<string, string>>,
  fallback: string,
): string {
  return errorCode && Object.prototype.hasOwnProperty.call(knownMessages, errorCode)
    ? knownMessages[errorCode]
    : fallback;
}
