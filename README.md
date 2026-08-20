# ReCares — ESQ persona & user story explorer

A Next.js app that reads the Google Sheets HTML exports in [`data/`](data/) and turns them
into a browsable, filterable view of the ESQ backlog: personas, user stories, tags, and the
statistics over how they connect.

Nothing is hard-coded. Replace the files in `data/` with fresh exports (same filenames) and
reload — the app re-parses on every request and picks up the change.

## Running it

```bash
npm install
npm run dev      # http://localhost:3000
```

```bash
npm run build && npm start   # production
npm run typecheck            # tsc --noEmit
```

## Source files

| File | Used for |
|---|---|
| `persona_sheet.html` | Persona ids and names |
| `us_sheet.html` | User stories: text, original wording, category, priority, tags |
| `us_persona_mapping.html` | Which personas asked for which story |
| `us_tags.html` | Tag definitions and their categories |
| `persona_us_mapping.html` | **Ignored** — redundant |
| `pivot_table.html` | **Ignored** — blank sheet |

`persona_us_mapping.html` is the persona-major transpose of `us_persona_mapping.html` and
contains only a header row, so persona→story is derived from the story-major file instead.
Both ignored files are still listed on the **Data health** page so the omission is visible
rather than silent.

To point the app at a different folder, set `RECARES_DATA_DIR`.

## What the pages do

- **Overview** — headline totals, coverage meters, stories per persona, the most-requested
  stories, the most-used tags, and the unassigned stories in full.
- **Personas** — search personas or the text of their stories; filter to those with or
  without stories. Each persona page shows its stories, the tags they pull in, category and
  priority mix, and overlap with every other persona.
- **User stories** — the main explorer. Free-text search plus stacking filters on persona,
  tag (any/all), category, priority, persona assignment, and tag coverage; six sort orders.
  Each story page lists its personas, tags, original wording, and related stories.
- **Tags** — search and filter by tag category or usage. Each tag page shows the personas it
  reaches through its stories and the tags it co-occurs with.
- **Statistics** — distributions, min/max/mean/median stories per persona, a persona-by-persona
  shared-story matrix, a full story ranking table, and every coverage gap.
- **Data health** — which files were read, how many rows each yielded, and every
  inconsistency found while parsing.

Deep links carry filters, so `/user-stories?persona=1&category=...` and `/tags?usage=unused`
open the explorer pre-filtered. Accepted params: `persona`, `tag`, `category`, `priority`,
`assignment`, `q` on `/user-stories`; `coverage` on `/personas`; `usage` on `/tags`.
Repeated (`?tag=A&tag=B`) and comma-joined (`?tag=A,B`) forms both work.

## How the sheets are parsed

`src/lib/sheet.ts` handles the quirks of the Sheets "publish to web" markup:

- The `<thead>` holds column letters (A, B, C), not field names — the real header is the
  first `<tr>` of `<tbody>`.
- Every row starts with a `<th>` row-number cell, which is skipped.
- Overflowing cells wrap their text in a `.softmerge-inner` `<div>` rather than putting it
  in the `<td>`, so cell text is read from that div when present.
- Exports are often saved as UTF-8 mis-decoded as CP1252 (`Ã©` for `é`). `repairMojibake()`
  detects the signature byte patterns and reverses it, leaving already-clean text untouched.

Tag columns are read from `tag_1` rightwards with no fixed end: the sheet declares five tag
columns but story 9 spills into two more, and a hard-coded `tag_1..tag_5` would drop them.

Parsing never throws on bad data. A row referencing a persona or story that does not exist,
a tag used but never defined, a duplicate id, an unrecognised priority — each becomes an
entry on the **Data health** page and the rest of the import continues.

### Known quirks in the current data

- Tag ids contain slashes (`Content/Structure`, `Policies/Procedures`), which a dynamic
  `[id]` route would read as path separators, so tag pages are routed on a slug
  (`/tags/content-structure`) and resolved back by comparison — see `src/lib/slug.ts`.
- `Content/Structure`, `Services`, `Web App` and `Policies/Procedures` are declared in
  `us_tags.html` with no category, so they are grouped under **Uncategorized**.
- US-7's wording differs slightly between `us_sheet.html` and `us_persona_mapping.html`.
  `us_sheet.html` is treated as authoritative for text; the mapping file is used only for
  the persona links. Mismatches like this are reported as notes on Data health.

## Charts

Every chart is a single measure on one axis, so all data marks use one validated hue
(`#2a78d6` light / `#3987e5` dark) at a uniform step — no bar is coloured by its own value
and there is no categorical palette in play. Bars are 8px with a 4px rounded data-end
against a square baseline, values are direct-labelled at the tip, and every chart has a
table equivalent, so no number is reachable only by hovering. Light and dark are separate
selected steps rather than an automatic flip; the theme control cycles Auto → Light → Dark.

## Layout

```
data/                     source sheets (swap these out)
src/lib/sheet.ts          Sheets HTML -> rows, encoding repair
src/lib/data.ts           rows -> Dataset, cross-referencing, issue collection
src/lib/stats.ts          all derived statistics
src/lib/slug.ts           URL-safe tag ids
src/components/           filter primitives, explorers, chart/stat components
src/app/                  routes
```
