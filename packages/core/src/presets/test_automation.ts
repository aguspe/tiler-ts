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
    description: "Playwright run report — timeline, per-test results, suite pass-rates.",
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
      { key: "error_message", type: "string" },
      { key: "screenshot_data", type: "string" },
      { key: "file", type: "string" },
      { key: "line", type: "integer" },
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
  ): Panel => ({
    id: newId(),
    dashboard_id: dashboard.id,
    data_source_id: sourceId,
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
    // Row 0 (y=0, h=4): Allure-style overview — donut chart + summary strip
    panel("Status Distribution", "pie_chart", 0, 0, 4, 4, {
      group_column: "status",
      aggregation: "count",
      time_window: "all",
      donut: true,
      palette_map: {
        pass: "#10b981",
        fail: "#ef4444",
        skip: "#f59e0b",
      },
    }),
    panel("Total Tests", "metric", 4, 0, 2, 2, {
      aggregation: "count",
      time_window: "all",
    }),
    panel("Passed", "metric", 6, 0, 2, 2, {
      aggregation: "count",
      time_window: "all",
      filter: { status: "pass" },
      color: "#10b981",
    }),
    panel("Failed", "metric", 4, 2, 2, 2, {
      aggregation: "count",
      time_window: "all",
      filter: { status: "fail" },
      color: "#ef4444",
    }),
    panel("Skipped", "metric", 6, 2, 2, 2, {
      aggregation: "count",
      time_window: "all",
      filter: { status: "skip" },
      color: "#f59e0b",
    }),
    panel("Pass Rate", "pass_rate", 8, 0, 4, 4, {
      good_threshold: 90,
      warn_threshold: 70,
    }),
    // Row 1 (y=4, h=3): duration timeline
    panel("Test Duration Timeline", "test_timeline", 0, 4, 12, 3, {
      limit: 50,
    }),
    // Row 2 (y=7, h=5): test list + suite progress
    panel("All Tests", "test_list", 0, 7, 8, 5, {
      limit: 200,
      show_failures_only: false,
    }),
    panel("Suite Pass Rate", "suite_progress", 8, 7, 4, 5, {
      good_threshold: 90,
      warn_threshold: 70,
    }),
  ];

  return { dashboard, dataSources: [source], panels };
}
