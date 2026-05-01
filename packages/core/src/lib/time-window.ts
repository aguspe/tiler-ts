import type { DataRecord } from "../schema/data_record";
import type { TimeWindow } from "../schema/time_window";

const MS = {
  "1m": 60_000,
  "5m": 5 * 60_000,
  "15m": 15 * 60_000,
  "1h": 3600_000,
  "4h": 4 * 3600_000,
  "24h": 24 * 3600_000,
  "7d": 7 * 24 * 3600_000,
  "30d": 30 * 24 * 3600_000,
} as const;

export interface TimeWindowBounds {
  /** ISO start of window (inclusive); null means open-ended (`time_window === "all"`). */
  since: string | null;
  /** ISO end of window (inclusive). */
  until: string;
}

export function timeWindowBounds(window: TimeWindow, now: Date): TimeWindowBounds {
  const until = now.toISOString();
  if (window === "all") return { since: null, until };
  const sinceMs = now.getTime() - MS[window];
  return { since: new Date(sinceMs).toISOString(), until };
}

export function applyTimeWindow(
  records: DataRecord[],
  window: TimeWindow,
  now: Date,
): DataRecord[] {
  const { since, until } = timeWindowBounds(window, now);
  return records.filter((r) => {
    if (since !== null && r.recorded_at < since) return false;
    if (r.recorded_at > until) return false;
    return true;
  });
}
