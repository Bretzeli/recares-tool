import { KNOWN_FILES, type SheetFiles } from "./files";
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
 * Turns the uploaded sheets into the object graph the UI browses. Pure: give it
 * the same files and it gives back the same dataset, with no I/O of its own.
 *
 * Parsing never throws on bad data. Anything suspicious — a row pointing at a
 * persona that does not exist, a tag used but never defined, a duplicate id —
 * becomes a `DataIssue` the Data health page renders, and the import continues.
 */

const FILES = {
  personas: "persona_sheet.html",
  userStories: "us_sheet.html",
  mapping: "us_persona_mapping.html",
  tags: "us_tags.html",
} as const;

// Column layout of each sheet. Tags run from tag_1 rightwards with no fixed end
// (us_sheet declares tag_1..tag_5 but a story can spill into further columns).
const US_COL = { id: 0, text: 1, original: 2, category: 3, priority: 4, firstTag: 5 } as const;
const PERSONA_COL = { id: 0, name: 1 } as const;
const TAG_COL = { id: 0, description: 1, category: 2 } as const;
// Column B of the mapping sheet repeats the story text; we take text from
// us_sheet.html instead, so only the id and the persona pairs are read here.
const MAPPING_COL = { storyId: 0, firstPersona: 2 } as const;

const EMPTY_TABLE: SheetTable = { header: [], rows: [] };

function tableFor(files: SheetFiles, name: string): SheetTable {
  const raw = files[name];
  return typeof raw === "string" ? parseSheet(raw) : EMPTY_TABLE;
}

function normalizePriority(raw: string, storyId: number, issues: DataIssue[]): Priority {
  const value = raw.trim().toLowerCase();
  if (value === "") return "n/a";
  if ((PRIORITY_ORDER as string[]).includes(value)) return value as Priority;
  issues.push({
    severity: "warning",
    message: `User story ${storyId} has unrecognized priority "${raw}" - treated as n/a.`,
  });
  return "n/a";
}

function describeSources(files: SheetFiles, tables: Record<string, SheetTable>): SourceFile[] {
  return KNOWN_FILES.map((known) => {
    if (known.role === "ignored") {
      return {
        file: known.name,
        status: "ignored" as const,
        rows: 0,
        note:
          known.name in files
            ? `${known.description} Uploaded, but not read.`
            : known.description,
      };
    }
    if (!(known.name in files)) {
      return { file: known.name, status: "missing" as const, rows: 0, note: known.description };
    }
    const rows = tables[known.name]?.rows.length ?? 0;
    return {
      file: known.name,
      status: rows > 0 ? ("loaded" as const) : ("empty" as const),
      rows,
      note: known.description,
    };
  });
}

export function buildDataset(files: SheetFiles): Dataset {
  const issues: DataIssue[] = [];

  const tables: Record<string, SheetTable> = {
    [FILES.personas]: tableFor(files, FILES.personas),
    [FILES.userStories]: tableFor(files, FILES.userStories),
    [FILES.mapping]: tableFor(files, FILES.mapping),
    [FILES.tags]: tableFor(files, FILES.tags),
  };
  const sources = describeSources(files, tables);

  for (const source of sources) {
    if (source.status === "missing") {
      issues.push({
        severity: "warning",
        message: `${source.file} was not uploaded, so anything it would contribute is absent.`,
      });
    }
  }

  // ---- Personas -----------------------------------------------------------
  const personas = new Map<number, Persona>();
  for (const row of tables[FILES.personas].rows) {
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
  for (const row of tables[FILES.tags].rows) {
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
  for (const row of tables[FILES.userStories].rows) {
    const id = parseId(cellAt(row, US_COL.id));
    if (id === null) continue;
    if (stories.has(id)) {
      issues.push({
        severity: "warning",
        message: `Duplicate user story id ${id} in ${FILES.userStories}.`,
      });
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
        tag = {
          id: tagId,
          description: tagId,
          category: "Uncategorized",
          undeclared: true,
          userStoryIds: [],
        };
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

  // ---- Story to persona mapping ------------------------------------------
  for (const row of tables[FILES.mapping].rows) {
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
