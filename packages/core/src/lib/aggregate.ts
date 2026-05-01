import type { DataRecord } from "../schema/data_record";
import type { Aggregation } from "../schema/time_window";

export interface AggregateOpts {
  aggregation: Aggregation;
  value_column?: string;
}

/**
 * Pure aggregation over a record array. Used by every data-backed widget's resolver.
 *
 * - `count` ignores `value_column` and returns record count.
 * - `sum` / `avg` / `min` / `max` coerce values to numbers; non-numeric values are skipped.
 * - `first` / `last` return the raw column value of the first / last record (typed as number).
 */
export function aggregate(records: DataRecord[], opts: AggregateOpts): number {
  const { aggregation, value_column } = opts;

  if (aggregation === "count") return records.length;
  if (records.length === 0) return 0;

  if (aggregation === "first" || aggregation === "last") {
    const r = aggregation === "first" ? records[0] : records[records.length - 1];
    if (!r || !value_column) return 0;
    const v = Number(r.payload[value_column]);
    return Number.isFinite(v) ? v : 0;
  }

  if (!value_column) return 0;
  const values: number[] = [];
  for (const r of records) {
    const v = Number(r.payload[value_column]);
    if (Number.isFinite(v)) values.push(v);
  }
  if (values.length === 0) return 0;

  switch (aggregation) {
    case "sum":
      return values.reduce((a, b) => a + b, 0);
    case "avg":
      return values.reduce((a, b) => a + b, 0) / values.length;
    case "min":
      return Math.min(...values);
    case "max":
      return Math.max(...values);
  }
}
