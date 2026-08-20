import { getDataset } from "@/lib/data";
import { PageHeader } from "@/components/ui";
import { PersonaExplorer } from "@/components/persona-explorer";

export const metadata = { title: "Personas" };

type SearchParams = Record<string, string | string[] | undefined>;

export default async function PersonasPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const data = getDataset();

  const raw = Array.isArray(params.coverage) ? params.coverage[0] : params.coverage;
  const initialCoverage =
    raw === "assigned" || raw === "unassigned" ? raw : "all";

  return (
    <>
      <PageHeader
        title="Personas"
        lead="The six personas from persona_sheet.html. The bar shows how much of the backlog each one accounts for; open a persona to see its stories and the tags they pull in."
      />
      <PersonaExplorer
        personas={data.personas}
        userStories={data.userStories}
        initialCoverage={initialCoverage}
      />
    </>
  );
}
