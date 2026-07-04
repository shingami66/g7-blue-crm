"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import CenterPendingBolt from "@/components/ui/CenterPendingBolt";

type PendingEntry = {
  id: symbol;
  label?: string;
};

type GlobalPendingContextValue = {
  hidePending: (id: symbol) => void;
  showPending: (label?: string) => symbol;
};

const noopId = Symbol("global-pending-noop");

const GlobalPendingContext = createContext<GlobalPendingContextValue>({
  hidePending: () => {},
  showPending: () => noopId,
});

export function GlobalPendingProvider({ children }: { children: ReactNode }) {
  const entriesRef = useRef<PendingEntry[]>([]);
  const [activeEntry, setActiveEntry] = useState<PendingEntry | null>(null);

  const syncActiveEntry = useCallback(() => {
    setActiveEntry(entriesRef.current.at(-1) ?? null);
  }, []);

  const showPending = useCallback(
    (label?: string) => {
      const id = Symbol("global-pending");
      entriesRef.current = [...entriesRef.current, { id, label }];
      syncActiveEntry();
      return id;
    },
    [syncActiveEntry]
  );

  const hidePending = useCallback(
    (id: symbol) => {
      if (id === noopId) {
        return;
      }

      entriesRef.current = entriesRef.current.filter((entry) => entry.id !== id);
      syncActiveEntry();
    },
    [syncActiveEntry]
  );

  const value = useMemo(
    () => ({
      hidePending,
      showPending,
    }),
    [hidePending, showPending]
  );

  return (
    <GlobalPendingContext.Provider value={value}>
      {children}
      {activeEntry ? <CenterPendingBolt label={activeEntry.label} /> : null}
    </GlobalPendingContext.Provider>
  );
}

export function useGlobalPending() {
  return useContext(GlobalPendingContext);
}
