"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { useDataset } from "./dataset-provider";
import { ThemeToggle } from "./theme-toggle";

const LINKS = [
  { href: "/", label: "Overview" },
  { href: "/personas", label: "Personas" },
  { href: "/user-stories", label: "User stories" },
  { href: "/tags", label: "Tags" },
  { href: "/stats", label: "Statistics" },
  { href: "/data-health", label: "Files & data health" },
];

export function SiteNav() {
  const pathname = usePathname();
  const { status, dataset } = useDataset();

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-plane/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-5 py-3">
        <Link href="/" className="text-sm font-semibold tracking-tight text-ink">
          ReCares<span className="text-muted"> · ESQ backlog</span>
        </Link>

        <nav className="flex flex-wrap items-center gap-1">
          {LINKS.map((link) => {
            const active =
              link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`rounded-md px-2.5 py-1.5 text-sm transition-colors ${
                  active
                    ? "bg-raised font-medium text-ink"
                    : "text-ink2 hover:bg-raised hover:text-ink"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {status === "ready" && dataset && (
            <Link
              href="/data-health"
              className="rounded-md border border-line px-2.5 py-1.5 text-xs text-ink2 hover:border-rule hover:text-ink"
              title="Manage the loaded sheet files"
            >
              <span className="tabular-nums">{dataset.userStories.length}</span> stories loaded
            </Link>
          )}
          {status === "empty" && (
            <Link
              href="/"
              className="rounded-md border border-warn/40 bg-warn/10 px-2.5 py-1.5 text-xs text-ink"
            >
              <span aria-hidden>⚠ </span>No sheets loaded
            </Link>
          )}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
