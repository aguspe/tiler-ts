import {
  type WidgetData,
  type WidgetResolverArgs,
  aggregate,
  applyFilter,
  applyTimeWindow,
} from "@aguspe/tiler-core";
import { MetricConfig } from "./schema";

export function resolveMetric({ panel, records, now }: WidgetResolverArgs): WidgetData<number> {
  const cfg = MetricConfig.parse(panel.config);
  const windowed = applyTimeWindow(records, cfg.time_window, now);
  const filtered = applyFilter(windowed, cfg.filter);
  const value = aggregate(filtered, {
    aggregation: cfg.aggregation,
    value_column: cfg.value_column,
  });
  const empty = cfg.aggregation === "count" ? false : filtered.length === 0;
  return { resolved: value, empty };
}
