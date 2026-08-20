import { DATA_DIR, getDataset } from "@/lib/data";
import { Card, Empty, PageHeader, StatTile } from "@/components/ui";
import type { SourceFile } from "@/lib/types";

export const metadata = { title: "Data health" };

const STATUS: Record<SourceFile["status"], { label: string; icon: string; className: string }> = {
  loaded: { label: "Loaded", icon: "✓", className: "text-good" },
  missing: { label: "Missing", icon: "✕", className: "text-crit" },
  empty: { label: "Empty", icon: "!", className: "text-warn" },
  ignored: { label: "Ignored", icon: "–", className: "text-muted" },
};

export default function DataHealthPage() {
  const data = getDataset();
  const warnings = data.issues.filter((issue) => issue.severity === "warning");
  const notes = data.issues.filter((issue) => issue.severity === "info");

  return (
    <>
      <PageHeader
        title="Data health"
        lead="What was read out of the sheets, and everything that looked off while parsing. Nothing here blocks the app — inconsistent rows are surfaced rather than dropped silently."
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <StatTile
          label="Source files read"
          value={data.sources.filter((s) => s.status === "loaded").length}
          hint={`of ${data.sources.length} known filenames`}
        />
        <StatTile label="Warnings" value={warnings.length} />
        <StatTile label="Notes" value={notes.length} />
      </div>

      <Card title="Source files" subtitle={DATA_DIR} className="mb-6">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[34rem] border-collapse text-sm">
            <thead>
              <tr>
                {["File", "Status", "Data rows", "Note"].map((heading, i) => (
                  <th
                    key={heading}
                    className={`border-b border-line px-2 py-2 text-xs font-medium text-muted ${
                      i === 2 ? "text-right" : "text-left"
                    }`}
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.sources.map((source) => {
                const status = STATUS[source.status];
                return (
                  <tr key={source.file}>
                    <td className="border-b border-line px-2 py-2 text-ink">
                      <code className="text-xs">{source.file}</code>
                    </td>
                    <td className="border-b border-line px-2 py-2">
                      {/* Icon + label, never color alone. */}
                      <span className={`inline-flex items-center gap-1.5 text-xs ${status.className}`}>
                        <span aria-hidden>{status.icon}</span>
                        {status.label}
                      </span>
                    </td>
                    <td className="border-b border-line px-2 py-2 text-right text-ink2 tabular-nums">
                      {source.status === "ignored" ? "—" : source.rows}
                    </td>
                    <td className="border-b border-line px-2 py-2 text-xs text-muted">
                      {source.note ?? ""}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Warnings" subtitle="Rows that reference something that does not exist">
          {warnings.length === 0 ? (
            <Empty>No warnings — every reference resolves.</Empty>
          ) : (
            <ul className="flex flex-col gap-2">
              {warnings.map((issue, i) => (
                <li
                  key={i}
                  className="flex gap-2 rounded-lg border border-warn/40 bg-warn/10 px-3 py-2 text-sm text-ink"
                >
                  <span aria-hidden className="text-warn">
                    ⚠
                  </span>
                  <span>
                    <span className="sr-only">Warning: </span>
                    {issue.message}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Notes" subtitle="Harmless inconsistencies worth knowing about">
          {notes.length === 0 ? (
            <Empty>Nothing to note.</Empty>
          ) : (
            <ul className="flex flex-col gap-2">
              {notes.map((issue, i) => (
                <li
                  key={i}
                  className="rounded-lg border border-line px-3 py-2 text-sm text-ink2"
                >
                  {issue.message}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
