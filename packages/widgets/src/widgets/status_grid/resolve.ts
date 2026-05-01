import {
  type WidgetData,
  type WidgetResolverArgs,
  applyFilter,
  applyTimeWindow,
  groupByColumn,
} from "@aguspe/tiler-core";
import { StatusGridConfig } from "./schema";

export interface StatusGridCell {
  key: string;
  status: string;
  count: number;
}

export function resolveStatusGrid({
  panel,
  records,
  now,
}: WidgetResolverArgs): WidgetData<StatusGridCell[]> {
  const cfg = StatusGridConfig.parse(panel.config);
  const windowed = applyTimeWindow(records, cfg.time_window, now);
  const filtered = applyFilter(windowed, cfg.filter);
  const groups = groupByColumn(filtered, cfg.group_column);
  const cells = groups.map<StatusGridCell>(({ key, records: recs }) => {
    const latest = recs.slice().sort((a, b) => (a.recorded_at < b.recorded_at ? 1 : -1))[0];
    return {
      key,
      status: String(latest?.payload[cfg.status_column] ?? "skip"),
      count: recs.length,
    };
  });
  cells.sort((a, b) => a.key.localeCompare(b.key));
  return { resolved: cells, empty: cells.length === 0 };
}
