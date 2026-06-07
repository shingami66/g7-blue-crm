import { ReactNode } from "react";

export default function FilterBar({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-wrap gap-3 items-center p-4 bg-surface-container-lowest border border-surface-variant rounded-t-xl border-b-0">
      {children}
    </div>
  );
}
