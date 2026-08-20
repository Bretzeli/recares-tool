"use client";

import { useEffect, useRef, type ReactNode } from "react";

export interface Option {
  value: string;
  label: string;
  /** Rendered right-aligned; usually a usage count. */
  count?: number;
  /** Optional grouping header inside the menu. */
  group?: string;
}

/**
 * A checkbox dropdown built on <details>, so it works without a popover
 * library and stays keyboard-operable. Closes on outside click and Escape.
 */
export function FilterMenu({
  label,
  options,
  selected,
  onChange,
  emptyLabel = "No options",
  width = "18rem",
}: {
  label: string;
  options: Option[];
  selected: string[];
  onChange: (next: string[]) => void;
  emptyLabel?: string;
  width?: string;
}) {
  const ref = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    function close(event: MouseEvent) {
      const el = ref.current;
      if (el?.open && event.target instanceof Node && !el.contains(event.target)) {
        el.open = false;
      }
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape" && ref.current?.open) ref.current.open = false;
    }
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  function toggle(value: string) {
    onChange(
      selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value],
    );
  }

  let lastGroup: string | undefined;

  return (
    <details ref={ref} className="relative">
      <summary
        className={`flex cursor-pointer list-none items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-sm transition-colors [&::-webkit-details-marker]:hidden ${
          selected.length > 0
            ? "border-rule bg-raised text-ink"
            : "border-line text-ink2 hover:border-rule hover:text-ink"
        }`}
      >
        {label}
        {selected.length > 0 && (
          <span className="rounded bg-accent px-1.5 text-xs font-medium text-white tabular-nums">
            {selected.length}
          </span>
        )}
        <span aria-hidden className="text-muted">
          ▾
        </span>
      </summary>

      <div
        className="absolute left-0 z-30 mt-1.5 max-h-80 overflow-y-auto rounded-lg border border-rule bg-surface p-1.5 shadow-lg"
        style={{ width }}
      >
        {options.length === 0 && <p className="px-2 py-2 text-xs text-muted">{emptyLabel}</p>}

        {options.map((option) => {
          const header = option.group && option.group !== lastGroup ? option.group : null;
          lastGroup = option.group;
          return (
            <div key={option.value}>
              {header && (
                <p className="mt-2 mb-1 px-2 text-xs font-medium text-muted first:mt-0">
                  {header}
                </p>
              )}
              <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm text-ink hover:bg-raised">
                <input
                  type="checkbox"
                  checked={selected.includes(option.value)}
                  onChange={() => toggle(option.value)}
                  className="h-3.5 w-3.5 shrink-0 accent-[var(--accent)]"
                />
                <span className="min-w-0 flex-1 truncate" title={option.label}>
                  {option.label}
                </span>
                {option.count !== undefined && (
                  <span className="shrink-0 text-xs text-muted tabular-nums">{option.count}</span>
                )}
              </label>
            </div>
          );
        })}

        {selected.length > 0 && (
          <button
            type="button"
            onClick={() => onChange([])}
            className="mt-1 w-full border-t border-line px-2 pt-2 pb-1 text-left text-xs text-ink2 hover:text-ink"
          >
            Clear {label.toLowerCase()}
          </button>
        )}
      </div>
    </details>
  );
}

export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
}: {
  value: T;
  onChange: (next: T) => void;
  options: { value: T; label: string }[];
  ariaLabel: string;
}) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className="flex items-center rounded-md border border-line p-0.5"
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          aria-pressed={value === option.value}
          className={`rounded px-2 py-1 text-xs transition-colors ${
            value === option.value
              ? "bg-raised font-medium text-ink"
              : "text-ink2 hover:text-ink"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function SearchInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (next: string) => void;
  placeholder: string;
}) {
  return (
    <div className="relative min-w-56 flex-1">
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-md border border-line bg-surface px-3 py-1.5 text-sm text-ink placeholder:text-muted focus:border-rule"
      />
    </div>
  );
}

export function SortSelect<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (next: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <label className="flex items-center gap-1.5 text-xs text-muted">
      Sort
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as T)}
        className="rounded-md border border-line bg-surface px-2 py-1.5 text-sm text-ink"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function FilterBar({ children }: { children: ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-line bg-surface p-3">
      {children}
    </div>
  );
}

export function ActiveChips({
  chips,
  onClearAll,
}: {
  chips: { key: string; label: string; onRemove: () => void }[];
  onClearAll: () => void;
}) {
  if (chips.length === 0) return null;
  return (
    <div className="mb-4 flex flex-wrap items-center gap-1.5">
      {chips.map((chip) => (
        <button
          key={chip.key}
          type="button"
          onClick={chip.onRemove}
          className="inline-flex items-center gap-1.5 rounded-md border border-line bg-raised px-2 py-0.5 text-xs text-ink2 hover:border-rule hover:text-ink"
        >
          {chip.label}
          <span aria-hidden>×</span>
          <span className="sr-only">Remove filter</span>
        </button>
      ))}
      <button
        type="button"
        onClick={onClearAll}
        className="px-1 text-xs text-muted underline hover:text-ink"
      >
        Clear all
      </button>
    </div>
  );
}
