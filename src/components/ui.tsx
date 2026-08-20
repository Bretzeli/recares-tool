import Link from "next/link";
import type { ReactNode } from "react";

import type { Priority } from "@/lib/types";

export function Card({
  title,
  subtitle,
  action,
  children,
  className = "",
}: {
  title?: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-xl border border-line bg-surface p-5 ${className}`}
    >
      {(title || action) && (
        <header className="mb-4 flex items-start justify-between gap-4">
          <div>
            {title && <h2 className="text-sm font-semibold text-ink">{title}</h2>}
            {subtitle && <p className="mt-0.5 text-xs text-muted">{subtitle}</p>}
          </div>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

/** Label + value. The number is the chart — no one-bar bar chart. */
export function StatTile({
  label,
  value,
  hint,
  href,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  href?: string;
}) {
  const body = (
    <>
      <div className="text-xs text-ink2">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-ink">{value}</div>
      {hint && <div className="mt-1 text-xs text-muted">{hint}</div>}
    </>
  );
  const className =
    "block rounded-xl border border-line bg-surface p-4 transition-colors";
  return href ? (
    <Link href={href} className={`${className} hover:border-rule`}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}

/** The single number the dashboard leads with. Exactly one per view. */
export function HeroFigure({
  value,
  label,
  detail,
}: {
  value: ReactNode;
  label: string;
  detail?: ReactNode;
}) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-muted">{label}</div>
      <div className="mt-1 text-5xl font-semibold leading-none text-ink">{value}</div>
      {detail && <div className="mt-2 text-sm text-ink2">{detail}</div>}
    </div>
  );
}

export interface BarDatum {
  key: string;
  label: string;
  value: number;
  href?: string;
  meta?: string;
}

/**
 * Ranked horizontal bars, one series, one hue. Bar is 8px thick with a 4px
 * rounded data-end and a square baseline at the left; the value is direct-
 * labelled at the tip, so no value is reachable only through a tooltip.
 */
export function BarList({
  data,
  emptyMessage = "Nothing to show.",
  max,
  valueSuffix,
}: {
  data: BarDatum[];
  emptyMessage?: string;
  max?: number;
  valueSuffix?: string;
}) {
  if (data.length === 0) return <Empty>{emptyMessage}</Empty>;
  const ceiling = Math.max(max ?? 0, ...data.map((d) => d.value), 1);

  return (
    <ul className="flex flex-col gap-2.5">
      {data.map((d) => {
        const pct = (d.value / ceiling) * 100;
        return (
          <li key={d.key} className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-3">
            <div className="min-w-0 truncate text-sm text-ink" title={d.label}>
              {d.href ? (
                <Link href={d.href} className="hover:underline">
                  {d.label}
                </Link>
              ) : (
                d.label
              )}
            </div>
            <div className="text-sm font-medium tabular-nums text-ink2">
              {d.value}
              {valueSuffix}
            </div>
            <div className="col-span-2 mt-1">
              <div className="h-2 w-full rounded-sm bg-track">
                <div
                  className="h-2 bg-accent"
                  style={{
                    width: `${Math.max(pct, d.value > 0 ? 1.5 : 0)}%`,
                    borderRadius: "0 4px 4px 0",
                  }}
                />
              </div>
              {d.meta && <div className="mt-1 text-xs text-muted">{d.meta}</div>}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/** A single ratio against a limit: fill on a lighter track of the same ramp. */
export function Meter({ value, total, label }: { value: number; total: number; label: string }) {
  const pct = total === 0 ? 0 : (value / total) * 100;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-xs text-ink2">{label}</span>
        <span className="text-xs font-medium tabular-nums text-ink2">
          {value} / {total} ({Math.round(pct)}%)
        </span>
      </div>
      <div className="mt-1.5 h-2 w-full rounded-sm bg-track">
        <div
          className="h-2 bg-accent"
          style={{ width: `${pct}%`, borderRadius: "0 4px 4px 0" }}
        />
      </div>
    </div>
  );
}

export function Badge({
  children,
  href,
  tone = "neutral",
  title,
}: {
  children: ReactNode;
  href?: string;
  tone?: "neutral" | "accent" | "warn" | "crit" | "good";
  title?: string;
}) {
  const tones: Record<string, string> = {
    neutral: "border-line bg-raised text-ink2",
    accent: "border-line bg-raised text-ink",
    warn: "border-warn/40 bg-warn/10 text-ink",
    crit: "border-crit/40 bg-crit/10 text-ink",
    good: "border-good/40 bg-good/10 text-ink",
  };
  const className = `inline-flex max-w-full items-center gap-1 truncate rounded-md border px-2 py-0.5 text-xs ${tones[tone]}`;
  return href ? (
    <Link href={href} className={`${className} hover:border-rule`} title={title}>
      {children}
    </Link>
  ) : (
    <span className={className} title={title}>
      {children}
    </span>
  );
}

const PRIORITY_LABEL: Record<Priority, string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
  "n/a": "Not set",
};

export function PriorityBadge({ priority }: { priority: Priority }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-ink2">
      <span
        aria-hidden
        className="inline-block h-2 w-2 rounded-full"
        style={{
          background: priority === "n/a" ? "var(--muted)" : "var(--accent)",
          opacity: priority === "high" ? 1 : priority === "medium" ? 0.55 : 0.35,
        }}
      />
      {PRIORITY_LABEL[priority]}
    </span>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-lg border border-dashed border-rule px-4 py-6 text-center text-sm text-muted">
      {children}
    </p>
  );
}

export function PageHeader({
  title,
  lead,
  children,
}: {
  title: string;
  lead?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <header className="mb-6">
      <h1 className="text-2xl font-semibold tracking-tight text-ink">{title}</h1>
      {lead && <p className="mt-1 max-w-2xl text-sm text-ink2">{lead}</p>}
      {children}
    </header>
  );
}

export function Breadcrumb({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav className="mb-3 flex flex-wrap items-center gap-1.5 text-xs text-muted">
      {items.map((item, i) => (
        <span key={`${item.label}-${i}`} className="flex items-center gap-1.5">
          {i > 0 && <span aria-hidden>/</span>}
          {item.href ? (
            <Link href={item.href} className="hover:text-ink2 hover:underline">
              {item.label}
            </Link>
          ) : (
            <span className="text-ink2">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
