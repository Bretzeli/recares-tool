import Link from "next/link";
import type { ReactNode } from "react";

import type { Lookups } from "@/lib/lookups";
import { tagHref } from "@/lib/slug";
import type { UserStory } from "@/lib/types";

import { Badge, PriorityBadge } from "./ui";

export type { Lookups };

/**
 * One user story, with its personas and tags as links. No hooks, so it renders
 * in both the server pages and the client explorer.
 */
export function UserStoryCard({
  story,
  lookups,
  highlightPersonaId,
  highlightTagId,
}: {
  story: UserStory;
  lookups: Lookups;
  highlightPersonaId?: number;
  highlightTagId?: string;
}) {
  return (
    <article className="rounded-xl border border-line bg-surface p-4">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <Link
          href={`/user-stories/${story.id}`}
          className="text-xs font-semibold text-muted tabular-nums hover:text-ink"
        >
          US-{story.id}
        </Link>
        <PriorityBadge priority={story.priority} />
        <Link
          href={`/user-stories?category=${encodeURIComponent(story.category)}`}
          className="text-xs text-muted hover:text-ink hover:underline"
        >
          {story.category}
        </Link>
      </div>

      <Link href={`/user-stories/${story.id}`} className="mt-2 block text-sm text-ink hover:underline">
        {story.text}
      </Link>

      <div className="mt-3 flex flex-col gap-2">
        <Row label="Personas">
          {story.personaIds.length === 0 ? (
            <Badge tone="warn" title="No persona is mapped to this user story">
              Unassigned
            </Badge>
          ) : (
            story.personaIds.map((id) => (
              <Badge
                key={id}
                href={`/personas/${id}`}
                tone={id === highlightPersonaId ? "accent" : "neutral"}
              >
                {lookups.personaName[id] ?? `Persona ${id}`}
              </Badge>
            ))
          )}
        </Row>

        <Row label="Tags">
          {story.tagIds.length === 0 ? (
            <Badge tone="warn" title="No tag is applied to this user story">
              Untagged
            </Badge>
          ) : (
            story.tagIds.map((id) => (
              <Badge
                key={id}
                href={tagHref(id)}
                tone={id === highlightTagId ? "accent" : "neutral"}
                title={lookups.tagLabel[id] ?? id}
              >
                {id}
              </Badge>
            ))
          )}
        </Row>
      </div>
    </article>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="w-16 shrink-0 text-xs text-muted">{label}</span>
      {children}
    </div>
  );
}
