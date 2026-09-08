"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

export type NavigationFeedbackContextValue = {
  isPending: boolean;
  showHalo: boolean;
  reportPending: (id: string, pending: boolean) => void;
};

const NOOP_NAVIGATION_FEEDBACK: NavigationFeedbackContextValue = {
  isPending: false,
  showHalo: false,
  reportPending: () => {},
};

const NavigationFeedbackContext = createContext<NavigationFeedbackContextValue>(
  NOOP_NAVIGATION_FEEDBACK,
);

export function useNavigationFeedback(): NavigationFeedbackContextValue {
  return useContext(NavigationFeedbackContext);
}

export function NavigationFeedbackProvider({
  children,
  thresholdMs = 160,
}: {
  children: ReactNode;
  thresholdMs?: number;
}) {
  const pendingSetRef = useRef<Set<string>>(new Set());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showHaloRef = useRef(false);
  const [isPending, setIsPending] = useState(false);
  const [showHalo, setShowHalo] = useState(false);

  const reportPending = useCallback(
    (id: string, pending: boolean) => {
      const pendingSet = pendingSetRef.current;
      const wasPending = pendingSet.has(id);

      if (pending) {
        pendingSet.add(id);
        setIsPending(true);

        // Start delayed halo reveal timer if not already scheduled
        if (!timerRef.current && !showHaloRef.current) {
          timerRef.current = setTimeout(() => {
            timerRef.current = null;
            if (pendingSetRef.current.size > 0) {
              showHaloRef.current = true;
              setShowHalo(true);
            }
          }, thresholdMs);
        }
      } else if (wasPending) {
        pendingSet.delete(id);

        if (pendingSet.size === 0) {
          setIsPending(false);
          showHaloRef.current = false;
          setShowHalo(false);
          if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
          }
        }
      }
    },
    [thresholdMs],
  );

  useEffect(() => {
    const pendingSet = pendingSetRef.current;
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      pendingSet.clear();
      showHaloRef.current = false;
    };
  }, []);

  const value: NavigationFeedbackContextValue = {
    isPending,
    showHalo,
    reportPending,
  };

  return (
    <NavigationFeedbackContext.Provider value={value}>
      {children}
    </NavigationFeedbackContext.Provider>
  );
}

export function NavigationFeedbackBoundary({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const { showHalo } = useNavigationFeedback();

  return (
    <div className={`relative flex min-w-0 flex-1 flex-col ${className}`}>
      {showHalo && (
        <div
          aria-hidden="true"
          data-testid="g7-pending-halo"
          className="g7-pending-halo pointer-events-none absolute inset-0 z-10 transition-opacity duration-200"
        />
      )}
      {children}
    </div>
  );
}
