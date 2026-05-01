import type { DataRecord, Panel } from "@aguspe/tiler-core";

export function PieChartExample(): { panel: Panel; records: DataRecord[] } {
  const now = "2026-04-30T12:00:00.000Z";
  const panel: Panel = {
    id: "pc-1",
    dashboard_id: "demo",
    data_source_id: "ds-1",
    title: "Status breakdown (24h)",
    widget_type: "pie_chart",
    x: 0,
    y: 0,
    width: 6,
    height: 3,
    config: {
      group_column: "status",
      aggregation: "count",
      time_window: "24h",
      donut: false,
      palette: ["#10b981", "#f59e0b", "#ef4444", "#6b7280"],
    },
    created_at: now,
    updated_at: now,
  };
  const distribution = [
    { status: "pass", count: 80 },
    { status: "warn", count: 12 },
    { status: "fail", count: 6 },
    { status: "skip", count: 2 },
  ];
  const records: DataRecord[] = distribution.flatMap(({ status, count }) =>
    Array.from({ length: count }, (_, j) => ({
      id: `${status}-${j}`,
      data_source_id: "ds-1",
      payload: { status },
      recorded_at: new Date(Date.parse(now) - j * 60_000).toISOString(),
      source_ref: null,
      ingested_via: "webhook" as const,
      created_at: now,
    })),
  );
  return { panel, records };
}
