import type { DataRecord, Panel } from "@aguspe/tiler-core";

export function TableExample(): { panel: Panel; records: DataRecord[] } {
  const now = "2026-04-30T12:00:00.000Z";
  const panel: Panel = {
    id: "t-1",
    dashboard_id: "demo",
    data_source_id: "ds-1",
    title: "Test runs (24h)",
    widget_type: "table",
    x: 0,
    y: 0,
    width: 6,
    height: 4,
    config: {
      columns: [
        { key: "test_name", label: "Test", format: "text" },
        { key: "suite", label: "Suite", format: "text" },
        { key: "duration_ms", label: "Duration", format: "ms" },
        { key: "recorded_at", label: "When", format: "datetime" },
      ],
      time_window: "24h",
      limit: 100,
      pagination: true,
      page_size: 20,
      order_by: "recorded_at_desc",
    },
    created_at: now,
    updated_at: now,
  };
  const records: DataRecord[] = Array.from({ length: 60 }, (_, i) => ({
    id: `r${i}`,
    data_source_id: "ds-1",
    payload: {
      test_name: `tc_${String(i).padStart(3, "0")}`,
      suite: ["checkout", "auth", "search", "billing"][i % 4] ?? "other",
      duration_ms: 80 + ((i * 13) % 500),
      recorded_at: new Date(Date.parse(now) - i * 60_000).toISOString(),
    },
    recorded_at: new Date(Date.parse(now) - i * 60_000).toISOString(),
    source_ref: null,
    ingested_via: "webhook",
    created_at: now,
  }));
  return { panel, records };
}
