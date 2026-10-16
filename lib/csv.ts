/** RFC 4180 CSV cell; prefixes formula-looking cells to avoid spreadsheet injection. */
export function csvCell(value: unknown): string {
  let s = value == null ? "" : Array.isArray(value) ? value.join("; ") : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(header: string[], rows: unknown[][]): string {
  // BOM so Excel opens UTF-8 (Vietnamese, Chinese) correctly.
  return "﻿" + [header, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n") + "\r\n";
}
