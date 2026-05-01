import type { ColumnSpec } from "./schema";

export function formatCell(value: unknown, format: ColumnSpec["format"]): string {
  if (value === null || value === undefined) return "";
  switch (format) {
    case "number":
      return Number(value).toLocaleString();
    case "datetime":
      return new Date(String(value)).toLocaleString();
    case "percent":
      return `${(Number(value) * 100).toFixed(1)}%`;
    case "ms":
      return `${Math.round(Number(value))} ms`;
    default:
      return String(value);
  }
}
