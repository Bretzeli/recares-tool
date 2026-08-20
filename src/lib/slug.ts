import type { Tag } from "./types";

/**
 * Tag ids are free text and several contain a slash ("Content/Structure",
 * "Policies/Procedures"), which a dynamic `[id]` segment would read as a path
 * separator. Route on a slug instead and resolve back to the tag by comparison.
 */
export function tagSlug(id: string): string {
  return id
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function tagHref(id: string): string {
  return `/tags/${tagSlug(id)}`;
}

export function findTagBySlug(tags: Tag[], slug: string): Tag | undefined {
  const target = slug.toLowerCase();
  return tags.find((tag) => tagSlug(tag.id) === target);
}
