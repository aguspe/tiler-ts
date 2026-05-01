import {
  type WidgetData,
  type WidgetResolverArgs,
  aggregate,
  applyFilter,
  applyTimeWindow,
  bucketByTime,
  groupByColumn,
} from "@aguspe/tiler-core";
import { LineChartConfig } from "./schema";

export interface LineChartSeries {
  name: string;
  points: Array<{ t: string; v: number }>;
}
export interface LineChartResolved {
  series: LineChartSeries[];
}

export function resolveLineChart({
  panel,
  records,
  now,
}: WidgetResolverArgs): WidgetData<LineChartResolved> {
  const cfg = LineChartConfig.parse(panel.config);
  const windowed = applyTimeWindow(records, cfg.time_window, now);
  const filtered = applyFilter(windowed, cfg.filter);

  const seriesGroups = cfg.group_column
    ? groupByColumn(filtered, cfg.group_column)
    : [{ key: "value", records: filtered }];

  const series: LineChartSeries[] = seriesGroups.map(({ key, records: recs }) => {
    const buckets = bucketByTime(recs, cfg.bucket);
    return {
      name: key,
      points: buckets.map((b) => ({
        t: b.key,
        v: aggregate(b.records, {
          aggregation: cfg.aggregation,
          value_column: cfg.value_column,
        }),
      })),
    };
  });

  return { resolved: { series }, empty: filtered.length === 0 };
}
