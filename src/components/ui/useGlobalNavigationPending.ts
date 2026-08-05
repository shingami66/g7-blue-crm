"use client";

import {
  useCallback,
} from "react";
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
  // Route-level loading.tsx owns slow navigation feedback. Keep this helper's
  // public shape for older callers without introducing a global visual state.
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
      router.push(href);
    },
    [router]
  );

  const back = useCallback(
    (options?: NavigationPendingOptions) => {
      void options;
      router.back();
    },
    [router]
  );

  return {
    back,
    finishPending,
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
