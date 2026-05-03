import type { DataRecord, Panel } from "@aguspe/tiler-core";

export function TestTimelineExample(): { panel: Panel; records: DataRecord[] } {
  const now = "2026-04-30T12:00:00.000Z";
  const panel: Panel = {
    id: "tt-1",
    dashboard_id: "demo",
    data_source_id: "ds-1",
    title: "Test Duration Timeline",
    widget_type: "test_timeline",
    x: 0,
    y: 2,
    width: 12,
    height: 3,
    config: { limit: 50 },
    created_at: now,
    updated_at: now,
  };
  const suites = ["auth", "checkout", "search", "nav"];
  const statuses = ["pass", "pass", "pass", "fail", "skip"];
  const records: DataRecord[] = Array.from({ length: 20 }, (_, i) => ({
    id: `r${i}`,
    data_source_id: "ds-1",
    payload: {
      test_name: `test_${i + 1}`,
      suite: suites[i % suites.length] ?? "other",
      status: statuses[i % statuses.length] ?? "pass",
      duration_ms: 100 + i * 75,
    },
    recorded_at: new Date(Date.parse(now) - i * 5_000).toISOString(),
    source_ref: null,
    ingested_via: "manual",
    created_at: now,
  }));
  return { panel, records };
}
