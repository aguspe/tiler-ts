import type { DataRecord, Panel } from "@aguspe/tiler-core";

export function PassRateExample(): { panel: Panel; records: DataRecord[] } {
  const now = "2026-04-30T12:00:00.000Z";
  const panel: Panel = {
    id: "pr-1",
    dashboard_id: "demo",
    data_source_id: "ds-1",
    title: "Pass Rate",
    widget_type: "pass_rate",
    x: 9,
    y: 0,
    width: 3,
    height: 2,
    config: { good_threshold: 90, warn_threshold: 70 },
    created_at: now,
    updated_at: now,
  };
  const statuses = ["pass", "pass", "pass", "pass", "pass", "pass", "pass", "fail", "fail", "skip"];
  const records: DataRecord[] = statuses.map((status, i) => ({
    id: `r${i}`,
    data_source_id: "ds-1",
    payload: { test_name: `test_${i}`, suite: "auth", status, duration_ms: 200 + i * 10 },
    recorded_at: new Date(Date.parse(now) - i * 60_000).toISOString(),
    source_ref: null,
    ingested_via: "manual",
    created_at: now,
  }));
  return { panel, records };
}
