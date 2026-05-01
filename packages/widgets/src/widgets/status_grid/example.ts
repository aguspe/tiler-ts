import type { DataRecord, Panel } from "@aguspe/tiler-core";

export function StatusGridExample(): { panel: Panel; records: DataRecord[] } {
  const now = "2026-04-30T12:00:00.000Z";
  const panel: Panel = {
    id: "sg-1",
    dashboard_id: "demo",
    data_source_id: "ds-1",
    title: "Per-suite status",
    widget_type: "status_grid",
    x: 0,
    y: 0,
    width: 6,
    height: 3,
    config: { group_column: "suite", status_column: "status", time_window: "24h" },
    created_at: now,
    updated_at: now,
  };
  const suites = ["checkout", "auth", "search", "billing", "profile", "settings"];
  const records: DataRecord[] = suites.flatMap((suite, i) =>
    Array.from({ length: 5 }, (_, j) => ({
      id: `${suite}-${j}`,
      data_source_id: "ds-1",
      payload: { suite, status: i % 4 === 0 ? "fail" : i % 4 === 1 ? "warn" : "pass" },
      recorded_at: new Date(Date.parse(now) - (i * 5 + j) * 60_000).toISOString(),
      source_ref: null,
      ingested_via: "webhook" as const,
      created_at: now,
    })),
  );
  return { panel, records };
}
