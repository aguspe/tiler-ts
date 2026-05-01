import type { Dashboard } from "../schema/dashboard";
import type { DataSource } from "../schema/data_source";
import type { Panel } from "../schema/panel";
import { newId } from "../ulid";
import type { PresetOptions, PresetOutput } from "./types";

export function testAutomationPreset(opts: PresetOptions = {}): PresetOutput {
  const now = opts.now ?? new Date();
  const iso = now.toISOString();
  const slug = opts.slug ?? "test_automation";

  const dashboard: Dashboard = {
    id: newId(),
    name: "Test Automation",
    slug,
    description: "QA cockpit — pass rate, suite breakdown, recent runs.",
    refresh_seconds: 0,
    settings: { tv_mode: false },
    created_at: iso,
    updated_at: iso,
  };

  const sourceId = newId();
  const source: DataSource = {
    id: sourceId,
    name: "Test Runs",
    slug: "test_runs",
    description: "One record per test execution.",
    schema_definition: [
      { key: "suite", type: "string" },
      { key: "test_name", type: "string" },
      { key: "status", type: "string" },
      { key: "duration_ms", type: "float" },
      { key: "environment", type: "string" },
    ],
    ingestion_methods: ["webhook", "manual"],
    webhook_token: null,
    active: true,
    created_at: iso,
    updated_at: iso,
  };

  const panel = (
    title: string,
    widget_type: string,
    x: number,
    y: number,
    width: number,
    height: number,
    config: Record<string, unknown>,
    data_source_id: string | null = sourceId,
  ): Panel => ({
    id: newId(),
    dashboard_id: dashboard.id,
    data_source_id,
    title,
    widget_type,
    x,
    y,
    width,
    height,
    config,
    created_at: iso,
    updated_at: iso,
  });

  const panels: Panel[] = [
    // Row 0: top stats
    panel("Total runs (24h)", "metric", 0, 0, 3, 2, {
      aggregation: "count",
      time_window: "24h",
    }),
    panel("Failures (24h)", "number_with_delta", 3, 0, 3, 2, {
      aggregation: "count",
      time_window: "24h",
      delta_window: "24h",
      sparkline_bucket: "1h",
      filter: { status: "fail" },
      color: "#ef4444",
    }),
    panel("Avg duration (ms)", "metric", 6, 0, 3, 2, {
      value_column: "duration_ms",
      aggregation: "avg",
      time_window: "24h",
      suffix: " ms",
    }),
    panel(
      "Build clock",
      "clock",
      9,
      0,
      3,
      2,
      { format: "24h", timezone: "UTC", show_seconds: false },
      null,
    ),
    // Row 1: pie + line trend
    panel("Status breakdown (24h)", "pie_chart", 0, 2, 6, 3, {
      group_column: "status",
      aggregation: "count",
      time_window: "24h",
      palette: ["#10b981", "#f59e0b", "#ef4444", "#6b7280"],
    }),
    panel("Avg duration trend (7d)", "line_chart", 6, 2, 6, 3, {
      value_column: "duration_ms",
      aggregation: "avg",
      time_window: "7d",
      bucket: "1d",
    }),
    // Row 2: status grid
    panel("Per-suite status (24h)", "status_grid", 0, 5, 12, 3, {
      group_column: "suite",
      status_column: "status",
      time_window: "24h",
    }),
    // Row 3: bar + list
    panel("Failures by suite (24h)", "bar_chart", 0, 8, 6, 3, {
      group_column: "suite",
      aggregation: "count",
      time_window: "24h",
      filter: { status: "fail" },
    }),
    panel("Recent failures (24h)", "list", 6, 8, 6, 3, {
      columns: ["test_name", "suite", "duration_ms"],
      time_window: "24h",
      filter: { status: "fail" },
      limit: 10,
      order_by: "recorded_at_desc",
    }),
  ];

  return { dashboard, dataSources: [source], panels };
}
