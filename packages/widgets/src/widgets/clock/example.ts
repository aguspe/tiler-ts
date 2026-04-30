import type { Panel } from "@aguspe/tiler-core";

export function ClockExample(): { panel: Panel; records: never[] } {
  const now = "2026-04-30T13:42:30.000Z";
  const panel: Panel = {
    id: "clock-1",
    dashboard_id: "demo",
    data_source_id: null,
    title: "Build clock",
    widget_type: "clock",
    x: 9,
    y: 0,
    width: 3,
    height: 2,
    config: { format: "24h", timezone: "UTC", show_seconds: false },
    created_at: now,
    updated_at: now,
  };
  return { panel, records: [] };
}
