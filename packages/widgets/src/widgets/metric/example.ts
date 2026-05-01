import type { DataRecord, Panel } from "@aguspe/tiler-core";

export function MetricExample(): { panel: Panel; records: DataRecord[] } {
  const now = "2026-04-30T12:00:00.000Z";
  const panel: Panel = {
    id: "m-1",
    dashboard_id: "demo",
    data_source_id: "ds-1",
    title: "Total runs (24h)",
    widget_type: "metric",
    x: 0,
    y: 0,
    width: 3,
    height: 2,
    config: { aggregation: "count", time_window: "24h" },
    created_at: now,
    updated_at: now,
  };
  const records: DataRecord[] = Array.from({ length: 47 }, (_, i) => ({
    id: `r${i}`,
    data_source_id: "ds-1",
    payload: { status: "pass", duration_ms: 100 + i },
    recorded_at: new Date(Date.parse(now) - i * 60_000).toISOString(),
    source_ref: null,
    ingested_via: "webhook",
    created_at: now,
  }));
  return { panel, records };
}
