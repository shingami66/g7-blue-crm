export type WorkspaceSkeletonVariant =
  | "list"
  | "dashboard"
  | "detail"
  | "reports"
  | "form";

const LIST_ROOTS = new Set([
  "/admin/users",
  "/customers",
  "/invoices",
  "/payments",
  "/quotations",
  "/services",
  "/suppliers",
]);

const RECORD_ROOTS = new Set([
  "/customers",
  "/invoices",
  "/quotations",
  "/services",
  "/suppliers",
]);

/** Resolves a stable visual loading shape from the destination pathname. */
export function resolveWorkspaceSkeletonVariant(
  pathname: string,
): WorkspaceSkeletonVariant {
  const normalizedPath = `/${pathname.split(/[?#]/, 1)[0].replace(/^\/+|\/+$/g, "")}`;
  const segments = normalizedPath.split("/").filter(Boolean);
  const root = segments.length > 0 ? `/${segments[0]}` : "/";

  if (normalizedPath === "/" || normalizedPath === "/dashboard") {
    return "dashboard";
  }

  if (root === "/reports") {
    return "reports";
  }

  if (normalizedPath.endsWith("/new") || normalizedPath.endsWith("/edit")) {
    return "form";
  }

  if (LIST_ROOTS.has(normalizedPath)) {
    return "list";
  }

  if (RECORD_ROOTS.has(root) && segments.length > 1) {
    return "detail";
  }

  if (root === "/settings" || root === "/admin") {
    return "form";
  }

  return "list";
}
