import {
  aggregate,
  applyFilter,
  applyTimeWindow,
  bucketByTime,
  type WidgetData,
  type WidgetResolverArgs,
} from "@aguspe/tiler-core";
import { NumberWithDeltaConfig } from "./schema";

export interface NumberWithDeltaResolved {
  value: number;
  delta: number;
  /** null when prior period was 0 (avoid divide-by-zero noise). */
  delta_pct: number | null;
  spark: number[];
}

const WINDOW_MS = {
  "1m": 60_000,
  "5m": 5 * 60_000,
  "15m": 15 * 60_000,
  "1h": 3600_000,
  "4h": 4 * 3600_000,
  "24h": 24 * 3600_000,
  "7d": 7 * 24 * 3600_000,
  "30d": 30 * 24 * 3600_000,
} as const;

export function resolveNumberWithDelta({
  panel,
  records,
  now,
}: WidgetResolverArgs): WidgetData<NumberWithDeltaResolved> {
  const cfg = NumberWithDeltaConfig.parse(panel.config);
  const filtered = applyFilter(records, cfg.filter);

  const current = applyTimeWindow(filtered, cfg.time_window, now);
  const value = aggregate(current, {
    aggregation: cfg.aggregation,
    value_column: cfg.value_column,
  });

  // Prior window: same length as `delta_window`, immediately before the current window.
  const windowMs = WINDOW_MS[cfg.delta_window];
  const priorStart = now.getTime() - 2 * windowMs;
  const priorEnd = now.getTime() - windowMs;
  const prior = filtered.filter((r) => {
    const t = Date.parse(r.recorded_at);
    return t >= priorStart && t < priorEnd;
  });
  const priorValue = aggregate(prior, {
    aggregation: cfg.aggregation,
    value_column: cfg.value_column,
  });
  const delta = value - priorValue;
  const delta_pct = priorValue === 0 ? null : (delta / priorValue) * 100;

  const buckets = bucketByTime(current, cfg.sparkline_bucket);
  const spark = buckets.map((b) =>
    aggregate(b.records, { aggregation: cfg.aggregation, value_column: cfg.value_column }),
  );

  return {
    resolved: { value, delta, delta_pct, spark },
    empty: current.length === 0,
  };
}
