import { ChevronRight } from "lucide-react";
import PendingLink from "@/components/ui/PendingLink";
import { requireInternalHref } from "@/lib/navigation/internal-href";

export interface BreadcrumbItem {
  label: string;
  href?: string;
  current?: boolean;
  dir?: "auto" | "ltr" | "rtl";
}

/** Explicit structural hierarchy, never inferred from pathname or return origin. */
export default function Breadcrumbs({ items, label }: { items: readonly BreadcrumbItem[]; label: string }) {
  if (!label.trim() || items.length === 0 || items.filter((item) => item.current).length !== 1 || !items.at(-1)?.current || items.some((item) => !item.label.trim() || (item.current && item.href !== undefined))) {
    throw new Error("Breadcrumbs require a label and exactly one final, unlinked current item");
  }
  return (
    <nav aria-label={label} className="min-w-0">
      <ol className="flex min-w-0 flex-wrap items-start gap-x-2 gap-y-1 text-sm text-on-surface-variant">
        {items.map((item, index) => (
          <li key={index} className="flex min-w-0 max-w-full items-start gap-2">
            {index > 0 ? <ChevronRight size={16} aria-hidden="true" className="mt-0.5 shrink-0 rtl:rotate-180" /> : null}
            {item.href !== undefined ? (
              <PendingLink href={requireInternalHref(item.href)} className="min-w-0 break-words rounded-sm text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40">
                <bdi dir={item.dir ?? "auto"}>{item.label}</bdi>
              </PendingLink>
            ) : (
              <span aria-current={item.current ? "page" : undefined} className={`min-w-0 break-words ${item.current ? "font-medium text-on-surface" : ""}`}><bdi dir={item.dir ?? "auto"}>{item.label}</bdi></span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
