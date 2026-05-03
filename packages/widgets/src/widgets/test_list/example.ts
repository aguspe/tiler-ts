import type { DataRecord, Panel } from "@aguspe/tiler-core";

export function TestListExample(): { panel: Panel; records: DataRecord[] } {
  const now = "2026-04-30T12:00:00.000Z";
  const panel: Panel = {
    id: "tl-1",
    dashboard_id: "demo",
    data_source_id: "ds-1",
    title: "All Tests",
    widget_type: "test_list",
    x: 0,
    y: 5,
    width: 8,
    height: 5,
    config: { limit: 200, show_failures_only: false },
    created_at: now,
    updated_at: now,
  };
  const suites = ["auth", "checkout", "search", "nav"];
  const rows: Array<{ status: string; duration: number; error?: string }> = [
    { status: "fail", duration: 3200, error: "AssertionError: Expected element to be visible" },
    { status: "fail", duration: 1800, error: "TimeoutError: Locator timed out" },
    { status: "skip", duration: 0 },
    { status: "pass", duration: 812 },
    { status: "pass", duration: 540 },
    { status: "pass", duration: 320 },
  ];
  const records: DataRecord[] = rows.map((row, i) => ({
    id: `r${i}`,
    data_source_id: "ds-1",
    payload: {
      test_name: `test_${i + 1}`,
      suite: suites[i % suites.length] ?? "other",
      status: row.status,
      duration_ms: row.duration,
      ...(row.error ? { error_message: row.error } : {}),
    },
    recorded_at: new Date(Date.parse(now) - i * 60_000).toISOString(),
    source_ref: null,
    ingested_via: "manual",
    created_at: now,
  }));
  return { panel, records };
}
