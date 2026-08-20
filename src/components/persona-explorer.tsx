"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import type { Persona, UserStory } from "@/lib/types";

import { FilterBar, SearchInput, SegmentedControl, SortSelect } from "./filters";
import { Badge, Empty } from "./ui";

type Coverage = "all" | "assigned" | "unassigned";
type Sort = "stories-desc" | "stories-asc" | "name" | "id";

export function PersonaExplorer({
  personas,
  userStories,
  initialCoverage = "all",
}: {
  personas: Persona[];
  userStories: UserStory[];
  initialCoverage?: Coverage;
}) {
  const [q, setQ] = useState("");
  const [coverage, setCoverage] = useState<Coverage>(initialCoverage);
  const [sort, setSort] = useState<Sort>("stories-desc");

  const storyText = useMemo(() => {
    const map: Record<number, string> = {};
    for (const story of userStories) map[story.id] = story.text;
    return map;
  }, [userStories]);

  const maxStories = Math.max(1, ...personas.map((p) => p.userStoryIds.length));

  const results = useMemo(() => {
    const needle = q.trim().toLowerCase();

    const filtered = personas.filter((persona) => {
      if (coverage === "assigned" && persona.userStoryIds.length === 0) return false;
      if (coverage === "unassigned" && persona.userStoryIds.length > 0) return false;
      if (needle === "") return true;
      const haystack = [persona.name, `persona ${persona.id}`, ...persona.userStoryIds.map((id) => storyText[id] ?? "")]
        .join(" ")
        .toLowerCase();
      return haystack.includes(needle);
    });

    const sorters: Record<Sort, (a: Persona, b: Persona) => number> = {
      "stories-desc": (a, b) => b.userStoryIds.length - a.userStoryIds.length || a.id - b.id,
      "stories-asc": (a, b) => a.userStoryIds.length - b.userStoryIds.length || a.id - b.id,
      name: (a, b) => a.name.localeCompare(b.name, "en"),
      id: (a, b) => a.id - b.id,
    };

    return [...filtered].sort(sorters[sort]);
  }, [personas, q, coverage, sort, storyText]);

  return (
    <div>
      <FilterBar>
        <SearchInput
          value={q}
          onChange={setQ}
          placeholder="Search personas, or the text of their stories…"
        />
        <SegmentedControl<Coverage>
          ariaLabel="Story coverage"
          value={coverage}
          onChange={setCoverage}
          options={[
            { value: "all", label: "All" },
            { value: "assigned", label: "Has stories" },
            { value: "unassigned", label: "Unassigned" },
          ]}
        />
        <SortSelect<Sort>
          value={sort}
          onChange={setSort}
          options={[
            { value: "stories-desc", label: "Most stories" },
            { value: "stories-asc", label: "Fewest stories" },
            { value: "name", label: "Name" },
            { value: "id", label: "Persona ID" },
          ]}
        />
      </FilterBar>

      <p className="mb-3 text-xs text-muted">
        Showing <span className="font-medium text-ink2 tabular-nums">{results.length}</span> of{" "}
        <span className="tabular-nums">{personas.length}</span> personas
      </p>

      {results.length === 0 ? (
        <Empty>No persona matches these filters.</Empty>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {results.map((persona) => {
            const count = persona.userStoryIds.length;
            return (
              <Link
                key={persona.id}
                href={`/personas/${persona.id}`}
                className="rounded-xl border border-line bg-surface p-4 transition-colors hover:border-rule"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <h2 className="text-sm font-semibold text-ink">{persona.name}</h2>
                  <span className="text-xs text-muted tabular-nums">#{persona.id}</span>
                </div>

                <div className="mt-3 flex items-center gap-3">
                  <div className="h-2 flex-1 rounded-sm bg-track">
                    <div
                      className="h-2 bg-accent"
                      style={{
                        width: `${(count / maxStories) * 100}%`,
                        borderRadius: "0 4px 4px 0",
                      }}
                    />
                  </div>
                  <span className="text-sm font-medium text-ink2 tabular-nums">{count}</span>
                </div>

                <p className="mt-2 text-xs text-muted">
                  {count === 0 ? (
                    <Badge tone="warn">No stories mapped</Badge>
                  ) : (
                    <>
                      {count} user {count === 1 ? "story" : "stories"} ·{" "}
                      {Math.round((count / userStories.length) * 100)}% of the backlog
                    </>
                  )}
                </p>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
