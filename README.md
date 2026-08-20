# ReCares — ESQ persona & user story explorer

A Next.js app that turns the Google Sheets HTML exports of the ESQ backlog into a browsable,
filterable view of personas, user stories, tags, and the statistics over how they connect.

**The app ships with no data.** You upload the sheet exports; they are parsed in your browser
and kept in that browser's local storage. Nothing is sent to a server, and there are no
default files to fall back on.

## Running it

```bash
npm install
npm run dev      # http://localhost:3000
```

```bash
npm run build && npm start   # production
npm run typecheck            # tsc --noEmit
```

On first load every page shows a drop zone. Drop the exports in (or use **Choose files…**) and
the whole app fills in. Files persist across reloads; **Files & data health** is where you
replace or remove them later.

## The files it accepts

Filenames must match this list. Matching is lenient about case, dashes vs underscores, and a
`(1)` suffix — `US_Sheet (1).html` is accepted as `us_sheet.html`.

| File | Used for |
|---|---|
| `us_sheet.html` | **Required.** Story text, original wording, category, priority, tags |
| `persona_sheet.html` | Persona ids and names |
| `us_persona_mapping.html` | Which personas asked for which story |
| `us_tags.html` | Tag definitions and their categories |
| `persona_us_mapping.html` | **Ignored** — redundant transpose of `us_persona_mapping.html` |
| `pivot_table.html` | **Ignored** — blank sheet |

Only `us_sheet.html` is required; the app runs on any subset that includes it, and Data health
reports what is missing and what each gap costs you. Upload the two ignored files if you like —
they are listed as ignored rather than silently dropped, so the omission is visible.

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
- **Files & data health** — upload/replace/remove sheets, see which were read and how many rows
  each yielded, and every inconsistency found while parsing.

Deep links carry filters, so `/user-stories?persona=1&category=...` and `/tags?usage=unused`
open the explorer pre-filtered. Accepted params: `persona`, `tag`, `category`, `priority`,
`assignment`, `q` on `/user-stories`; `coverage` on `/personas`; `usage` on `/tags`.
Repeated (`?tag=A&tag=B`) and comma-joined (`?tag=A,B`) forms both work.

## How the sheets are parsed

`src/lib/sheet.ts` handles the quirks of the Sheets "publish to web" markup, using the
browser's built-in `DOMParser`:

- The `<thead>` holds column letters (A, B, C), not field names — the real header is the
  first `<tr>` of `<tbody>`.
- Every row starts with a `<th>` row-number cell, which is skipped.
- Overflowing cells wrap their text in a `.softmerge-inner` `<div>` rather than putting it
  in the `<td>`, so cell text is read from that div when present.
- Exports are often saved as UTF-8 mis-decoded as CP1252 (`Ã©` for `é`). Uploaded bytes are
  decoded as strict UTF-8 with a CP1252 fallback, and `repairMojibake()` reverses damage that
  was already baked into the file, leaving clean text untouched.

Tag columns are read from `tag_1` rightwards with no fixed end: the sheet declares five tag
columns but a story can spill into more, and a hard-coded `tag_1..tag_5` would drop them.

Parsing never throws on bad data. A row referencing a persona or story that does not exist,
a tag used but never defined, a duplicate id, an unrecognised priority — each becomes an
entry on **Files & data health** and the rest of the import continues.

### Quirks worth knowing

- Tag ids can contain slashes (`Content/Structure`), which a dynamic `[id]` route would read
  as path separators, so tag pages are routed on a slug (`/tags/content-structure`) and
  resolved back by comparison — see `src/lib/slug.ts`.
- Tags declared with no category are grouped under **Uncategorized**.
- Where a story's wording differs between `us_sheet.html` and `us_persona_mapping.html`,
  `us_sheet.html` is authoritative for text and the mapping file is used only for the persona
  links. Mismatches are reported as notes on Data health.

## Charts

Every chart is a single measure on one axis, so all data marks use one validated hue
(`#2a78d6` light / `#3987e5` dark) at a uniform step — no bar is coloured by its own value
and there is no categorical palette in play. Bars are 8px with a 4px rounded data-end
against a square baseline, values are direct-labelled at the tip, and every chart has a
table equivalent, so no number is reachable only by hovering. Light and dark are separate
selected steps rather than an automatic flip; the theme control cycles Auto → Light → Dark.

## Layout

```
src/lib/files.ts          known filenames, upload reading, encoding fallback
src/lib/sheet.ts          Sheets HTML -> rows, mojibake repair
src/lib/dataset.ts        rows -> Dataset, cross-referencing, issue collection
src/lib/storage.ts        localStorage persistence of the raw uploads
src/lib/stats.ts          all derived statistics
src/lib/slug.ts           URL-safe tag ids
src/components/           upload panel, dataset context, filters, explorers, charts
src/app/                  routes (all client components, fed from the context)
```

There is no server-side data access: `src/app` contains no `fs` use and no API routes, so the
app can also be served as a purely static site.
