import type { DataRecord } from "../schema/data_record";
import type { Bucket } from "../schema/time_window";

export interface Group<T = string> {
  key: T;
  records: DataRecord[];
}

const BUCKET_MS = {
  "30s": 30_000,
  "1m": 60_000,
  "5m": 5 * 60_000,
  "1h": 3600_000,
  "1d": 24 * 3600_000,
} as const;

export function groupByColumn(records: DataRecord[], column: string): Group[] {
  const map = new Map<string, DataRecord[]>();
  for (const r of records) {
    const raw = r.payload[column];
    const key = raw === undefined || raw === null ? "" : String(raw);
    let bucket = map.get(key);
    if (!bucket) {
      bucket = [];
      map.set(key, bucket);
    }
    bucket.push(r);
  }
  return Array.from(map.entries()).map(([key, recs]) => ({ key, records: recs }));
}

export function bucketByTime(records: DataRecord[], bucket: Bucket): Group[] {
  const ms = BUCKET_MS[bucket];
  const map = new Map<string, DataRecord[]>();
  for (const r of records) {
    const t = new Date(r.recorded_at).getTime();
    const floored = Math.floor(t / ms) * ms;
    const key = new Date(floored).toISOString();
    let arr = map.get(key);
    if (!arr) {
      arr = [];
      map.set(key, arr);
    }
    arr.push(r);
  }
  return Array.from(map.entries())
    .map(([key, recs]) => ({ key, records: recs }))
    .sort((a, b) => (a.key < b.key ? -1 : 1));
}
