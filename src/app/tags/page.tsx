import { getDataset } from "@/lib/data";
import { PageHeader } from "@/components/ui";
import { TagExplorer } from "@/components/tag-explorer";

export const metadata = { title: "Tags" };

type SearchParams = Record<string, string | string[] | undefined>;

export default async function TagsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const data = getDataset();

  const raw = Array.isArray(params.usage) ? params.usage[0] : params.usage;
  const initialUsage = raw === "used" || raw === "unused" ? raw : "all";

  return (
    <>
      <PageHeader
        title="Tags"
        lead="Tag definitions from us_tags.html, counted by how many user stories carry them. Tags used on a story but never defined in the sheet are flagged as undeclared."
      />
      <TagExplorer
        tags={data.tags}
        totalStories={data.userStories.length}
        initialUsage={initialUsage}
      />
    </>
  );
}
