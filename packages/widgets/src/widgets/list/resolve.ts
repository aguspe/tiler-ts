import {
  type DataRecord,
  type WidgetData,
  type WidgetResolverArgs,
  applyFilter,
  applyTimeWindow,
} from "@aguspe/tiler-core";
import { ListConfig } from "./schema";

export function resolveList({ panel, records, now }: WidgetResolverArgs): WidgetData<DataRecord[]> {
  const cfg = ListConfig.parse(panel.config);
  const windowed = applyTimeWindow(records, cfg.time_window, now);
  const filtered = applyFilter(windowed, cfg.filter);
  const sorted = filtered
    .slice()
    .sort((a, b) =>
      cfg.order_by === "recorded_at_desc"
        ? a.recorded_at < b.recorded_at
          ? 1
          : -1
        : a.recorded_at > b.recorded_at
          ? 1
          : -1,
    );
  return { resolved: sorted.slice(0, cfg.limit), empty: sorted.length === 0 };
}
