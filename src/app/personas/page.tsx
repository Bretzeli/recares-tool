"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

import { DatasetPending } from "@/components/dataset-gate";
import { useDataset } from "@/components/dataset-provider";
import { PersonaExplorer } from "@/components/persona-explorer";
import { PageHeader } from "@/components/ui";

function PersonasView() {
  const { dataset } = useDataset();
  const params = useSearchParams();

  if (!dataset) return <DatasetPending />;

  const raw = params.get("coverage");
  const initialCoverage = raw === "assigned" || raw === "unassigned" ? raw : "all";

  return (
    <>
      <PageHeader
        title="Personas"
        lead="Personas from persona_sheet.html. The bar shows how much of the backlog each one accounts for; open a persona to see its stories and the tags they pull in."
      />
      <PersonaExplorer
        key={params.toString()}
        personas={dataset.personas}
        userStories={dataset.userStories}
        initialCoverage={initialCoverage}
      />
    </>
  );
}

export default function PersonasPage() {
  return (
    <Suspense fallback={<div className="py-16 text-center text-sm text-muted">Loading…</div>}>
      <PersonasView />
    </Suspense>
  );
}
