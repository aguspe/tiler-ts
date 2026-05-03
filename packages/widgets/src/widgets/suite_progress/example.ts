import type { DataRecord, Panel } from "@aguspe/tiler-core";

export function SuiteProgressExample(): { panel: Panel; records: DataRecord[] } {
  const now = "2026-04-30T12:00:00.000Z";
  const panel: Panel = {
    id: "sp-1",
    dashboard_id: "demo",
    data_source_id: "ds-1",
    title: "Suite Pass Rate",
    widget_type: "suite_progress",
    x: 8,
    y: 5,
    width: 4,
    height: 5,
    config: { good_threshold: 90, warn_threshold: 70 },
    created_at: now,
    updated_at: now,
  };
  const rows: Array<{ suite: string; status: string }> = [
    { suite: "auth", status: "pass" },
    { suite: "auth", status: "pass" },
    { suite: "checkout", status: "pass" },
    { suite: "checkout", status: "fail" },
    { suite: "checkout", status: "fail" },
    { suite: "search", status: "pass" },
    { suite: "search", status: "pass" },
    { suite: "search", status: "pass" },
  ];
  const records: DataRecord[] = rows.map((row, i) => ({
    id: `r${i}`,
    data_source_id: "ds-1",
    payload: {
      test_name: `test_${i + 1}`,
      suite: row.suite,
      status: row.status,
      duration_ms: 200 + i * 50,
    },
    recorded_at: new Date(Date.parse(now) - i * 60_000).toISOString(),
    source_ref: null,
    ingested_via: "manual",
    created_at: now,
  }));
  return { panel, records };
}
