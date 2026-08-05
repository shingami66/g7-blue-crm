"use client";

import Link from "next/link";
import {
  forwardRef,
  type ComponentPropsWithoutRef,
} from "react";

type PendingLinkProps = ComponentPropsWithoutRef<typeof Link> & {
  pendingLabel?: string;
};

const PendingLink = forwardRef<HTMLAnchorElement, PendingLinkProps>(
  function PendingLink({ href, pendingLabel: _pendingLabel, ...props }, ref) {
    void _pendingLabel;
    return (
      <Link
        {...props}
        ref={ref}
        href={href}
      />
    );
  }
);

export default PendingLink;
