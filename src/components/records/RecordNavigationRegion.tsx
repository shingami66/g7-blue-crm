import type { ReactNode } from "react";

/** Place the existing pager here, separately from PageLocation's return link. */
export default function RecordNavigationRegion({ label, children }: { label: string; children?: ReactNode }) {
  if (!children) return null;
  if (!label.trim()) throw new Error("Record navigation region requires a label");
  return <section aria-label={label} className="flex min-w-0 flex-wrap items-center justify-end gap-3" data-record-navigation-region="true">{children}</section>;
}
