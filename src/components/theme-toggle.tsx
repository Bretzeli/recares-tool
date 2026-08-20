"use client";

import { useEffect, useState } from "react";

type Mode = "light" | "dark" | "system";

const ORDER: Mode[] = ["system", "light", "dark"];
const LABEL: Record<Mode, string> = { system: "Auto", light: "Light", dark: "Dark" };

function applyMode(mode: Mode) {
  const root = document.documentElement;
  if (mode === "system") {
    root.removeAttribute("data-theme");
    localStorage.removeItem("theme");
  } else {
    root.setAttribute("data-theme", mode);
    localStorage.setItem("theme", mode);
  }
}

export function ThemeToggle() {
  const [mode, setMode] = useState<Mode>("system");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("theme");
    setMode(stored === "light" || stored === "dark" ? stored : "system");
    setReady(true);
  }, []);

  function cycle() {
    const next = ORDER[(ORDER.indexOf(mode) + 1) % ORDER.length];
    setMode(next);
    applyMode(next);
  }

  return (
    <button
      type="button"
      onClick={cycle}
      className="rounded-md border border-line px-2.5 py-1.5 text-xs text-ink2 transition-colors hover:border-rule hover:text-ink"
      // Avoid a hydration mismatch: the label is only meaningful once the
      // stored preference has been read on the client.
      suppressHydrationWarning
    >
      Theme: {ready ? LABEL[mode] : LABEL.system}
    </button>
  );
}
