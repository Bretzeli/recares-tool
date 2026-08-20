import fs from "node:fs";
import path from "node:path";

import { cellAt, parseId, parseSheet, type SheetTable } from "./sheet";
import {
  PRIORITY_ORDER,
  type Dataset,
  type DataIssue,
  type Persona,
  type Priority,
  type SourceFile,
  type Tag,
  type UserStory,
} from "./types";

/**
 * Server-only. Reads the Sheets exports from ./data and assembles the object
 * graph the UI browses. Parsing never throws on bad data: anything suspicious
 * becomes a `DataIssue` that the /data-health page renders.
 */

const DATA_DIR = process.env.RECARES_DATA_DIR
  ? path.resolve(process.env.RECARES_DATA_DIR)
  : path.join(process.cwd(), "data");

/** Fixed filenames, per the brief. */
const FILES = {
  personas: "persona_sheet.html",
  userStories: "us_sheet.html",
  mapping: "us_persona_mapping.html",
  tags: "us_tags.html",
} as const;

/**
 * Deliberately not read. `persona_us_mapping.html` is the persona-major
 * transpose of `us_persona_mapping.html` (and is empty apart from its header),
 * and `pivot_table.html` is a blank sheet.
 */
const IGNORED_FILES: Array<{ file: string; note: string }> = [
  {
    file: "persona_us_mapping.html",
    note: "Redundant — persona→story is derived from us_persona_mapping.html.",
  },
  { file: "pivot_table.html", note: "Blank sheet, no data to import." },
];

// Column layout of each sheet. Tags run from tag_1 rightwards with no fixed end
// (us_sheet declares tag_1..tag_5 but story 9 spills into two further columns).
const US_COL = { id: 0, text: 1, original: 2, category: 3, priority: 4, firstTag: 5 } as const;
const PERSONA_COL = { id: 0, name: 1 } as const;
const TAG_COL = { id: 0, description: 1, category: 2 } as const;
const MAPPING_COL = { storyId: 0, storyText: 1, firstPersona: 2 } as const;

interface LoadedFile {
  table: SheetTable;
  source: SourceFile;
}

function loadFile(fileName: string): LoadedFile {
  const filePath = path.join(DATA_DIR, fileName);
  if (!fs.existsSync(filePath)) {
    return { table: { header: [], rows: [] }, source: { file: fileName, status: "missing", rows: 0 } };
  }
  const table = parseSheet(fs.readFileSync(filePath, "utf8"));
  return {
    table,
    source: {
      file: fileName,
      status: table.rows.length > 0 ? "loaded" : "empty",
      rows: table.rows.length,
    },
  };
}

function normalizePriority(raw: string, storyId: number, issues: DataIssue[]): Priority {
  const value = raw.trim().toLowerCase();
  if (value === "") return "n/a";
  if ((PRIORITY_ORDER as string[]).includes(value)) return value as Priority;
  issues.push({
    severity: "warning",
    message: `User story ${storyId} has unrecognized priority "${raw}" — treated as n/a.`,
  });
  return "n/a";
}

