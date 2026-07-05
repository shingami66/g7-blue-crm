"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  type MutableRefObject,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useGlobalPending } from "@/components/ui/GlobalPendingProvider";

type NavigationPendingOptions = {
  label?: string;
};

type PendingEntryState = {
  id: symbol | null;
  shownAt: number | null;
};

const SHOW_DELAY_MS = 350;
const MIN_VISIBLE_MS = 300;
const FALLBACK_CLEAR_MS = 15000;

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
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { hidePending, showPending } = useGlobalPending();
  const pendingRef = useRef<PendingEntryState>({ id: null, shownAt: null });
  const mountedRef = useRef(false);
  const showTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const routeKey = useMemo(
    () => `${pathname}?${searchParams.toString()}`,
    [pathname, searchParams]
  );

  const clearTimer = useCallback(
    (timerRef: MutableRefObject<ReturnType<typeof setTimeout> | null>) => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    },
    []
  );

  const clearAllTimers = useCallback(() => {
    clearTimer(showTimerRef);
    clearTimer(hideTimerRef);
    clearTimer(fallbackTimerRef);
  }, [clearTimer]);

  const forceHide = useCallback(() => {
    const { id } = pendingRef.current;

    clearAllTimers();

    if (id) {
      hidePending(id);
    }

    pendingRef.current = {
      id: null,
      shownAt: null,
    };
  }, [clearAllTimers, hidePending]);

  const finishPending = useCallback(() => {
    clearTimer(showTimerRef);
    clearTimer(fallbackTimerRef);

    const { id, shownAt } = pendingRef.current;

    if (!id) {
      return;
    }

    const elapsed = shownAt ? Date.now() - shownAt : MIN_VISIBLE_MS;
    const remaining = Math.max(0, MIN_VISIBLE_MS - elapsed);

    if (remaining === 0) {
      forceHide();
      return;
    }

    clearTimer(hideTimerRef);
    hideTimerRef.current = setTimeout(() => {
      forceHide();
    }, remaining);
  }, [clearTimer, forceHide]);

  const startPending = useCallback(
    ({ label }: NavigationPendingOptions = {}) => {
      forceHide();

      showTimerRef.current = setTimeout(() => {
        pendingRef.current = {
          id: showPending(label),
          shownAt: Date.now(),
        };
      }, SHOW_DELAY_MS);

      fallbackTimerRef.current = setTimeout(() => {
        forceHide();
      }, SHOW_DELAY_MS + FALLBACK_CLEAR_MS);
    },
    [forceHide, showPending]
  );

  const push = useCallback(
    (href: string, options?: NavigationPendingOptions) => {
      if (isSameRoute(href)) {
        return;
      }

      startPending(options);
      router.push(href);
    },
    [router, startPending]
  );

  const back = useCallback(
    (options?: NavigationPendingOptions) => {
      startPending(options);
      router.back();
    },
    [router, startPending]
  );

  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }

    finishPending();
  }, [finishPending, routeKey]);

  useEffect(
    () => () => {
      forceHide();
    },
    [forceHide]
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
