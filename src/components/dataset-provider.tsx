"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { buildDataset } from "@/lib/dataset";
import { hasRequiredFiles, type SheetFiles } from "@/lib/files";
import { clearStoredSheets, loadStoredSheets, saveStoredSheets } from "@/lib/storage";
import type { Dataset } from "@/lib/types";

interface DatasetContextValue {
  /** "loading" until localStorage has been read on the client. */
  status: "loading" | "empty" | "ready";
  dataset: Dataset | null;
  files: SheetFiles;
  savedAt: string;
  /** True when a save was attempted but rejected, e.g. storage quota. */
  persistFailed: boolean;
  /** Merge newly uploaded files over whatever is already held. */
  addFiles: (files: SheetFiles) => void;
  removeFile: (name: string) => void;
  clear: () => void;
}

const DatasetContext = createContext<DatasetContextValue | null>(null);

export function DatasetProvider({ children }: { children: ReactNode }) {
  const [files, setFiles] = useState<SheetFiles>({});
  const [savedAt, setSavedAt] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const [persistFailed, setPersistFailed] = useState(false);

  // localStorage is only readable on the client, so the first paint is always
  // "loading" — that also keeps server and client markup identical.
  useEffect(() => {
    const stored = loadStoredSheets();
    if (stored) {
      setFiles(stored.files);
      setSavedAt(stored.savedAt);
    }
    setHydrated(true);
  }, []);

  const persist = useCallback((next: SheetFiles) => {
    setFiles(next);

    if (Object.keys(next).length === 0) {
      clearStoredSheets();
      setSavedAt("");
      setPersistFailed(false);
      return;
    }

    const saved = saveStoredSheets(next);
    setPersistFailed(!saved);
    setSavedAt(saved ? new Date().toISOString() : "");
  }, []);

  const addFiles = useCallback(
    (incoming: SheetFiles) => persist({ ...files, ...incoming }),
    [files, persist],
  );

  const removeFile = useCallback(
    (name: string) => {
      const next = { ...files };
      delete next[name];
      persist(next);
    },
    [files, persist],
  );

  const clear = useCallback(() => persist({}), [persist]);

  // Re-parsing is cheap for sheets of this size and keeps the raw files as the
  // single source of truth.
  const dataset = useMemo(
    () => (hasRequiredFiles(files) ? buildDataset(files) : null),
    [files],
  );

  const value = useMemo<DatasetContextValue>(
    () => ({
      status: !hydrated ? "loading" : dataset ? "ready" : "empty",
      dataset,
      files,
      savedAt,
      persistFailed,
      addFiles,
      removeFile,
      clear,
    }),
    [hydrated, dataset, files, savedAt, persistFailed, addFiles, removeFile, clear],
  );

  return <DatasetContext.Provider value={value}>{children}</DatasetContext.Provider>;
}

export function useDataset(): DatasetContextValue {
  const context = useContext(DatasetContext);
  if (!context) throw new Error("useDataset must be used inside <DatasetProvider>");
  return context;
}
