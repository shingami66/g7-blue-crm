"use client";

import { RotateCcw, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { sanitizeSearchTerm } from "@/lib/search/sanitize";
import ModuleSearchInput from "./ModuleSearchInput";

export interface ModuleSearchModeOption {
  value: string;
  label: string;
  placeholder: string;
}

interface ModuleSearchControlProps {
  mode: string | undefined;
  modes: readonly ModuleSearchModeOption[];
  query: string;
  modeLabel: string;
  selectModeLabel?: string;
  disabledPlaceholder?: string;
  resetLabel?: string;
  submitLabel?: string;
  pendingLabel?: string;
  clearLabel?: string;
  showModeSelect?: boolean;
  isPending?: boolean;
  isSearchPending?: boolean;
  onSubmit?: (mode: string, query: string) => void;
  onModeChange?: (mode: string) => void;
  onQueryChange?: (query: string) => void;
  onReset?: () => void;
  className?: string;
}

export default function ModuleSearchControl({
  mode,
  modes,
  query,
  modeLabel,
  selectModeLabel = "Select",
  disabledPlaceholder = "Select a search type first",
  resetLabel,
  submitLabel = "Search",
  pendingLabel = "Searching…",
  clearLabel = "Clear",
  showModeSelect = true,
  isPending = false,
  isSearchPending = false,
  onSubmit,
  onModeChange,
  onQueryChange,
  onReset,
  className = "",
}: ModuleSearchControlProps) {
  const modeValuesKey = modes.map((option) => option.value).join("\u0000");
  const [draftMode, setDraftMode] = useState(() =>
    mode && modeValuesKey.split("\u0000").includes(mode) ? mode : "",
  );
  const [draftQuery, setDraftQuery] = useState(query);

  useEffect(() => {
    const timer = setTimeout(
      () => setDraftMode(mode && modeValuesKey.split("\u0000").includes(mode) ? mode : ""),
      0,
    );
    return () => clearTimeout(timer);
  }, [mode, modeValuesKey]);
  useEffect(() => {
    const timer = setTimeout(() => setDraftQuery(query), 0);
    return () => clearTimeout(timer);
  }, [query]);

  const activeMode = modes.find((option) => option.value === draftMode);
  const normalizedDraftQuery = sanitizeSearchTerm(draftQuery);
  const actionLabel = isSearchPending ? pendingLabel : submitLabel;
  const inputDisabled = isPending || !activeMode;
  const submitDisabled = isPending || !activeMode || !normalizedDraftQuery;

  function handleModeChange(nextMode: string) {
    setDraftMode(nextMode);
    setDraftQuery("");
    onModeChange?.(nextMode);
    onQueryChange?.("");
  }

  function handleQueryChange(nextQuery: string) {
    setDraftQuery(nextQuery);
    onQueryChange?.(nextQuery);
  }

  return (
    <form
      className={`flex min-w-0 flex-1 flex-wrap items-center gap-2 ${className}`}
      aria-busy={isSearchPending || undefined}
      onSubmit={(event) => {
        event.preventDefault();
        if (!submitDisabled) onSubmit?.(draftMode, normalizedDraftQuery);
      }}
    >
      {showModeSelect ? (
        <>
          <label className="sr-only" htmlFor="module-search-mode">
            {modeLabel}
          </label>
          <select
            id="module-search-mode"
            value={activeMode?.value ?? ""}
            onChange={(event) => handleModeChange(event.target.value)}
            aria-label={modeLabel}
            disabled={isPending}
            className="min-w-[9.5rem] rounded-lg border border-outline-variant bg-surface px-3 py-2 text-[14px] leading-[20px] text-on-surface focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
          >
            <option value="">{selectModeLabel}</option>
            {modes.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </>
      ) : null}
      <ModuleSearchInput
        value={draftQuery}
        onChange={handleQueryChange}
        placeholder={activeMode?.placeholder ?? disabledPlaceholder}
        ariaLabel={activeMode?.placeholder ?? disabledPlaceholder}
        clearLabel={clearLabel}
        disabled={inputDisabled}
        className="w-full min-w-[12rem] sm:flex-1"
      />
      <button
        type="submit"
        disabled={submitDisabled}
        aria-busy={isSearchPending || undefined}
        aria-label={actionLabel}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-[13px] font-semibold text-on-primary transition-colors hover:bg-primary-container focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Search size={14} aria-hidden="true" />
        <span className={isSearchPending ? "" : "hidden sm:inline"}>{actionLabel}</span>
      </button>
      {resetLabel && onReset ? (
        <button
          type="button"
          onClick={() => {
            setDraftMode("");
            setDraftQuery("");
            onReset();
          }}
          disabled={isPending}
          aria-label={resetLabel}
          title={resetLabel}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-outline-variant bg-surface px-3 py-2 text-[13px] font-semibold text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-60"
        >
          <RotateCcw size={14} aria-hidden="true" />
          <span className="hidden sm:inline">{resetLabel}</span>
        </button>
      ) : null}
    </form>
  );
}
