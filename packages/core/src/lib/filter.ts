import type { DataRecord } from "../schema/data_record";

export type Filter = Record<string, string | number | boolean>;

export function applyFilter(records: DataRecord[], filter?: Filter): DataRecord[] {
  if (!filter || Object.keys(filter).length === 0) return records;
  const entries = Object.entries(filter);
  return records.filter((r) => entries.every(([k, v]) => r.payload[k] === v));
}
