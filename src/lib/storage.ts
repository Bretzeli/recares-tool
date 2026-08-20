import { KNOWN_FILES, type SheetFiles } from "./files";

/**
 * The uploaded sheets are kept in localStorage so a reload does not lose them.
 * The raw file text is stored rather than the parsed dataset, so parser fixes
 * apply retroactively and Data health always reflects the real input.
 *
 * Nothing is ever sent anywhere: parsing happens in the browser and this is the
 * only place the files come to rest.
 */

const STORAGE_KEY = "recares.sheets.v1";

export interface StoredSheets {
  files: SheetFiles;
  savedAt: string;
}

const KNOWN_NAMES = new Set(KNOWN_FILES.map((file) => file.name));

export function loadStoredSheets(): StoredSheets | null {
  if (typeof localStorage === "undefined") return null;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return null;

    const { files, savedAt } = parsed as Partial<StoredSheets>;
    if (typeof files !== "object" || files === null) return null;

    // Drop anything that is not a known filename with string contents, so a
    // hand-edited or stale entry cannot break the parse.
    const clean: SheetFiles = {};
    for (const [name, text] of Object.entries(files)) {
      if (KNOWN_NAMES.has(name) && typeof text === "string") clean[name] = text;
    }
    if (Object.keys(clean).length === 0) return null;

    return { files: clean, savedAt: typeof savedAt === "string" ? savedAt : "" };
  } catch {
    return null;
  }
}

/** Returns false when the write failed, which in practice means quota. */
export function saveStoredSheets(files: SheetFiles): boolean {
  if (typeof localStorage === "undefined") return false;
  try {
    const payload: StoredSheets = { files, savedAt: new Date().toISOString() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    return true;
  } catch {
    return false;
  }
}

export function clearStoredSheets(): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing useful to do — the caller clears its own state regardless.
  }
}
