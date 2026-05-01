import type { DataRecord, Panel } from "@aguspe/tiler-core";

export function LineChartExample(): { panel: Panel; records: DataRecord[] } {
  const now = "2026-04-30T12:00:00.000Z";
  const panel: Panel = {
    id: "lc-1",
    dashboard_id: "demo",
    data_source_id: "ds-1",
    title: "Status trend (7d)",
    widget_type: "line_chart",
    x: 0,
    y: 0,
    width: 6,
    height: 3,
    config: {
      group_column: "status",
      aggregation: "count",
      time_window: "7d",
      bucket: "1d",
    },
    created_at: now,
    updated_at: now,
  };
  // 7 days × 30 records/day, distributed pass/fail/warn
  const records: DataRecord[] = [];
  for (let day = 0; day < 7; day++) {
    for (let i = 0; i < 30; i++) {
      const status = i % 6 === 0 ? "fail" : i % 6 === 1 ? "warn" : "pass";
      records.push({
        id: `r${day}-${i}`,
        data_source_id: "ds-1",
        payload: { status },
        recorded_at: new Date(
          Date.parse(now) - day * 24 * 3600_000 - i * 30 * 60_000,
        ).toISOString(),
        source_ref: null,
        ingested_via: "webhook",
        created_at: now,
      });
    }
  }
  return { panel, records };
}
