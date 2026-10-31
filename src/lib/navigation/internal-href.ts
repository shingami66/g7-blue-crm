/** UI-link safety only; does not widen the domain-specific return-origin allowlist. */
export function requireInternalHref(href: string): string {
  if (!href.startsWith("/") || href.startsWith("//") || href !== href.trim() || /[\u0000-\u001f\u007f\\]/.test(href)) {
    throw new Error("Navigation destination must be an internal absolute path");
  }
  return href;
}
