"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { tagHref } from "@/lib/slug";
import type { Tag } from "@/lib/types";

import { FilterBar, FilterMenu, SearchInput, SegmentedControl, SortSelect } from "./filters";
import { Badge, Empty } from "./ui";

type Usage = "all" | "used" | "unused";
type Sort = "usage-desc" | "usage-asc" | "id" | "category";

export function TagExplorer({
  tags,
  totalStories,
  initialUsage = "all",
}: {
  tags: Tag[];
  totalStories: number;
  initialUsage?: Usage;
}) {
  const [q, setQ] = useState("");
  const [usage, setUsage] = useState<Usage>(initialUsage);
  const [categoryFilter, setCategoryFilter] = useState<string[]>([]);
  const [sort, setSort] = useState<Sort>("usage-desc");

  const categoryOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const tag of tags) counts.set(tag.category, (counts.get(tag.category) ?? 0) + 1);
    return [...counts.entries()]
      .sort((a, b) => a[0].localeCompare(b[0], "en"))
      .map(([value, count]) => ({ value, label: value, count }));
  }, [tags]);

  const maxUsage = Math.max(1, ...tags.map((t) => t.userStoryIds.length));

  const results = useMemo(() => {
    const needle = q.trim().toLowerCase();

    const filtered = tags.filter((tag) => {
      if (usage === "used" && tag.userStoryIds.length === 0) return false;
      if (usage === "unused" && tag.userStoryIds.length > 0) return false;
      if (categoryFilter.length > 0 && !categoryFilter.includes(tag.category)) return false;
      if (needle === "") return true;
      return `${tag.id} ${tag.description} ${tag.category}`.toLowerCase().includes(needle);
    });

    const sorters: Record<Sort, (a: Tag, b: Tag) => number> = {
      "usage-desc": (a, b) =>
        b.userStoryIds.length - a.userStoryIds.length || a.id.localeCompare(b.id, "en"),
      "usage-asc": (a, b) =>
        a.userStoryIds.length - b.userStoryIds.length || a.id.localeCompare(b.id, "en"),
      id: (a, b) => a.id.localeCompare(b.id, "en"),
      category: (a, b) =>
        a.category.localeCompare(b.category, "en") || a.id.localeCompare(b.id, "en"),
    };

    return [...filtered].sort(sorters[sort]);
  }, [tags, q, usage, categoryFilter, sort]);

  return (
    <div>
      <FilterBar>
        <SearchInput value={q} onChange={setQ} placeholder="Search tag id, description, category…" />
        <FilterMenu
          label="Tag category"
          options={categoryOptions}
          selected={categoryFilter}
          onChange={setCategoryFilter}
          width="24rem"
        />
        <SegmentedControl<Usage>
          ariaLabel="Tag usage"
          value={usage}
          onChange={setUsage}
          options={[
            { value: "all", label: "All" },
            { value: "used", label: "In use" },
            { value: "unused", label: "Unused" },
          ]}
        />
        <SortSelect<Sort>
          value={sort}
          onChange={setSort}
          options={[
            { value: "usage-desc", label: "Most used" },
            { value: "usage-asc", label: "Least used" },
            { value: "id", label: "Tag id" },
            { value: "category", label: "Category" },
          ]}
        />
      </FilterBar>

      <p className="mb-3 text-xs text-muted">
        Showing <span className="font-medium text-ink2 tabular-nums">{results.length}</span> of{" "}
        <span className="tabular-nums">{tags.length}</span> tags
      </p>

      {results.length === 0 ? (
        <Empty>No tag matches these filters.</Empty>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {results.map((tag) => {
            const count = tag.userStoryIds.length;
            return (
              <Link
                key={tag.id}
                href={tagHref(tag.id)}
                className="rounded-xl border border-line bg-surface p-4 transition-colors hover:border-rule"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="text-sm font-semibold text-ink">{tag.id}</h2>
                  {tag.undeclared && (
                    <Badge tone="warn" title="Used on a story but missing from us_tags.html">
                      Undeclared
                    </Badge>
                  )}
                </div>

                {tag.description !== tag.id && (
                  <p className="mt-1 text-xs text-ink2">{tag.description}</p>
                )}
                <p className="mt-0.5 text-xs text-muted">{tag.category}</p>

                <div className="mt-3 flex items-center gap-3">
                  <div className="h-2 flex-1 rounded-sm bg-track">
                    <div
                      className="h-2 bg-accent"
                      style={{
                        width: `${(count / maxUsage) * 100}%`,
                        borderRadius: "0 4px 4px 0",
                      }}
                    />
                  </div>
                  <span className="text-sm font-medium text-ink2 tabular-nums">{count}</span>
                </div>

                <p className="mt-2 text-xs text-muted">
                  {count === 0 ? (
                    <Badge tone="warn">Never applied</Badge>
                  ) : (
                    <>
                      on {count} of {totalStories} stories
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
