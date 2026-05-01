import {
  type WidgetData,
  type WidgetResolverArgs,
  aggregate,
  applyFilter,
  applyTimeWindow,
  groupByColumn,
} from "@aguspe/tiler-core";
import { PieChartConfig } from "./schema";

export interface PieChartResolved {
  bars: Array<{ name: string; v: number }>;
}

export function resolvePieChart({
  panel,
  records,
  now,
}: WidgetResolverArgs): WidgetData<PieChartResolved> {
  const cfg = PieChartConfig.parse(panel.config);
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
    .filter((b) => b.v > 0);
  return { resolved: { bars }, empty: bars.length === 0 };
}
