/**
 * Minimal RFC 4180 CSV helpers for contact import/export: handles quoted
 * fields, escaped quotes, embedded commas and newlines, and a UTF-8 BOM.
 */

export function parseCsv(text: string): string[][] {
  const input = text.replace(/^﻿/, "");
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < input.length; i++) {
    const char = input[i]!;
    if (inQuotes) {
      if (char === '"') {
        if (input[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && input[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }

  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows
    .map((r) => r.map((cell) => cell.trim()))
    .filter((r) => r.some((cell) => cell !== ""));
}

function escapeCell(value: unknown) {
  let text = value === null || value === undefined ? "" : String(value);
  // Names and messages come from WhatsApp users; neutralise anything a
  // spreadsheet would evaluate as a formula (CSV injection).
  if (/^[=+\-@\t\r]/.test(text) && !/^[-+]?\d[\d\s.,]*$/.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv(headers: string[], rows: unknown[][]) {
  return [headers, ...rows].map((r) => r.map(escapeCell).join(",")).join("\r\n");
}

export function downloadCsv(filename: string, csv: string) {
  // BOM so Excel opens UTF-8 names correctly.
  const blob = new Blob(["﻿", csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function guessColumn(headers: string[], pattern: RegExp, exclude?: RegExp) {
  return headers.find((h) => pattern.test(h) && !(exclude && exclude.test(h))) ?? "";
}

/** Blank headers get "Column N"; repeated headers get " (2)", " (3)"… so each is addressable. */
export function uniqueHeaders(headers: string[]) {
  const seen = new Map<string, number>();
  return headers.map((raw, i) => {
    const base = raw || `Column ${i + 1}`;
    const count = (seen.get(base) ?? 0) + 1;
    seen.set(base, count);
    return count === 1 ? base : `${base} (${count})`;
  });
}
