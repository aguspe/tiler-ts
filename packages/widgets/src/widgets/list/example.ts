import type { DataRecord, Panel } from "@aguspe/tiler-core";

export function ListExample(): { panel: Panel; records: DataRecord[] } {
  const now = "2026-04-30T12:00:00.000Z";
  const panel: Panel = {
    id: "list-1",
    dashboard_id: "demo",
    data_source_id: "ds-1",
    title: "Recent failures (24h)",
    widget_type: "list",
    x: 0,
    y: 0,
    width: 6,
    height: 4,
    config: {
      columns: ["test_name", "suite", "duration_ms"],
      time_window: "24h",
      filter: { status: "fail" },
      limit: 10,
      order_by: "recorded_at_desc",
    },
    created_at: now,
    updated_at: now,
  };
  const records: DataRecord[] = Array.from({ length: 30 }, (_, i) => ({
    id: `r${i}`,
    data_source_id: "ds-1",
    payload: {
      test_name: `test_${i}`,
      suite: ["checkout", "auth", "search"][i % 3] ?? "other",
      duration_ms: 100 + i * 10,
      status: i % 3 === 0 ? "fail" : "pass",
    },
    recorded_at: new Date(Date.parse(now) - i * 60_000).toISOString(),
    source_ref: null,
    ingested_via: "webhook",
    created_at: now,
  }));
  return { panel, records };
}
