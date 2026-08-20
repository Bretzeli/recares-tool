import { getDataset } from "@/lib/data";
import { buildLookups } from "@/lib/lookups";
import { PRIORITY_ORDER, type Priority } from "@/lib/types";
import { PageHeader } from "@/components/ui";
import { UserStoryExplorer, type InitialFilters } from "@/components/user-story-explorer";

export const metadata = { title: "User stories" };

type SearchParams = Record<string, string | string[] | undefined>;

/** Accepts `?tag=A&tag=B` and `?tag=A,B` alike. */
function list(value: string | string[] | undefined): string[] {
  if (value === undefined) return [];
  const raw = Array.isArray(value) ? value : [value];
  return raw
    .flatMap((entry) => entry.split(","))
    .map((entry) => entry.trim())
    .filter((entry) => entry !== "");
}

function one(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function UserStoriesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const data = getDataset();
  const lookups = buildLookups(data);

  const assignmentParam = one(params.assignment);
  const initial: InitialFilters = {
    q: one(params.q) ?? "",
    personaIds: list(params.persona)
      .map((value) => Number.parseInt(value, 10))
      .filter((value) => Number.isInteger(value)),
    tagIds: list(params.tag).filter((id) => data.tags.some((tag) => tag.id === id)),
    categories: list(params.category).filter((c) => data.categories.includes(c)),
    priorities: list(params.priority).filter((p): p is Priority =>
      (PRIORITY_ORDER as string[]).includes(p),
    ),
    assignment:
      assignmentParam === "assigned" || assignmentParam === "unassigned"
        ? assignmentParam
        : "all",
  };

  return (
    <>
      <PageHeader
        title="User stories"
        lead="Every story from us_sheet.html, cross-referenced with the personas that asked for it and the tags it carries. Filters stack; links from persona and tag pages arrive here pre-filtered."
      />
      <UserStoryExplorer
        userStories={data.userStories}
        personas={data.personas}
        tags={data.tags}
        categories={data.categories}
        priorities={data.priorities}
        lookups={lookups}
        initial={initial}
      />
    </>
  );
}
