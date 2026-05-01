import type { DataRecord, Panel } from "@aguspe/tiler-core";

export function MeterExample(): { panel: Panel; records: DataRecord[] } {
  const now = "2026-04-30T12:00:00.000Z";
  const panel: Panel = {
    id: "meter-1",
    dashboard_id: "demo",
    data_source_id: "ds-1",
    title: "Avg duration (ms)",
    widget_type: "meter",
    x: 0,
    y: 0,
    width: 3,
    height: 2,
    config: {
      aggregation: "avg",
      value_column: "duration_ms",
      time_window: "24h",
      min: 0,
      max: 1000,
      target: 200,
      suffix: " ms",
    },
    created_at: now,
    updated_at: now,
  };
  const records: DataRecord[] = Array.from({ length: 50 }, (_, i) => ({
    id: `r${i}`,
    data_source_id: "ds-1",
    payload: { duration_ms: 120 + (i % 10) * 30 },
    recorded_at: new Date(Date.parse(now) - i * 60_000).toISOString(),
    source_ref: null,
    ingested_via: "webhook",
    created_at: now,
  }));
  return { panel, records };
}
