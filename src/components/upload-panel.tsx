"use client";

import { useCallback, useId, useRef, useState } from "react";

import { acceptFiles, KNOWN_FILES, type SheetFiles } from "@/lib/files";

import { useDataset } from "./dataset-provider";
import { Badge, Card } from "./ui";

const STATUS_ICON = { loaded: "✓", ignored: "–", missing: "×" } as const;

/**
 * Drop zone plus a per-file checklist. Files are read and parsed in the
 * browser; nothing is uploaded to a server.
 */
export function UploadPanel({ compact = false }: { compact?: boolean }) {
  const { files, addFiles, removeFile, clear, persistFailed, savedAt } = useDataset();
  const [dragging, setDragging] = useState(false);
  const [rejected, setRejected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();

  const ingest = useCallback(
    async (list: FileList | null) => {
      if (!list || list.length === 0) return;
      setBusy(true);
      try {
        const { accepted, rejected: skipped } = await acceptFiles(Array.from(list));
        setRejected(skipped);
        if (accepted.length > 0) {
          const next: SheetFiles = {};
          for (const entry of accepted) next[entry.known.name] = entry.text;
          addFiles(next);
        }
      } finally {
        setBusy(false);
        if (inputRef.current) inputRef.current.value = "";
      }
    },
    [addFiles],
  );

  const uploadedCount = Object.keys(files).length;

  return (
    <Card
      title={compact ? "Sheet files" : undefined}
      subtitle={
        compact
          ? "Drop replacements to update, or remove a file to take it out of the dataset."
          : undefined
      }
      action={
        compact && uploadedCount > 0 ? (
          <button
            type="button"
            onClick={clear}
            className="text-xs text-ink2 underline hover:text-ink"
          >
            Remove all
          </button>
        ) : undefined
      }
    >
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          void ingest(event.dataTransfer.files);
        }}
        className={`rounded-xl border-2 border-dashed px-6 py-8 text-center transition-colors ${
          dragging ? "border-accent bg-raised" : "border-rule"
        }`}
      >
        <p className="text-sm text-ink">
          {busy ? "Reading files…" : "Drop the Google Sheets HTML exports here"}
        </p>
        <p className="mx-auto mt-1 max-w-md text-xs text-muted">
          Files are read and parsed in your browser and kept in this browser&apos;s local
          storage. Nothing is uploaded to a server.
        </p>

        <input
          ref={inputRef}
          id={inputId}
          type="file"
          multiple
          accept=".html,.htm,text/html"
          className="sr-only"
          onChange={(event) => void ingest(event.target.files)}
        />
        <label
          htmlFor={inputId}
          className="mt-4 inline-block cursor-pointer rounded-md border border-line bg-surface px-3 py-1.5 text-sm text-ink hover:border-rule"
        >
          Choose files…
        </label>
      </div>

      {persistFailed && (
        <p className="mt-3 rounded-lg border border-warn/40 bg-warn/10 px-3 py-2 text-xs text-ink">
          <span aria-hidden>⚠ </span>
          These files are loaded but could not be saved to local storage, so they will be gone
          after a reload. The browser is most likely out of storage quota.
        </p>
      )}

      {rejected.length > 0 && (
        <p className="mt-3 rounded-lg border border-warn/40 bg-warn/10 px-3 py-2 text-xs text-ink">
          <span aria-hidden>⚠ </span>
          Not recognised, so skipped: {rejected.join(", ")}. Filenames must match the list below.
        </p>
      )}

      <ul className="mt-4 flex flex-col gap-1.5">
        {KNOWN_FILES.map((known) => {
          const present = known.name in files;
          const state = present ? (known.role === "ignored" ? "ignored" : "loaded") : "missing";
          const tone =
            state === "loaded"
              ? "text-good"
              : state === "ignored"
                ? "text-muted"
                : known.required
                  ? "text-crit"
                  : "text-muted";

          return (
            <li
              key={known.name}
              className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border border-line px-3 py-2"
            >
              {/* Icon + label, never colour alone. */}
              <span className={`text-xs ${tone}`} aria-hidden>
                {STATUS_ICON[state]}
              </span>
              <code className="text-xs text-ink">{known.name}</code>

              {known.required && !present && <Badge tone="crit">Required</Badge>}
              {known.role === "ignored" && <Badge>Ignored</Badge>}
              {present && known.role !== "ignored" && <Badge tone="good">Loaded</Badge>}

              <span className="min-w-0 flex-1 text-xs text-muted">{known.description}</span>

              {present && (
                <button
                  type="button"
                  onClick={() => removeFile(known.name)}
                  className="text-xs text-ink2 underline hover:text-ink"
                >
                  Remove
                </button>
              )}
            </li>
          );
        })}
      </ul>

      {savedAt && (
        <p className="mt-3 text-xs text-muted">
          Saved locally · {uploadedCount} {uploadedCount === 1 ? "file" : "files"} held.
        </p>
      )}
    </Card>
  );
}
