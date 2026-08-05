"use client";

import { Search, X } from "lucide-react";
import { useRef } from "react";

type ModuleSearchInputProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  ariaLabel?: string;
  clearLabel?: string;
  disabled?: boolean;
  className?: string;
};

export default function ModuleSearchInput({
  value,
  onChange,
  placeholder,
  ariaLabel,
  clearLabel = "Clear",
  disabled = false,
  className = "",
}: ModuleSearchInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const hasValue = value.length > 0;

  function clear() {
    onChange("");
    inputRef.current?.focus();
  }

  return (
    <div className={`relative min-w-0 ${className}`}>
      <Search
        size={16}
        aria-hidden="true"
        className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-on-surface-variant"
      />
      <input
        ref={inputRef}
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape" && value.length > 0) {
            event.preventDefault();
            clear();
          }
        }}
        placeholder={placeholder}
        aria-label={ariaLabel ?? placeholder}
        disabled={disabled}
        className="w-full min-w-0 rounded-lg border border-outline-variant bg-surface py-2 ps-9 pe-10 text-[14px] leading-[20px] text-on-surface focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 [&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-decoration]:appearance-none"
      />
      {hasValue ? (
        <button
          type="button"
          onClick={clear}
          disabled={disabled}
          aria-label={`${clearLabel}: ${ariaLabel ?? placeholder}`}
          className="absolute end-2 top-1/2 inline-flex -translate-y-1/2 rounded p-1 text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40"
        >
          <X size={15} aria-hidden="true" />
        </button>
      ) : null}
    </div>
  );
}
