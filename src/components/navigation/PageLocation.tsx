import type { ReactNode } from "react";
import Breadcrumbs, { type BreadcrumbItem } from "./Breadcrumbs";

type PageLocationProps = {
  breadcrumbs?: { items: readonly BreadcrumbItem[]; label: string };
  returnControl?: ReactNode;
};

/** Structural location and entry origin are deliberately independent inputs. */
export default function PageLocation({ breadcrumbs, returnControl }: PageLocationProps) {
  if (!breadcrumbs && !returnControl) return null;
  return (
    <div className="flex min-w-0 flex-col items-start gap-3" data-page-location="true">
      {breadcrumbs ? <Breadcrumbs {...breadcrumbs} /> : null}
      {returnControl}
    </div>
  );
}
