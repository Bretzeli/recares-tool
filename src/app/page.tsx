import Link from "next/link";

import { getDataset } from "@/lib/data";
import { tagHref } from "@/lib/slug";
import { computeStats } from "@/lib/stats";
import {
  BarList,
  Card,
  Empty,
  HeroFigure,
  Meter,
  StatTile,
  type BarDatum,
} from "@/components/ui";

export default function OverviewPage() {
  const data = getDataset();
  const stats = computeStats(data);

  const personaBars: BarDatum[] = stats.personaCounts.map((entry) => ({
    key: String(entry.item.id),
    label: entry.item.name,
    value: entry.count,
    href: `/personas/${entry.item.id}`,
  }));

  const reachBars: BarDatum[] = stats.storiesByReach
    .filter((entry) => entry.count > 0)
    .slice(0, 8)
    .map((entry) => ({
      key: String(entry.item.id),
      label: `US-${entry.item.id} · ${entry.item.text}`,
      value: entry.count,
      href: `/user-stories/${entry.item.id}`,
    }));

  const tagBars: BarDatum[] = stats.tagCounts
    .filter((entry) => entry.count > 0)
    .slice(0, 8)
    .map((entry) => ({
      key: entry.item.id,
      label: `${entry.item.id} — ${entry.item.description}`,
      value: entry.count,
      href: tagHref(entry.item.id),
    }));

  const warnings = data.issues.filter((issue) => issue.severity === "warning").length;

  return (
    <>
      <header className="mb-8 flex flex-wrap items-end justify-between gap-6">
        <HeroFigure
          label="User stories in the backlog"
          value={stats.totals.userStories}
          detail={
            <>
              across {stats.totals.personas} personas and {stats.totals.tags} tags, with{" "}
              {stats.totals.links} story↔persona links
            </>
          }
        />
        <div className="flex flex-wrap gap-2 text-xs">
          <Link
            href="/user-stories?assignment=unassigned"
            className="rounded-md border border-line px-3 py-2 text-ink2 hover:border-rule hover:text-ink"
          >
            {stats.coverage.unassignedStories.length} unassigned stories
          </Link>
          <Link
            href="/tags?usage=unused"
            className="rounded-md border border-line px-3 py-2 text-ink2 hover:border-rule hover:text-ink"
          >
            {stats.coverage.unusedTags.length} unused tags
          </Link>
          {warnings > 0 && (
            <Link
              href="/data-health"
              className="rounded-md border border-warn/40 bg-warn/10 px-3 py-2 text-ink hover:border-warn"
            >
              ⚠ {warnings} data warnings
            </Link>
          )}
        </div>
      </header>

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Stories per persona"
          value={stats.personaAverage.toFixed(1)}
          hint={`median ${stats.personaMedian}`}
          href="/stats"
        />
        <StatTile
          label="Busiest persona"
          value={stats.personaMax[0]?.count ?? 0}
          hint={stats.personaMax.map((entry) => entry.item.name).join(", ") || "—"}
          href={stats.personaMax[0] ? `/personas/${stats.personaMax[0].item.id}` : "/personas"}
        />
        <StatTile
          label="Quietest persona"
          value={stats.personaMin[0]?.count ?? 0}
          hint={stats.personaMin.map((entry) => entry.item.name).join(", ") || "—"}
          href={stats.personaMin[0] ? `/personas/${stats.personaMin[0].item.id}` : "/personas"}
        />
        <StatTile
          label="Widest story reach"
          value={stats.storiesByReach[0]?.count ?? 0}
          hint={
            stats.storiesByReach[0]
              ? `US-${stats.storiesByReach[0].item.id} wants ${stats.storiesByReach[0].count} personas`
              : "—"
          }
          href={
            stats.storiesByReach[0]
              ? `/user-stories/${stats.storiesByReach[0].item.id}`
              : "/user-stories"
          }
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card
          title="Coverage"
          subtitle="What the mapping sheet actually covers"
          className="lg:col-span-1"
        >
          <div className="flex flex-col gap-4">
            <Meter
              label="Stories with at least one persona"
              value={data.userStories.length - stats.coverage.unassignedStories.length}
              total={data.userStories.length}
            />
            <Meter
              label="Stories carrying at least one tag"
              value={data.userStories.length - stats.coverage.untaggedStories.length}
              total={data.userStories.length}
            />
            <Meter
              label="Personas with at least one story"
              value={data.personas.length - stats.coverage.unassignedPersonas.length}
              total={data.personas.length}
            />
            <Meter
              label="Tags applied at least once"
              value={data.tags.length - stats.coverage.unusedTags.length}
              total={data.tags.length}
            />
          </div>
        </Card>

        <Card
          title="User stories per persona"
          subtitle="All personas, most first"
          className="lg:col-span-2"
        >
          <BarList data={personaBars} emptyMessage="No personas loaded." />
        </Card>

        <Card
          title="Most requested stories"
          subtitle="Ranked by how many personas asked for them"
          className="lg:col-span-2"
          action={
            <Link
              href="/stats"
              className="text-xs text-ink2 underline hover:text-ink"
            >
              Full ranking
            </Link>
          }
        >
          <BarList data={reachBars} emptyMessage="No story is mapped to a persona." />
        </Card>

        <Card
          title="Most used tags"
          subtitle="Top 8 by story count"
          action={
            <Link href="/tags" className="text-xs text-ink2 underline hover:text-ink">
              All tags
            </Link>
          }
        >
          <BarList data={tagBars} emptyMessage="No tag is applied to a story." />
        </Card>

        <Card
          title="Unassigned user stories"
          subtitle="No persona is mapped to these"
          className="lg:col-span-3"
          action={
            <Link
              href="/user-stories?assignment=unassigned"
              className="text-xs text-ink2 underline hover:text-ink"
            >
              Open in the explorer
            </Link>
          }
        >
          {stats.coverage.unassignedStories.length === 0 ? (
            <Empty>Every user story has at least one persona.</Empty>
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2">
              {stats.coverage.unassignedStories.map((story) => (
                <li key={story.id}>
                  <Link
                    href={`/user-stories/${story.id}`}
                    className="flex gap-2 rounded-lg border border-line px-3 py-2 text-sm text-ink hover:border-rule"
                  >
                    <span className="shrink-0 text-xs text-muted tabular-nums">US-{story.id}</span>
                    <span className="min-w-0">{story.text}</span>
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
