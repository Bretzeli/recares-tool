"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

import { DatasetPending } from "@/components/dataset-gate";
import { useDataset } from "@/components/dataset-provider";
import {
  Badge,
  BarList,
  Breadcrumb,
  Card,
  Empty,
  PageHeader,
  StatTile,
  type BarDatum,
} from "@/components/ui";
import { UserStoryCard } from "@/components/user-story-card";
import { buildLookups } from "@/lib/lookups";
import { findTagBySlug, tagHref } from "@/lib/slug";

export default function TagPage() {
  const { dataset } = useDataset();
  const routeParams = useParams<{ id: string }>();

  if (!dataset) return <DatasetPending />;

  const slug = routeParams?.id ?? "";
  const tag = findTagBySlug(dataset.tags, slug);

  if (!tag) {
    return (
      <>
        <Breadcrumb items={[{ label: "Tags", href: "/tags" }, { label: slug }]} />
        <PageHeader
          title="Tag not found"
          lead={`No tag matching "${slug}" exists in the sheets currently loaded.`}
        />
        <Link href="/tags" className="text-sm text-ink2 underline hover:text-ink">
          Back to all tags
        </Link>
      </>
    );
  }

  const lookups = buildLookups(dataset);
  const stories = dataset.userStories.filter((story) => story.tagIds.includes(tag.id));

  // Which personas end up carrying this tag, through their stories.
  const personaUsage = new Map<number, number>();
  for (const story of stories) {
    for (const personaId of story.personaIds) {
      personaUsage.set(personaId, (personaUsage.get(personaId) ?? 0) + 1);
    }
  }
  const personaBars: BarDatum[] = [...personaUsage.entries()]
    .map(([personaId, count]) => ({
      key: String(personaId),
      label: lookups.personaName[personaId] ?? `Persona ${personaId}`,
      value: count,
      href: `/personas/${personaId}`,
    }))
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label, "en"));

  // Tags that keep showing up alongside this one.
  const companionUsage = new Map<string, number>();
  for (const story of stories) {
    for (const other of story.tagIds) {
      if (other === tag.id) continue;
      companionUsage.set(other, (companionUsage.get(other) ?? 0) + 1);
    }
  }
  const companionBars: BarDatum[] = [...companionUsage.entries()]
    .map(([tagId, count]) => ({
      key: tagId,
      label: `${tagId} — ${lookups.tagLabel[tagId] ?? tagId}`,
      value: count,
      href: tagHref(tagId),
    }))
    .sort((a, b) => b.value - a.value || a.key.localeCompare(b.key, "en"));

  const siblings = dataset.tags.filter((t) => t.category === tag.category && t.id !== tag.id);
  const unassignedCount = stories.filter((story) => story.personaIds.length === 0).length;

  return (
    <>
      <Breadcrumb items={[{ label: "Tags", href: "/tags" }, { label: tag.id }]} />
      <PageHeader title={tag.id} lead={tag.description !== tag.id ? tag.description : undefined} />

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <Badge>{tag.category}</Badge>
        {tag.undeclared && (
          <Badge tone="warn" title="Applied to a story but absent from us_tags.html">
            Undeclared in us_tags.html
          </Badge>
        )}
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="User stories"
          value={stories.length}
          hint={`${Math.round((stories.length / Math.max(dataset.userStories.length, 1)) * 100)}% of the backlog`}
        />
        <StatTile label="Personas reached" value={personaUsage.size} />
        <StatTile label="Co-occurring tags" value={companionUsage.size} />
        <StatTile
          label="Stories with no persona"
          value={unassignedCount}
          hint={unassignedCount > 0 ? "Tagged, but nobody is mapped to them" : "All are mapped"}
        />
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <Card
          title="Personas reached through this tag"
          subtitle="Counted over the stories that carry it"
        >
          <BarList
            data={personaBars}
            emptyMessage="No persona is mapped to any story with this tag."
          />
        </Card>

        <Card title="Tags that travel with this one" subtitle="Applied to the same stories">
          <BarList data={companionBars} emptyMessage="This tag never shares a story with another." />
        </Card>
      </div>

      {siblings.length > 0 && (
        <Card title={`Other tags in ${tag.category}`} className="mb-6">
          <div className="flex flex-wrap gap-1.5">
            {siblings.map((sibling) => (
              <Badge key={sibling.id} href={tagHref(sibling.id)} title={sibling.description}>
                {sibling.id}
                <span className="text-muted tabular-nums"> · {sibling.userStoryIds.length}</span>
              </Badge>
            ))}
          </div>
        </Card>
      )}

      <div className="mb-3 flex items-baseline justify-between gap-4">
        <h2 className="text-sm font-semibold text-ink">
          User stories <span className="text-muted tabular-nums">({stories.length})</span>
        </h2>
        <Link
          href={`/user-stories?tag=${encodeURIComponent(tag.id)}`}
          className="text-xs text-ink2 underline hover:text-ink"
        >
          Open in the story explorer
        </Link>
      </div>

      {stories.length === 0 ? (
        <Empty>This tag is defined but not applied to any user story.</Empty>
      ) : (
        <div className="flex flex-col gap-3">
          {stories.map((story) => (
            <UserStoryCard key={story.id} story={story} lookups={lookups} highlightTagId={tag.id} />
          ))}
        </div>
      )}
    </>
  );
}
