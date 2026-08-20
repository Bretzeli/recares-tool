import type { Metadata } from "next";
import type { ReactNode } from "react";

import { SiteNav } from "@/components/site-nav";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "ReCares — ESQ persona & user story explorer",
    template: "%s · ReCares",
  },
  description:
    "Browse ESQ personas, user stories and tags: filter, cross-reference, and see coverage statistics.",
};

/**
 * The sheets in ./data are the source of truth and are meant to be swapped out,
 * so every page re-reads them per request instead of baking them in at build
 * time. The dataset is small and the parse result is memoised on file mtime.
 */
export const dynamic = "force-dynamic";

/** Applies the stored theme before first paint so there is no flash. */
const THEME_BOOTSTRAP = `try{var t=localStorage.getItem("theme");if(t==="light"||t==="dark"){document.documentElement.setAttribute("data-theme",t)}}catch(e){}`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP }} />
      </head>
      <body className="min-h-screen">
        <SiteNav />
        <main className="mx-auto max-w-6xl px-5 py-8">{children}</main>
        <footer className="mx-auto max-w-6xl px-5 pb-10 text-xs text-muted">
          Parsed from the Google Sheets exports in <code>./data</code>. Edit those files and
          reload — nothing here is hard-coded.
        </footer>
      </body>
    </html>
  );
}
