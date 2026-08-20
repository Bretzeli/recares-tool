"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo } from "react";

import { DatasetPending } from "@/components/dataset-gate";
import { useDataset } from "@/components/dataset-provider";
import {
  BarList,
  Breadcrumb,
  Card,
  Empty,
  Meter,
  PageHeader,
  StatTile,
  type BarDatum,
} from "@/components/ui";
import { UserStoryCard } from "@/components/user-story-card";
import { buildLookups } from "@/lib/lookups";
import { tagHref } from "@/lib/slug";
import { computeStats } from "@/lib/stats";
import { PRIORITY_ORDER } from "@/lib/types";

export default function PersonaPage() {
  const { dataset } = useDataset();
  const routeParams = useParams<{ id: string }>();
  const stats = useMemo(() => (dataset ? computeStats(dataset) : null), [dataset]);

  if (!dataset || !stats) return <DatasetPending />;

  const id = routeParams?.id ?? "";
  const persona = dataset.personas.find((p) => String(p.id) === id);

  if (!persona) {
    return (
      <>
        <Breadcrumb items={[{ label: "Personas", href: "/personas" }, { label: id }]} />
        <PageHeader
          title="Persona not found"
          lead={`No persona with id ${id} exists in the sheets currently loaded.`}
        />
        <Link href="/personas" className="text-sm text-ink2 underline hover:text-ink">
          Back to all personas
        </Link>
      </>
    );
  }

  const lookups = buildLookups(dataset);
  const stories = dataset.userStories.filter((story) => story.personaIds.includes(persona.id));
  const rank = stats.personaCounts.findIndex((entry) => entry.item.id === persona.id) + 1;

  // Tag usage across this persona's stories only.
  const tagUsage = new Map<string, number>();
  for (const story of stories) {
    for (const tagId of story.tagIds) tagUsage.set(tagId, (tagUsage.get(tagId) ?? 0) + 1);
  }
  const tagBars: BarDatum[] = [...tagUsage.entries()]
    .map(([tagId, count]) => ({
      key: tagId,
      label: `${tagId} — ${lookups.tagLabel[tagId] ?? tagId}`,
      value: count,
      href: tagHref(tagId),
    }))
    .sort((a, b) => b.value - a.value || a.key.localeCompare(b.key, "en"));

  const categoryUsage = new Map<string, number>();
  for (const story of stories) {
    categoryUsage.set(story.category, (categoryUsage.get(story.category) ?? 0) + 1);
  }
  const categoryBars: BarDatum[] = [...categoryUsage.entries()]
    .map(([category, count]) => ({
      key: category,
      label: category,
      value: count,
      href: `/user-stories?persona=${persona.id}&category=${encodeURIComponent(category)}`,
    }))
    .sort((a, b) => b.value - a.value || a.key.localeCompare(b.key, "en"));

  const priorityBars: BarDatum[] = PRIORITY_ORDER.map((priority) => ({
    key: priority,
    label: priority === "n/a" ? "Not set" : priority,
    value: stories.filter((story) => story.priority === priority).length,
  })).filter((entry) => entry.value > 0);

  const overlaps: BarDatum[] = stats.personaOverlap
    .filter((pair) => pair.a.id === persona.id || pair.b.id === persona.id)
    .map((pair) => {
      const other = pair.a.id === persona.id ? pair.b : pair.a;
      return {
        key: String(other.id),
        label: other.name,
        value: pair.shared,
        href: `/personas/${other.id}`,
        meta: `${Math.round(pair.similarity * 100)}% of their combined stories`,
      };
    });

  const soleOwner = stories.filter((story) => story.personaIds.length === 1);

  return (
    <>
      <Breadcrumb items={[{ label: "Personas", href: "/personas" }, { label: persona.name }]} />
      <PageHeader
        title={persona.name}
        lead={`Persona #${persona.id} · ranked ${rank} of ${dataset.personas.length} by number of user stories.`}
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="User stories"
          value={stories.length}
          hint={`${Math.round((stories.length / Math.max(dataset.userStories.length, 1)) * 100)}% of the backlog`}
        />
        <StatTile
          label="Unique to this persona"
          value={soleOwner.length}
          hint="No other persona asked for these"
        />
        <StatTile label="Distinct tags pulled in" value={tagUsage.size} />
        <StatTile label="Categories touched" value={categoryUsage.size} />
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        <Card title="Share of the backlog">
          <Meter
            value={stories.length}
            total={dataset.userStories.length}
            label="Stories mapped to this persona"
          />
          <div className="mt-4">
            <BarList data={priorityBars} emptyMessage="No stories, so no priorities." />
          </div>
        </Card>

        <Card title="Categories" subtitle="Which parts of the backlog this persona lands in">
          <BarList data={categoryBars} emptyMessage="No categories to show." />
        </Card>

        <Card title="Overlap with other personas" subtitle="Stories shared, strongest first">
          <BarList
            data={overlaps}
            emptyMessage="This persona shares no story with another persona."
          />
        </Card>
      </div>

      <Card
        title="Tags across these stories"
        subtitle="How often each tag appears on this persona's stories"
        className="mb-6"
      >
        <BarList data={tagBars} emptyMessage="None of these stories carry a tag." />
      </Card>

      <div className="mb-3 flex items-baseline justify-between gap-4">
        <h2 className="text-sm font-semibold text-ink">
          User stories <span className="text-muted tabular-nums">({stories.length})</span>
        </h2>
        <Link
          href={`/user-stories?persona=${persona.id}`}
          className="text-xs text-ink2 underline hover:text-ink"
        >
          Open in the story explorer
        </Link>
      </div>

      {stories.length === 0 ? (
        <Empty>No user story is mapped to this persona.</Empty>
      ) : (
        <div className="flex flex-col gap-3">
          {stories.map((story) => (
            <UserStoryCard
              key={story.id}
              story={story}
              lookups={lookups}
              highlightPersonaId={persona.id}
            />
          ))}
        </div>
      )}
    </>
  );
}
