import type { DataRecord, Panel } from "@aguspe/tiler-core";

export function NumberWithDeltaExample(): { panel: Panel; records: DataRecord[] } {
  const now = "2026-04-30T12:00:00.000Z";
  const panel: Panel = {
    id: "nwd-1",
    dashboard_id: "demo",
    data_source_id: "ds-1",
    title: "Failures (24h)",
    widget_type: "number_with_delta",
    x: 0,
    y: 0,
    width: 3,
    height: 2,
    config: {
      aggregation: "count",
      time_window: "24h",
      delta_window: "24h",
      sparkline_bucket: "1h",
      filter: { status: "fail" },
      color: "#ef4444",
    },
    created_at: now,
    updated_at: now,
  };
  // 30 records spanning ~30 hours back, every hour.
  const records: DataRecord[] = Array.from({ length: 30 }, (_, i) => ({
    id: `r${i}`,
    data_source_id: "ds-1",
    payload: { status: i % 4 === 0 ? "fail" : "pass" },
    recorded_at: new Date(Date.parse(now) - i * 60 * 60_000).toISOString(),
    source_ref: null,
    ingested_via: "webhook",
    created_at: now,
  }));
  return { panel, records };
}
