"use client";

import Link, { useLinkStatus } from "next/link";
import {
  forwardRef,
  useEffect,
  useId,
  useState,
  type ComponentPropsWithoutRef,
} from "react";
import { useNavigationFeedback } from "./NavigationFeedbackProvider";

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
        className={`ms-1.5 inline-flex size-2.5 shrink-0 items-center justify-center align-middle opacity-0 transition-opacity duration-150 motion-reduce:transition-none ${
          showPending ? "opacity-80" : ""
        }`}
        data-navigation-pending={showPending ? "true" : undefined}
      >
        <svg
          className="size-2.5 motion-safe:animate-spin motion-reduce:animate-none"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
        >
          <circle
            cx="8"
            cy="8"
            r="6"
            strokeWidth="2.5"
            strokeDasharray="28"
            strokeDashoffset="10"
            className="opacity-90"
          />
        </svg>
      </span>
      {pendingLabel ? (
        <span aria-live="polite" className="sr-only">
          {showPending ? pendingLabel : ""}
        </span>
      ) : null}
    </>
  );
}

function PendingLinkHint({ pendingLabel }: { pendingLabel?: string }) {
  const id = useId();
  const { pending } = useLinkStatus();
  const { reportPending } = useNavigationFeedback();

  useEffect(() => {
    reportPending(id, pending);
    return () => {
      reportPending(id, false);
    };
  }, [id, pending, reportPending]);

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