function buildDataset(): Dataset {
  const issues: DataIssue[] = [];
  const sources: SourceFile[] = [];

  const personaFile = loadFile(FILES.personas);
  const storyFile = loadFile(FILES.userStories);
  const mappingFile = loadFile(FILES.mapping);
  const tagFile = loadFile(FILES.tags);
  sources.push(personaFile.source, storyFile.source, mappingFile.source, tagFile.source);

  for (const { file, note } of IGNORED_FILES) {
    const exists = fs.existsSync(path.join(DATA_DIR, file));
    sources.push({ file, status: "ignored", rows: 0, note: exists ? note : `${note} (not present)` });
  }

  for (const source of sources) {
    if (source.status === "missing") {
      issues.push({ severity: "warning", message: `${source.file} was not found in ${DATA_DIR}.` });
    }
  }

  // ---- Personas -----------------------------------------------------------
  const personas = new Map<number, Persona>();
  for (const row of personaFile.table.rows) {
    const id = parseId(cellAt(row, PERSONA_COL.id));
    const name = cellAt(row, PERSONA_COL.name);
    if (id === null) continue;
    if (personas.has(id)) {
      issues.push({ severity: "warning", message: `Duplicate persona id ${id} in ${FILES.personas}.` });
      continue;
    }
    personas.set(id, { id, name: name || `Persona ${id}`, userStoryIds: [] });
  }

  // ---- Tag definitions ----------------------------------------------------
  const tags = new Map<string, Tag>();
  for (const row of tagFile.table.rows) {
    const id = cellAt(row, TAG_COL.id);
    if (id === "") continue;
    const description = cellAt(row, TAG_COL.description) || id;
    const category = cellAt(row, TAG_COL.category).replace(/\s+/g, " ").trim();
    if (tags.has(id)) {
      issues.push({ severity: "warning", message: `Duplicate tag id "${id}" in ${FILES.tags}.` });
      continue;
    }
    tags.set(id, {
      id,
      description,
      category: category || "Uncategorized",
      undeclared: false,
      userStoryIds: [],
    });
  }

  // ---- User stories -------------------------------------------------------
  const stories = new Map<number, UserStory>();
  const categories: string[] = [];
  for (const row of storyFile.table.rows) {
    const id = parseId(cellAt(row, US_COL.id));
    if (id === null) continue;
    if (stories.has(id)) {
      issues.push({ severity: "warning", message: `Duplicate user story id ${id} in ${FILES.userStories}.` });
      continue;
    }

    const category = cellAt(row, US_COL.category).replace(/\s+/g, " ").trim() || "Uncategorized";
    if (!categories.includes(category)) categories.push(category);

    const tagIds: string[] = [];
    for (let col = US_COL.firstTag; col < row.length; col++) {
      const tagId = cellAt(row, col);
      if (tagId === "" || tagIds.includes(tagId)) continue;
      tagIds.push(tagId);

      let tag = tags.get(tagId);
      if (!tag) {
        tag = { id: tagId, description: tagId, category: "Uncategorized", undeclared: true, userStoryIds: [] };
        tags.set(tagId, tag);
        issues.push({
          severity: "warning",
          message: `Tag "${tagId}" is used by user story ${id} but not defined in ${FILES.tags}.`,
        });
      }
      tag.userStoryIds.push(id);
    }

    stories.set(id, {
      id,
      text: cellAt(row, US_COL.text).replace(/\s+/g, " ").trim(),
      originalText: cellAt(row, US_COL.original).replace(/\s+/g, " ").trim(),
      category,
      priority: normalizePriority(cellAt(row, US_COL.priority), id, issues),
      tagIds,
      personaIds: [],
    });
  }

  // ---- Story → persona mapping -------------------------------------------
  for (const row of mappingFile.table.rows) {
    const storyId = parseId(cellAt(row, MAPPING_COL.storyId));
    if (storyId === null) continue;

    const story = stories.get(storyId);
    if (!story) {
      issues.push({
        severity: "warning",
        message: `${FILES.mapping} maps persona(s) to user story ${storyId}, which is absent from ${FILES.userStories}.`,
      });
      continue;
    }

    // Cells run as (persona_id, persona_name) pairs from column C rightwards.
    for (let col = MAPPING_COL.firstPersona; col < row.length; col += 2) {
      const personaId = parseId(cellAt(row, col));
      if (personaId === null) continue;

      const persona = personas.get(personaId);
      if (!persona) {
        issues.push({
          severity: "warning",
          message: `User story ${storyId} references persona ${personaId}, which is absent from ${FILES.personas}.`,
        });
        continue;
      }

      const mappedName = cellAt(row, col + 1);
      if (mappedName && mappedName !== persona.name) {
        issues.push({
          severity: "info",
          message: `Persona ${personaId} is "${persona.name}" in ${FILES.personas} but "${mappedName}" on user story ${storyId}.`,
        });
      }

      if (!story.personaIds.includes(personaId)) story.personaIds.push(personaId);
      if (!persona.userStoryIds.includes(storyId)) persona.userStoryIds.push(storyId);
    }
  }

  for (const tag of tags.values()) {
    if (tag.userStoryIds.length === 0) {
      issues.push({
        severity: "info",
        message: `Tag "${tag.id}" (${tag.description}) is defined but not applied to any user story.`,
      });
    }
  }

  const userStories = [...stories.values()].sort((a, b) => a.id - b.id);
  const priorities = PRIORITY_ORDER.filter((p) => userStories.some((s) => s.priority === p));

  return {
    personas: [...personas.values()].sort((a, b) => a.id - b.id),
    userStories,
    tags: [...tags.values()].sort((a, b) => a.id.localeCompare(b.id, "en")),
    categories: categories.sort((a, b) => a.localeCompare(b, "en")),
    priorities,
    issues,
    sources,
  };
}

/**
 * Signature of the input files, so `npm run dev` picks up edits to ./data
 * without a restart while production still parses only once.
 */
function dataSignature(): string {
  return Object.values(FILES)
    .map((file) => {
      try {
        const stat = fs.statSync(path.join(DATA_DIR, file));
        return `${file}:${stat.mtimeMs}:${stat.size}`;
      } catch {
        return `${file}:missing`;
      }
    })
    .join("|");
}

let cached: { signature: string; dataset: Dataset } | null = null;

export function getDataset(): Dataset {
  const signature = dataSignature();
  if (cached?.signature !== signature) {
    cached = { signature, dataset: buildDataset() };
  }
  return cached.dataset;
}

export { DATA_DIR };
