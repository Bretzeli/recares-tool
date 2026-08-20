import Link from "next/link";
import { notFound } from "next/navigation";

import { getDataset } from "@/lib/data";
import { tagHref } from "@/lib/slug";
import { Badge, Breadcrumb, Card, Empty, PageHeader, PriorityBadge, StatTile } from "@/components/ui";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const story = getDataset().userStories.find((s) => String(s.id) === id);
  return { title: story ? `US-${story.id}` : "User story" };
}

export default async function UserStoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = getDataset();
  const story = data.userStories.find((s) => String(s.id) === id);
  if (!story) notFound();

  const personas = story.personaIds
    .map((personaId) => data.personas.find((p) => p.id === personaId))
    .filter((p) => p !== undefined);
  const tags = story.tagIds
    .map((tagId) => data.tags.find((t) => t.id === tagId))
    .filter((t) => t !== undefined);

  // Stories that share at least one persona, ranked by how many they share.
  const related = data.userStories
    .filter((other) => other.id !== story.id)
    .map((other) => ({
      story: other,
      shared: other.personaIds.filter((pid) => story.personaIds.includes(pid)).length,
    }))
    .filter((entry) => entry.shared > 0)
    .sort((a, b) => b.shared - a.shared || a.story.id - b.story.id)
    .slice(0, 6);

  return (
    <>
      <Breadcrumb
        items={[
          { label: "User stories", href: "/user-stories" },
          { label: `US-${story.id}` },
        ]}
      />
      <PageHeader title={`US-${story.id}`} lead={story.text} />

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <PriorityBadge priority={story.priority} />
        <Link
          href={`/user-stories?category=${encodeURIComponent(story.category)}`}
          className="text-xs text-muted hover:text-ink hover:underline"
        >
          {story.category}
        </Link>
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <StatTile label="Personas asking for it" value={story.personaIds.length} />
        <StatTile label="Tags applied" value={story.tagIds.length} />
        <StatTile
          label="Priority"
          value={story.priority === "n/a" ? "Not set" : story.priority}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Personas" subtitle="Who asked for this story">
          {personas.length === 0 ? (
            <Empty>
              No persona is mapped to this story in us_persona_mapping.html.
            </Empty>
          ) : (
            <ul className="flex flex-col gap-2">
              {personas.map((persona) => (
                <li key={persona.id}>
                  <Link
                    href={`/personas/${persona.id}`}
                    className="flex items-center justify-between gap-3 rounded-lg border border-line px-3 py-2 text-sm text-ink hover:border-rule"
                  >
                    <span>{persona.name}</span>
                    <span className="text-xs text-muted tabular-nums">
                      {persona.userStoryIds.length} stories
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Tags" subtitle="From the tag columns of us_sheet.html">
          {tags.length === 0 ? (
            <Empty>This story carries no tags.</Empty>
          ) : (
            <ul className="flex flex-col gap-2">
              {tags.map((tag) => (
                <li key={tag.id}>
                  <Link
                    href={tagHref(tag.id)}
                    className="block rounded-lg border border-line px-3 py-2 hover:border-rule"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm text-ink">{tag.id}</span>
                      <span className="text-xs text-muted tabular-nums">
                        {tag.userStoryIds.length} stories
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-ink2">{tag.description}</p>
                    <p className="mt-0.5 text-xs text-muted">{tag.category}</p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {story.originalText && (
          <Card
            title="Original wording"
            subtitle="The raw note this story was written from"
            className="lg:col-span-2"
          >
            <p className="text-sm text-ink2">{story.originalText}</p>
          </Card>
        )}

        {related.length > 0 && (
          <Card
            title="Related stories"
            subtitle="Sharing at least one persona with this story"
            className="lg:col-span-2"
          >
            <ul className="flex flex-col gap-2">
              {related.map(({ story: other, shared }) => (
                <li key={other.id}>
                  <Link
                    href={`/user-stories/${other.id}`}
                    className="flex items-start justify-between gap-4 rounded-lg border border-line px-3 py-2 hover:border-rule"
                  >
                    <span className="min-w-0 text-sm text-ink">
                      <span className="mr-2 text-xs text-muted tabular-nums">US-{other.id}</span>
                      {other.text}
                    </span>
                    <Badge>{shared} shared</Badge>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    </>
  );
}
