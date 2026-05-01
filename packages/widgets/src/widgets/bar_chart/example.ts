import type { DataRecord, Panel } from "@aguspe/tiler-core";

export function BarChartExample(): { panel: Panel; records: DataRecord[] } {
  const now = "2026-04-30T12:00:00.000Z";
  const panel: Panel = {
    id: "bc-1",
    dashboard_id: "demo",
    data_source_id: "ds-1",
    title: "Failures by suite (24h)",
    widget_type: "bar_chart",
    x: 0,
    y: 0,
    width: 6,
    height: 3,
    config: {
      group_column: "suite",
      aggregation: "count",
      filter: { status: "fail" },
      time_window: "24h",
      orientation: "vertical",
    },
    created_at: now,
    updated_at: now,
  };
  const suites = ["checkout", "auth", "search", "billing", "profile"];
  const records: DataRecord[] = suites.flatMap((suite, i) =>
    Array.from({ length: 5 + i * 3 }, (_, j) => ({
      id: `${suite}-${j}`,
      data_source_id: "ds-1",
      payload: { suite, status: j % 2 === 0 ? "fail" : "pass" },
      recorded_at: new Date(Date.parse(now) - j * 30 * 60_000).toISOString(),
      source_ref: null,
      ingested_via: "webhook" as const,
      created_at: now,
    })),
  );
  return { panel, records };
}
