"use client";

import Link, { useLinkStatus } from "next/link";
import {
  forwardRef,
  useEffect,
  useState,
  type ComponentPropsWithoutRef,
} from "react";

type PendingLinkProps = ComponentPropsWithoutRef<typeof Link> & {
  pendingLabel?: string;
};

function PendingLinkStatus({
  pending,
  pendingLabel,
}: {
  pending: boolean;
  pendingLabel?: string;
}) {
  const [showPending, setShowPending] = useState(false);

  useEffect(() => {
    if (!pending) {
      return;
    }

    const timer = window.setTimeout(() => setShowPending(true), 150);
    return () => window.clearTimeout(timer);
  }, [pending]);

  return (
    <>
      <span
        aria-hidden="true"
        className={`ms-1 inline-block size-1.5 shrink-0 rounded-full bg-current align-middle opacity-0 transition-opacity duration-150 motion-reduce:transition-none ${
          showPending ? "opacity-70 motion-safe:animate-pulse" : ""
        }`}
        data-navigation-pending={showPending ? "true" : undefined}
      />
      {pendingLabel ? (
        <span aria-live="polite" className="sr-only">
          {showPending ? pendingLabel : ""}
        </span>
      ) : null}
    </>
  );
}

function PendingLinkHint({ pendingLabel }: { pendingLabel?: string }) {
  const { pending } = useLinkStatus();

  return (
    <PendingLinkStatus
      key={pending ? "pending" : "idle"}
      pending={pending}
      pendingLabel={pendingLabel}
    />
  );
}

const PendingLink = forwardRef<HTMLAnchorElement, PendingLinkProps>(
  function PendingLink({ href, pendingLabel, children, ...props }, ref) {
    return (
      <Link
        {...props}
        ref={ref}
        href={href}
      >
        {children}
        <PendingLinkHint pendingLabel={pendingLabel} />
      </Link>
    );
  }
);

export default PendingLink;
