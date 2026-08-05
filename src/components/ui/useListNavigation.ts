"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type ListNavigationMethod = "push" | "replace";
type ListNavigationKind = "navigation" | "search";

const FALLBACK_CLEAR_MS = 15000;

export function useListNavigation(stateKey: string) {
  const router = useRouter();
  const [transitionPending, startTransition] = useTransition();
  const [acknowledged, setAcknowledged] = useState(false);
  const [pendingKind, setPendingKind] = useState<ListNavigationKind>("navigation");
  const pendingRef = useRef(false);
  const fallbackRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearPending = useCallback(() => {
    if (fallbackRef.current) {
      clearTimeout(fallbackRef.current);
      fallbackRef.current = null;
    }
    pendingRef.current = false;
    setPendingKind("navigation");
    setAcknowledged(false);
  }, []);

  useEffect(() => {
    const timer = setTimeout(clearPending, 0);
    return () => clearTimeout(timer);
  }, [clearPending, stateKey]);

  useEffect(() => {
    if (!transitionPending && pendingRef.current) {
      const timer = setTimeout(clearPending, 350);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [clearPending, transitionPending]);

  useEffect(
    () => () => {
      if (fallbackRef.current) clearTimeout(fallbackRef.current);
    },
    [],
  );

  const run = useCallback(
    (action: () => void, kind: ListNavigationKind = "navigation") => {
      if (pendingRef.current) return false;

      pendingRef.current = true;
      setPendingKind(kind);
      setAcknowledged(true);
      fallbackRef.current = setTimeout(clearPending, FALLBACK_CLEAR_MS);
      startTransition(action);
      return true;
    },
    [clearPending, startTransition],
  );

  const navigate = useCallback(
    (href: string, method: ListNavigationMethod = "replace", kind: ListNavigationKind = "navigation") =>
      run(() => {
        if (method === "push") router.push(href, { scroll: false });
        else router.replace(href, { scroll: false });
      }, kind),
    [router, run],
  );

  const refresh = useCallback(
    () => run(() => router.refresh()),
    [router, run],
  );

  return {
    isPending: acknowledged || transitionPending,
    isSearchPending: (acknowledged || transitionPending) && pendingKind === "search",
    navigate,
    refresh,
  };
}
