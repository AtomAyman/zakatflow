// ─── Reading tabular files ────────────────────────────────
//
// Turns CSV/TSV text into a header row plus data rows, and reads numbers in
// the formats people actually export: 1,234.56 / 1.234,56 / 1 234,56,
// currency symbols, and (123.45) for negatives. Browser-only, no network.

export interface Table {
  headers: string[];
  rows: string[][];
  /** 0-based index of the header row in the original file. */
  headerRowIndex: number;
  delimiter: ',' | ';' | '\t';
}

export type NumberFormat = '1,234.56' | '1.234,56' | '1 234,56';

/** Picks the delimiter that splits the first lines most consistently. */
export function sniffDelimiter(text: string): Table['delimiter'] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim()).slice(0, 10);
  let best: Table['delimiter'] = ',';
  let bestScore = -1;
  for (const d of [',', ';', '\t'] as const) {
    const counts = lines.map((l) => splitRow(l, d).length);
    const max = Math.max(...counts, 0);
    if (max < 2) continue;
    const score = counts.filter((c) => c === max).length * max;
    if (score > bestScore) { best = d; bestScore = score; }
  }
  return best;
}

function splitRow(line: string, d: string): string[] {
  return parseDelimited(line, d)[0] ?? [];
}

/** Splits text into rows, handling quoted fields with delimiters and quotes. */
export function parseDelimited(text: string, delimiter = ','): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  const pushRow = () => {
    row.push(field); field = '';
    if (row.some((f) => f.trim() !== '')) rows.push(row);
    row = [];
  };
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') inQuotes = false;
      else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === delimiter) { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      pushRow();
    } else field += c;
  }
  pushRow();
  return rows;
}

/**
 * Reads a table, finding the header row: brokers often put a title, an
 * account line or a blank line above it. `isHeader` decides which row counts.
 */
export function readTable(text: string, isHeader: (cells: string[]) => boolean): Table | null {
  const clean = text.replace(/^﻿/, '');
  const delimiter = sniffDelimiter(clean);
  const all = parseDelimited(clean, delimiter);
  for (let r = 0; r < Math.min(all.length, 20); r++) {
    if (isHeader(all[r])) {
      return {
        headers: all[r].map((h) => h.trim()),
        rows: all.slice(r + 1),
        headerRowIndex: r,
        delimiter,
      };
    }
  }
  return null;
}

/** Guesses the number format from sample cells of one file. */
export function detectNumberFormat(samples: string[]): NumberFormat {
  let eu = 0, us = 0, space = 0;
  for (const raw of samples) {
    const s = raw.replace(/[^\d.,\s  ]/g, '').trim();
    if (/^\d{1,3}([\s  ]\d{3})+(,\d+)?$/.test(s)) space++;
    else if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(s) || /^\d+,\d{1,2}$/.test(s)) eu++;
    else if (/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(s) || /^\d+\.\d+$/.test(s)) us++;
  }
  if (space > us && space >= eu) return '1 234,56';
  if (eu > us) return '1.234,56';
  return '1,234.56';
}

/** Reads one number; undefined for blank, "--", "N/A" and the like. */
export function parseAmount(raw: string | undefined, format: NumberFormat = '1,234.56'): number | undefined {
  if (raw == null) return undefined;
  let s = raw.trim();
  if (!s || /^(--?|n\/?a|null|none)$/i.test(s)) return undefined;
  let negative = false;
  if (/^\(.*\)$/.test(s)) { negative = true; s = s.slice(1, -1); }
  const signs = s.replace(/[^\d.,\-]/g, '');
  if (signs.startsWith('-') || signs.endsWith('-')) negative = true;
  s = s.replace(/[^\d.,]/g, '');
  if (format === '1.234,56') s = s.replace(/\./g, '').replace(',', '.');
  else if (format === '1 234,56') s = s.replace(',', '.');
  else s = s.replace(/,/g, '');
  if (!s || s === '.') return undefined;
  const n = Number(s);
  if (!Number.isFinite(n)) return undefined;
  return negative ? -n : n;
}

/** Finds the first header that matches one of the aliases (case-insensitive). */
export function findColumn(headers: string[], aliases: readonly string[]): number | undefined {
  const norm = headers.map((h) => h.trim().toLowerCase().replace(/[*_]+/g, ' ').replace(/\s+/g, ' '));
  for (const a of aliases) {
    const i = norm.indexOf(a);
    if (i >= 0) return i;
  }
  return undefined;
}
