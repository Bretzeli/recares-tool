"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

import { DatasetPending } from "@/components/dataset-gate";
import { useDataset } from "@/components/dataset-provider";
import { TagExplorer } from "@/components/tag-explorer";
import { PageHeader } from "@/components/ui";

function TagsView() {
  const { dataset } = useDataset();
  const params = useSearchParams();

  if (!dataset) return <DatasetPending />;

  const raw = params.get("usage");
  const initialUsage = raw === "used" || raw === "unused" ? raw : "all";

  return (
    <>
      <PageHeader
        title="Tags"
        lead="Tag definitions from us_tags.html, counted by how many user stories carry them. Tags used on a story but never defined in the sheet are flagged as undeclared."
      />
      <TagExplorer
        key={params.toString()}
        tags={dataset.tags}
        totalStories={dataset.userStories.length}
        initialUsage={initialUsage}
      />
    </>
  );
}

export default function TagsPage() {
  return (
    <Suspense fallback={<div className="py-16 text-center text-sm text-muted">Loading…</div>}>
      <TagsView />
    </Suspense>
  );
}
