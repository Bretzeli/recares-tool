import Link from "next/link";

import { getDataset } from "@/lib/data";
import { tagHref } from "@/lib/slug";
import { computeStats } from "@/lib/stats";
import {
  BarList,
  Card,
  Empty,
  PageHeader,
  StatTile,
  type BarDatum,
} from "@/components/ui";

export const metadata = { title: "Statistics" };

export default function StatsPage() {
  const data = getDataset();
  const stats = computeStats(data);

  const personaBars: BarDatum[] = stats.personaCounts.map((entry) => ({
    key: String(entry.item.id),
    label: entry.item.name,
    value: entry.count,
    href: `/personas/${entry.item.id}`,
  }));

  // How many stories are wanted by 0 personas, by 1, by 2, …
  const reachBuckets = new Map<number, number>();
  for (const story of data.userStories) {
    const n = story.personaIds.length;
    reachBuckets.set(n, (reachBuckets.get(n) ?? 0) + 1);
  }
  const reachHistogram: BarDatum[] = [...reachBuckets.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([personaCount, storyCount]) => ({
      key: String(personaCount),
      label:
        personaCount === 0
          ? "No persona"
          : `${personaCount} persona${personaCount === 1 ? "" : "s"}`,
      value: storyCount,
      href:
        personaCount === 0 ? "/user-stories?assignment=unassigned" : undefined,
    }));

  const categoryBars: BarDatum[] = stats.categoryCounts.map((entry) => ({
    key: entry.item,
    label: entry.item,
    value: entry.count,
    href: `/user-stories?category=${encodeURIComponent(entry.item)}`,
  }));

  const priorityBars: BarDatum[] = stats.priorityCounts.map((entry) => ({
    key: entry.item,
    label: entry.item === "n/a" ? "Not set" : entry.item,
    value: entry.count,
    href: `/user-stories?priority=${encodeURIComponent(entry.item)}`,
  }));

  const tagBars: BarDatum[] = stats.tagCounts.map((entry) => ({
    key: entry.item.id,
    label: `${entry.item.id}${entry.item.description === entry.item.id ? "" : ` — ${entry.item.description}`}`,
    value: entry.count,
    href: tagHref(entry.item.id),
  }));

  const tagCategoryBars: BarDatum[] = stats.tagCategoryCounts.map((entry) => ({
    key: entry.item,
    label: entry.item,
    value: entry.count,
  }));

  const overlapBars: BarDatum[] = stats.personaOverlap.slice(0, 10).map((pair) => ({
    key: `${pair.a.id}-${pair.b.id}`,
    label: `${pair.a.name} ↔ ${pair.b.name}`,
    value: pair.shared,
    meta: `${Math.round(pair.similarity * 100)}% of their combined stories`,
  }));

  return (
    <>
      <PageHeader
        title="Statistics"
        lead="Distribution and coverage across the whole backlog. Every chart is a single measure on one axis; the tables underneath carry the same numbers."
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Personas" value={stats.totals.personas} href="/personas" />
        <StatTile label="User stories" value={stats.totals.userStories} href="/user-stories" />
        <StatTile label="Tags" value={stats.totals.tags} href="/tags" />
        <StatTile
          label="Story ↔ persona links"
          value={stats.totals.links}
          hint={`${stats.totals.tagApplications} tag applications`}
        />
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Mean stories per persona"
          value={stats.personaAverage.toFixed(1)}
          hint={`median ${stats.personaMedian}`}
        />
        <StatTile
          label="Maximum"
          value={stats.personaMax[0]?.count ?? 0}
          hint={stats.personaMax.map((e) => e.item.name).join(", ") || "—"}
        />
        <StatTile
          label="Minimum"
          value={stats.personaMin[0]?.count ?? 0}
          hint={stats.personaMin.map((e) => e.item.name).join(", ") || "—"}
        />
        <StatTile
          label="Mean personas per story"
          value={(stats.totals.links / Math.max(stats.totals.userStories, 1)).toFixed(2)}
          hint={`${stats.coverage.unassignedStories.length} stories at zero`}
        />
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <Card title="User stories per persona" subtitle="Most first">
          <BarList data={personaBars} emptyMessage="No personas loaded." />
        </Card>

        <Card
          title="How many personas want a story"
          subtitle="Story counts grouped by persona reach"
        >
          <BarList data={reachHistogram} emptyMessage="No user stories loaded." />
        </Card>

        <Card title="Stories per category" subtitle="user_story_category from us_sheet.html">
          <BarList data={categoryBars} emptyMessage="No categories found." />
        </Card>

        <Card title="Stories per priority">
          <BarList data={priorityBars} emptyMessage="No priorities found." />
        </Card>

        <Card title="Tag usage" subtitle="Stories carrying each tag">
          <BarList data={tagBars} emptyMessage="No tags found." />
        </Card>

        <Card
          title="Tag applications by tag category"
          subtitle="Weight of each category across all story↔tag links"
        >
          <BarList data={tagCategoryBars} emptyMessage="No tag categories found." />
        </Card>
      </div>

      <Card
        title="Persona overlap"
        subtitle="Pairs sharing the most user stories"
        className="mb-6"
      >
        <BarList
          data={overlapBars}
          emptyMessage="No two personas share a user story."
        />
      </Card>

      <Card
        title="Shared stories, persona by persona"
        subtitle="Diagonal is each persona's own total"
        className="mb-6"
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[36rem] border-collapse text-sm">
            <thead>
              <tr>
                <th className="border-b border-line px-2 py-2 text-left text-xs font-medium text-muted">
                  Persona
                </th>
                {data.personas.map((persona) => (
                  <th
                    key={persona.id}
                    className="border-b border-line px-2 py-2 text-right text-xs font-medium text-muted"
                  >
                    {persona.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.personas.map((row) => (
                <tr key={row.id}>
                  <th className="border-b border-line px-2 py-2 text-left text-xs font-normal text-ink2">
                    <Link href={`/personas/${row.id}`} className="hover:underline">
                      {row.name}
                    </Link>
                  </th>
                  {data.personas.map((col) => {
                    const own = row.id === col.id;
                    const shared = own
                      ? row.userStoryIds.length
                      : row.userStoryIds.filter((id) => col.userStoryIds.includes(id)).length;
                    return (
                      <td
                        key={col.id}
                        className={`border-b border-line px-2 py-2 text-right tabular-nums ${
                          own ? "font-semibold text-ink" : shared === 0 ? "text-muted" : "text-ink2"
                        }`}
                      >
                        {shared}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card
        title="Full story ranking"
        subtitle="Every user story by persona reach and tag count"
        className="mb-6"
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[44rem] border-collapse text-sm">
            <thead>
              <tr>
                {["ID", "User story", "Personas", "Tags", "Priority"].map((heading, i) => (
                  <th
                    key={heading}
                    className={`border-b border-line px-2 py-2 text-xs font-medium text-muted ${
                      i >= 2 ? "text-right" : "text-left"
                    }`}
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {stats.storiesByReach.map(({ item: story, count }) => (
                <tr key={story.id}>
                  <td className="border-b border-line px-2 py-2 text-xs text-muted tabular-nums">
                    <Link href={`/user-stories/${story.id}`} className="hover:text-ink">
                      US-{story.id}
                    </Link>
                  </td>
                  <td className="border-b border-line px-2 py-2 text-ink">
                    <Link href={`/user-stories/${story.id}`} className="hover:underline">
                      {story.text}
                    </Link>
                  </td>
                  <td
                    className={`border-b border-line px-2 py-2 text-right tabular-nums ${
                      count === 0 ? "text-muted" : "text-ink2"
                    }`}
                  >
                    {count}
                  </td>
                  <td className="border-b border-line px-2 py-2 text-right text-ink2 tabular-nums">
                    {story.tagIds.length}
                  </td>
                  <td className="border-b border-line px-2 py-2 text-right text-xs text-ink2">
                    {story.priority === "n/a" ? "—" : story.priority}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card
          title="Unassigned user stories"
          subtitle="No persona mapped"
          action={
            <Link
              href="/user-stories?assignment=unassigned"
              className="text-xs text-ink2 underline hover:text-ink"
            >
              Explorer
            </Link>
          }
        >
          {stats.coverage.unassignedStories.length === 0 ? (
            <Empty>Every user story has a persona.</Empty>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {stats.coverage.unassignedStories.map((story) => (
                <li key={story.id}>
                  <Link
                    href={`/user-stories/${story.id}`}
                    className="flex gap-2 text-sm text-ink2 hover:text-ink"
                  >
                    <span className="shrink-0 text-xs text-muted tabular-nums">US-{story.id}</span>
                    <span className="min-w-0">{story.text}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card
          title="Unassigned personas"
          subtitle="No user story mapped"
          action={
            <Link
              href="/personas?coverage=unassigned"
              className="text-xs text-ink2 underline hover:text-ink"
            >
              Explorer
            </Link>
          }
        >
          {stats.coverage.unassignedPersonas.length === 0 ? (
            <Empty>Every persona has at least one user story.</Empty>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {stats.coverage.unassignedPersonas.map((persona) => (
                <li key={persona.id}>
                  <Link
                    href={`/personas/${persona.id}`}
                    className="text-sm text-ink2 hover:text-ink"
                  >
                    {persona.name}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Untagged user stories" subtitle="No tag applied">
          {stats.coverage.untaggedStories.length === 0 ? (
            <Empty>Every user story carries at least one tag.</Empty>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {stats.coverage.untaggedStories.map((story) => (
                <li key={story.id}>
                  <Link
                    href={`/user-stories/${story.id}`}
                    className="flex gap-2 text-sm text-ink2 hover:text-ink"
                  >
                    <span className="shrink-0 text-xs text-muted tabular-nums">US-{story.id}</span>
                    <span className="min-w-0">{story.text}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card
          title="Unused tags"
          subtitle="Defined in us_tags.html but never applied"
          action={
            <Link href="/tags?usage=unused" className="text-xs text-ink2 underline hover:text-ink">
              Explorer
            </Link>
          }
        >
          {stats.coverage.unusedTags.length === 0 ? (
            <Empty>Every defined tag is in use.</Empty>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {stats.coverage.unusedTags.map((tag) => (
                <li key={tag.id}>
                  <Link href={tagHref(tag.id)} className="text-sm text-ink2 hover:text-ink">
                    <span className="font-medium">{tag.id}</span>
                    {tag.description !== tag.id && (
                      <span className="text-muted"> — {tag.description}</span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
