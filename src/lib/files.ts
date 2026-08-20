/**
 * The fixed set of filenames the app understands, and the reading of uploaded
 * files into text. Nothing is bundled with the app — every sheet arrives from
 * the user.
 */

export type FileRole = "personas" | "userStories" | "mapping" | "tags" | "ignored";

export interface KnownFile {
  /** Canonical filename, used as the key everywhere else. */
  name: string;
  role: FileRole;
  label: string;
  description: string;
  /** Without this one there is no backlog to show. */
  required: boolean;
}

export const KNOWN_FILES: KnownFile[] = [
  {
    name: "us_sheet.html",
    role: "userStories",
    label: "User stories",
    description: "Story text, original wording, category, priority and tags.",
    required: true,
  },
  {
    name: "persona_sheet.html",
    role: "personas",
    label: "Personas",
    description: "Persona ids and names.",
    required: false,
  },
  {
    name: "us_persona_mapping.html",
    role: "mapping",
    label: "Story to persona mapping",
    description: "Which personas asked for which story.",
    required: false,
  },
  {
    name: "us_tags.html",
    role: "tags",
    label: "Tag definitions",
    description: "Tag ids, descriptions and their categories.",
    required: false,
  },
  {
    name: "persona_us_mapping.html",
    role: "ignored",
    label: "Persona to story mapping",
    description: "Ignored — redundant transpose of us_persona_mapping.html.",
    required: false,
  },
  {
    name: "pivot_table.html",
    role: "ignored",
    label: "Pivot table",
    description: "Ignored — blank sheet, nothing to import.",
    required: false,
  },
];

export const REQUIRED_FILES = KNOWN_FILES.filter((file) => file.required);

/** Canonical name -> raw file text. */
export type SheetFiles = Record<string, string>;

/**
 * Reduce a filename to a comparable key, so "US_Sheet (1).html",
 * "us-sheet.html" and "us_sheet.html" all land on the same entry.
 */
function normalizeName(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? name;
  return base
    .toLowerCase()
    .replace(/\.x?html?$/, "")
    .replace(/\s*\(\d+\)\s*$/, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

const BY_NORMALIZED = new Map(KNOWN_FILES.map((file) => [normalizeName(file.name), file]));

/** The known file an upload corresponds to, or null if the name is unfamiliar. */
export function matchKnownFile(fileName: string): KnownFile | null {
  return BY_NORMALIZED.get(normalizeName(fileName)) ?? null;
}

/**
 * Read an uploaded file as text. Sheets exports are usually UTF-8 but are
 * sometimes saved as CP1252, which would decode to replacement characters —
 * so try strict UTF-8 first and fall back rather than corrupting the text.
 */
export async function readFileText(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(buffer);
  } catch {
    return new TextDecoder("windows-1252").decode(buffer);
  }
}

export interface AcceptedFile {
  known: KnownFile;
  text: string;
}

export interface AcceptResult {
  accepted: AcceptedFile[];
  /** Names that matched none of the known files. */
  rejected: string[];
}

/** Read a FileList, keeping the ones whose names we recognise. */
export async function acceptFiles(files: File[]): Promise<AcceptResult> {
  const accepted: AcceptedFile[] = [];
  const rejected: string[] = [];

  for (const file of files) {
    const known = matchKnownFile(file.name);
    if (!known) {
      rejected.push(file.name);
      continue;
    }
    accepted.push({ known, text: await readFileText(file) });
  }

  return { accepted, rejected };
}

export function hasRequiredFiles(files: SheetFiles): boolean {
  return REQUIRED_FILES.every((file) => typeof files[file.name] === "string");
}
