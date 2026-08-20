import type { Dataset, Persona, Priority, Tag, UserStory } from "./types";

export interface Counted<T> {
  item: T;
  count: number;
}

export interface PersonaPair {
  a: Persona;
  b: Persona;
  shared: number;
  /** Jaccard overlap of their story sets, 0–1. */
  similarity: number;
}

export interface Stats {
  totals: {
    personas: number;
    userStories: number;
    tags: number;
    links: number;
    tagApplications: number;
  };
  /** Stories per persona, most first. */
  personaCounts: Counted<Persona>[];
  personaMax: Counted<Persona>[];
  personaMin: Counted<Persona>[];
  personaAverage: number;
  personaMedian: number;
  /** Stories ranked by how many personas want them. */
  storiesByReach: Counted<UserStory>[];
  /** Tags ranked by how many stories carry them. */
  tagCounts: Counted<Tag>[];
  categoryCounts: Counted<string>[];
  priorityCounts: Counted<Priority>[];
  tagCategoryCounts: Counted<string>[];
  coverage: {
    unassignedStories: UserStory[];
    unassignedPersonas: Persona[];
    untaggedStories: UserStory[];
    unusedTags: Tag[];
    assignedStoryShare: number;
  };
  /** Persona pairs sharing at least one story, strongest overlap first. */
  personaOverlap: PersonaPair[];
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

/** All entries tied at the extreme value, so "max" is never arbitrary. */
function extremes<T>(counted: Counted<T>[], pick: "max" | "min"): Counted<T>[] {
  if (counted.length === 0) return [];
  const values = counted.map((c) => c.count);
  const target = pick === "max" ? Math.max(...values) : Math.min(...values);
  return counted.filter((c) => c.count === target);
}

function tally<K>(keys: K[]): Map<K, number> {
  const counts = new Map<K, number>();
  for (const key of keys) counts.set(key, (counts.get(key) ?? 0) + 1);
  return counts;
}

export function computeStats(data: Dataset): Stats {
  const { personas, userStories, tags } = data;

  const personaCounts: Counted<Persona>[] = personas
    .map((persona) => ({ item: persona, count: persona.userStoryIds.length }))
    .sort((a, b) => b.count - a.count || a.item.name.localeCompare(b.item.name, "en"));

  const storiesByReach: Counted<UserStory>[] = userStories
    .map((story) => ({ item: story, count: story.personaIds.length }))
    .sort((a, b) => b.count - a.count || a.item.id - b.item.id);

  const tagCounts: Counted<Tag>[] = tags
    .map((tag) => ({ item: tag, count: tag.userStoryIds.length }))
    .sort((a, b) => b.count - a.count || a.item.id.localeCompare(b.item.id, "en"));

  const categoryCounts: Counted<string>[] = [...tally(userStories.map((s) => s.category))]
    .map(([item, count]) => ({ item, count }))
    .sort((a, b) => b.count - a.count || a.item.localeCompare(b.item, "en"));

  const priorityCounts: Counted<Priority>[] = data.priorities
    .map((priority) => ({
      item: priority,
      count: userStories.filter((s) => s.priority === priority).length,
    }))
    .filter((entry) => entry.count > 0);

  // A tag category's weight is the number of story-to-tag links it accounts for.
  const tagCategoryLinks: string[] = [];
  for (const tag of tags) {
    for (const _storyId of tag.userStoryIds) tagCategoryLinks.push(tag.category);
  }
  const tagCategoryCounts: Counted<string>[] = [...tally(tagCategoryLinks)]
    .map(([item, count]) => ({ item, count }))
    .sort((a, b) => b.count - a.count || a.item.localeCompare(b.item, "en"));

  const unassignedStories = userStories.filter((s) => s.personaIds.length === 0);
  const untaggedStories = userStories.filter((s) => s.tagIds.length === 0);

  const personaOverlap: PersonaPair[] = [];
  for (let i = 0; i < personas.length; i++) {
    for (let j = i + 1; j < personas.length; j++) {
      const a = personas[i];
      const b = personas[j];
      const setB = new Set(b.userStoryIds);
      const shared = a.userStoryIds.filter((id) => setB.has(id)).length;
      if (shared === 0) continue;
      const union = new Set([...a.userStoryIds, ...b.userStoryIds]).size;
      personaOverlap.push({ a, b, shared, similarity: union === 0 ? 0 : shared / union });
    }
  }
  personaOverlap.sort((x, y) => y.shared - x.shared || y.similarity - x.similarity);

  const counts = personaCounts.map((c) => c.count);
  const links = personas.reduce((sum, p) => sum + p.userStoryIds.length, 0);
  const tagApplications = userStories.reduce((sum, s) => sum + s.tagIds.length, 0);

  return {
    totals: {
      personas: personas.length,
      userStories: userStories.length,
      tags: tags.length,
      links,
      tagApplications,
    },
    personaCounts,
    personaMax: extremes(personaCounts, "max"),
    personaMin: extremes(personaCounts, "min"),
    personaAverage: personas.length === 0 ? 0 : links / personas.length,
    personaMedian: median(counts),
    storiesByReach,
    tagCounts,
    categoryCounts,
    priorityCounts,
    tagCategoryCounts,
    coverage: {
      unassignedStories,
      unassignedPersonas: personas.filter((p) => p.userStoryIds.length === 0),
      untaggedStories,
      unusedTags: tags.filter((t) => t.userStoryIds.length === 0),
      assignedStoryShare:
        userStories.length === 0
          ? 0
          : (userStories.length - unassignedStories.length) / userStories.length,
    },
    personaOverlap,
  };
}
