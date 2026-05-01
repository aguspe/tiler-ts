import {
  type DataRecord,
  type WidgetData,
  type WidgetResolverArgs,
  applyFilter,
  applyTimeWindow,
} from "@aguspe/tiler-core";
import { CommentsConfig } from "./schema";

export function resolveComments({
  panel,
  records,
  now,
}: WidgetResolverArgs): WidgetData<DataRecord[]> {
  const cfg = CommentsConfig.parse(panel.config);
  const windowed = applyTimeWindow(records, cfg.time_window, now);
  const filtered = applyFilter(windowed, cfg.filter);
  const sorted = filtered.slice().sort((a, b) => (a.recorded_at < b.recorded_at ? 1 : -1));
  return { resolved: sorted.slice(0, cfg.limit), empty: sorted.length === 0 };
}
