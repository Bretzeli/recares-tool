/**
 * Readers for the "publish to web" HTML that Google Sheets emits (the `ritz
 * waffle` markup). Two quirks drive everything here:
 *
 *  1. `<thead>` holds the spreadsheet column letters (A, B, C...), not field
 *     names. The real header is the first `<tr>` of `<tbody>`.
 *  2. Every `<tr>` starts with a `<th>` carrying the row number, and a cell
 *     whose text overflows its column wraps the text in a `.softmerge-inner`
 *     `<div>` instead of putting it directly in the `<td>`.
 *
 * Parsing runs in the browser against the files the user uploads, so it uses
 * the built-in `DOMParser` — which also decodes HTML entities for us.
 *
 * This file reasons about byte-level encoding damage, so it deliberately
 * contains no non-ASCII literals: every code point is written numerically and
 * patterns are built with `new RegExp`, so the logic cannot be broken by its
 * own source file being re-encoded.
 */

export interface SheetTable {
  /** Field names taken from the first body row. */
  header: string[];
  /** Data rows, header excluded. Ragged rows are kept as-is. */
  rows: string[][];
}

/**
 * CP1252's 0x80-0x9F range, which Latin-1 leaves undefined, as
 * [code point, byte] pairs. Needed to turn a mojibake string back into the
 * byte sequence it was mis-decoded from.
 */
const CP1252_HIGH = new Map<number, number>([
  [0x20ac, 0x80], // euro
  [0x201a, 0x82], // single low quote
  [0x0192, 0x83], // florin
  [0x201e, 0x84], // double low quote
  [0x2026, 0x85], // ellipsis
  [0x2020, 0x86], // dagger
  [0x2021, 0x87], // double dagger
  [0x02c6, 0x88], // circumflex
  [0x2030, 0x89], // per mille
  [0x0160, 0x8a], // S caron
  [0x2039, 0x8b], // single left angle quote
  [0x0152, 0x8c], // OE ligature
  [0x017d, 0x8e], // Z caron
  [0x2018, 0x91], // left single quote
  [0x2019, 0x92], // right single quote
  [0x201c, 0x93], // left double quote
  [0x201d, 0x94], // right double quote
  [0x2022, 0x95], // bullet
  [0x2013, 0x96], // en dash
  [0x2014, 0x97], // em dash
  [0x02dc, 0x98], // small tilde
  [0x2122, 0x99], // trademark
  [0x0161, 0x9a], // s caron
  [0x203a, 0x9b], // single right angle quote
  [0x0153, 0x9c], // oe ligature
  [0x017e, 0x9e], // z caron
  [0x0178, 0x9f], // Y diaeresis
]);

/**
 * Sequences that only occur when UTF-8 bytes were decoded as CP1252/Latin-1:
 * U+00E2 U+20AC ("a-circumflex, euro") heads a mangled 3-byte sequence — curly
 * quotes, dashes — and C2/C3 followed by a continuation byte is a mangled
 * 2-byte one, which is how accented Latin letters come out.
 */
const MOJIBAKE_SIGNATURE = new RegExp("\\u00e2\\u20ac|[\\u00c2\\u00c3][\\u0080-\\u00bf]");

/** The non-breaking space Sheets leaves behind in padded cells. */
const NBSP = new RegExp("\\u00a0", "g");

/**
 * Undo one round of UTF-8-read-as-CP1252 damage, the state Sheets exports are
 * frequently saved in. Returns the input untouched when it is already clean or
 * when the repair would not produce valid UTF-8.
 */
export function repairMojibake(input: string): string {
  if (!MOJIBAKE_SIGNATURE.test(input)) return input;

  const bytes = new Uint8Array(input.length);
  for (let i = 0; i < input.length; i++) {
    const code = input.charCodeAt(i);
    if (code <= 0xff) {
      bytes[i] = code;
    } else {
      const byte = CP1252_HIGH.get(code);
      // Outside CP1252 entirely, so the string is not purely mojibake.
      if (byte === undefined) return input;
      bytes[i] = byte;
    }
  }

  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return input;
  }
}

function cellText(cell: Element): string {
  const soft = cell.querySelector(".softmerge-inner");
  const raw = (soft ?? cell).textContent ?? "";
  return repairMojibake(raw).replace(NBSP, " ").trim();
}

/**
 * Parse the first `<table>` of a Sheets export into a header + data rows.
 * Returns an empty table (rather than throwing) for markup with no table or no
 * body rows — a blank sheet such as `pivot_table.html` is legitimate input.
 */
export function parseSheet(html: string): SheetTable {
  if (typeof DOMParser === "undefined") return { header: [], rows: [] };

  const table = new DOMParser().parseFromString(html, "text/html").querySelector("table");
  if (!table) return { header: [], rows: [] };

  // `:scope > td` so the row-number <th> is skipped and any nested table's
  // cells could never bleed into this row.
  const bodyRows = Array.from((table.querySelector("tbody") ?? table).querySelectorAll("tr")).map(
    (tr) => Array.from(tr.querySelectorAll(":scope > td")).map(cellText),
  );

  // Rows that are entirely blank carry no information in a spreadsheet dump.
  const meaningful = bodyRows.filter((row) => row.some((cell) => cell !== ""));
  if (meaningful.length === 0) return { header: [], rows: [] };

  const [header, ...rows] = meaningful;
  return { header, rows };
}

/** Value at `index`, or "" when the row is short (trailing cells get trimmed). */
export function cellAt(row: string[], index: number): string {
  return row[index] ?? "";
}

/** Parse a spreadsheet integer id; returns null for blanks and non-numbers. */
export function parseId(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === "") return null;
  const n = Number.parseInt(trimmed, 10);
  return Number.isInteger(n) ? n : null;
}
