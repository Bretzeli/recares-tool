import type { Dataset } from "./types";

export interface Lookups {
  personaName: Record<number, string>;
  tagLabel: Record<string, string>;
}

/** Flat id→label maps so cards can render links without re-scanning arrays. */
export function buildLookups(data: Dataset): Lookups {
  const personaName: Record<number, string> = {};
  for (const persona of data.personas) personaName[persona.id] = persona.name;

  const tagLabel: Record<string, string> = {};
  for (const tag of data.tags) tagLabel[tag.id] = tag.description;

  return { personaName, tagLabel };
}
