import type { Metadata } from "next";
import type { ReactNode } from "react";

import { DatasetProvider } from "@/components/dataset-provider";
import { SiteNav } from "@/components/site-nav";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "ReCares — ESQ persona & user story explorer",
    template: "%s · ReCares",
  },
  description:
    "Upload the ESQ sheet exports and browse personas, user stories and tags: filter, cross-reference, and see coverage statistics.",
};

/** Applies the stored theme before first paint so there is no flash. */
const THEME_BOOTSTRAP = `try{var t=localStorage.getItem("theme");if(t==="light"||t==="dark"){document.documentElement.setAttribute("data-theme",t)}}catch(e){}`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen">
        {/*
          First element in <body> so the stored theme is applied before any of
          the themed markup below it paints. App Router discourages a manual
          <head>, so the script lives here rather than there.
        */}
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP }} />
        <DatasetProvider>
          <SiteNav />
          <main className="mx-auto max-w-6xl px-5 py-8">{children}</main>
          <footer className="mx-auto max-w-6xl px-5 pb-10 text-xs text-muted">
            Built entirely from the sheet files you upload. They are parsed in your browser and
            kept in this browser&apos;s local storage — nothing is sent to a server.
          </footer>
        </DatasetProvider>
      </body>
    </html>
  );
}
