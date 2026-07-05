"use client";

import Link from "next/link";
import {
  forwardRef,
  type ComponentPropsWithoutRef,
  type MouseEvent,
} from "react";
import {
  isExternalHref,
  isModifiedNavigationEvent,
  isSameNavigationHref,
  useGlobalNavigationPending,
} from "@/components/ui/useGlobalNavigationPending";

type PendingLinkProps = ComponentPropsWithoutRef<typeof Link> & {
  pendingLabel?: string;
};

const PendingLink = forwardRef<HTMLAnchorElement, PendingLinkProps>(
  function PendingLink({ href, onClick, pendingLabel, target, download, ...props }, ref) {
    const { startPending } = useGlobalNavigationPending();
    const hrefValue = typeof href === "string" ? href : href.toString();

    const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
      onClick?.(event);

      if (
        event.defaultPrevented ||
        isModifiedNavigationEvent(event) ||
        Boolean(download) ||
        (target && target !== "_self") ||
        isExternalHref(hrefValue) ||
        isSameNavigationHref(hrefValue)
      ) {
        return;
      }

      startPending({ label: pendingLabel });
    };

    return (
      <Link
        {...props}
        ref={ref}
        download={download}
        href={href}
        onClick={handleClick}
        target={target}
      />
    );
  }
);

export default PendingLink;
