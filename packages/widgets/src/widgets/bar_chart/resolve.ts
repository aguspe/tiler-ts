import {
  type WidgetData,
  type WidgetResolverArgs,
  aggregate,
  applyFilter,
  applyTimeWindow,
  groupByColumn,
} from "@aguspe/tiler-core";
import { BarChartConfig } from "./schema";

export interface BarChartResolved {
  bars: Array<{ name: string; v: number }>;
}

export function resolveBarChart({
  panel,
  records,
  now,
}: WidgetResolverArgs): WidgetData<BarChartResolved> {
  const cfg = BarChartConfig.parse(panel.config);
  const windowed = applyTimeWindow(records, cfg.time_window, now);
  const filtered = applyFilter(windowed, cfg.filter);
  const groups = groupByColumn(filtered, cfg.group_column);
  const bars = groups
    .map(({ key, records: recs }) => ({
      name: key,
      v: aggregate(recs, {
        aggregation: cfg.aggregation,
        value_column: cfg.value_column,
      }),
    }))
    .sort((a, b) => b.v - a.v)
    .slice(0, cfg.limit);
  return { resolved: { bars }, empty: bars.length === 0 };
}
