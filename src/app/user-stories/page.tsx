"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useMemo } from "react";

import { DatasetPending } from "@/components/dataset-gate";
import { useDataset } from "@/components/dataset-provider";
import { PageHeader } from "@/components/ui";
import { UserStoryExplorer, type InitialFilters } from "@/components/user-story-explorer";
import { buildLookups } from "@/lib/lookups";
import { PRIORITY_ORDER, type Priority } from "@/lib/types";

/** Accepts `?tag=A&tag=B` and `?tag=A,B` alike. */
function list(params: URLSearchParams, key: string): string[] {
  return params
    .getAll(key)
    .flatMap((entry) => entry.split(","))
    .map((entry) => entry.trim())
    .filter((entry) => entry !== "");
}

function UserStoriesView() {
  const { dataset } = useDataset();
  const params = useSearchParams();

  const lookups = useMemo(() => (dataset ? buildLookups(dataset) : null), [dataset]);

  const initial = useMemo<InitialFilters | null>(() => {
    if (!dataset) return null;
    const assignment = params.get("assignment");
    return {
      q: params.get("q") ?? "",
      personaIds: list(params, "persona")
        .map((value) => Number.parseInt(value, 10))
        .filter((value) => Number.isInteger(value)),
      tagIds: list(params, "tag").filter((id) => dataset.tags.some((tag) => tag.id === id)),
      categories: list(params, "category").filter((c) => dataset.categories.includes(c)),
      priorities: list(params, "priority").filter((p): p is Priority =>
        (PRIORITY_ORDER as string[]).includes(p),
      ),
      assignment:
        assignment === "assigned" || assignment === "unassigned" ? assignment : "all",
    };
  }, [dataset, params]);

  if (!dataset || !lookups || !initial) return <DatasetPending />;

  return (
    <>
      <PageHeader
        title="User stories"
        lead="Every story from us_sheet.html, cross-referenced with the personas that asked for it and the tags it carries. Filters stack; links from persona and tag pages arrive here pre-filtered."
      />
      <UserStoryExplorer
        // Remount when the deep-linked filters change, so arriving from a
        // persona or tag page always applies that page's filter.
        key={params.toString()}
        userStories={dataset.userStories}
        personas={dataset.personas}
        tags={dataset.tags}
        categories={dataset.categories}
        priorities={dataset.priorities}
        lookups={lookups}
        initial={initial}
      />
    </>
  );
}

export default function UserStoriesPage() {
  return (
    <Suspense fallback={<div className="py-16 text-center text-sm text-muted">Loading…</div>}>
      <UserStoriesView />
    </Suspense>
  );
}
