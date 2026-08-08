"use client";

import { useCallback, useTransition } from "react";
import { useRouter } from "next/navigation";

type NavigationPendingOptions = {
  label?: string;
};

function isSameRoute(href: string) {
  if (typeof window === "undefined") {
    return false;
  }

  const nextUrl = new URL(href, window.location.href);
  return (
    nextUrl.origin === window.location.origin &&
    nextUrl.pathname === window.location.pathname &&
    nextUrl.search === window.location.search
  );
}

export function useGlobalNavigationPending() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Keep the legacy lifecycle methods for older callers. Navigation itself is
  // now wrapped in a real React transition so callers can disable duplicate
  // route actions while the destination is resolving.
  const startPending = useCallback((options: NavigationPendingOptions = {}) => {
    void options;
  }, []);
  const finishPending = useCallback(() => {}, []);

  const push = useCallback(
    (href: string, options?: NavigationPendingOptions) => {
      if (isSameRoute(href)) {
        return;
      }

      void options;
      startTransition(() => router.push(href));
    },
    [router, startTransition]
  );

  const back = useCallback(
    (options?: NavigationPendingOptions) => {
      void options;
      startTransition(() => router.back());
    },
    [router, startTransition]
  );

  return {
    back,
    finishPending,
    isPending,
    push,
    startPending,
  };
}

export function isModifiedNavigationEvent(
  event: Pick<MouseEvent, "button" | "metaKey" | "altKey" | "ctrlKey" | "shiftKey">
) {
  return (
    event.button !== 0 ||
    event.metaKey ||
    event.altKey ||
    event.ctrlKey ||
    event.shiftKey
  );
}

export function isExternalHref(href: string) {
  if (typeof window === "undefined") {
    return false;
  }

  const nextUrl = new URL(href, window.location.href);
  return nextUrl.origin !== window.location.origin;
}

export function isSameNavigationHref(href: string) {
  return isSameRoute(href);
}
