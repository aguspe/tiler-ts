import { definePlaywrightConfig, type PlaywrightTilerConfig } from "@aguspe/tiler-playwright";

/**
 * Factory: build a `definePlaywrightConfig`-shaped dashboard with the same
 * panel layout as the built-in `test_automation` preset, bound to a custom
 * data source slug so each tenant has its own record stream.
 */
export function playwrightDashboard(opts: {
  slug: string;
  name: string;
  description?: string;
  sourceSlug: string;
  sourceName?: string;
}): PlaywrightTilerConfig {
  const sourceName = opts.sourceName ?? `${opts.name} Runs`;
  const sslug = opts.sourceSlug;

  return definePlaywrightConfig({
    dashboard: {
      slug: opts.slug,
      name: opts.name,
      description: opts.description ?? `Playwright run report for ${opts.name}`,
    },
    dataSources: [
      {
        source: {
          name: sourceName,
          slug: sslug,
          description: `One record per test execution against ${opts.name}.`,
          schema_definition: [
            { key: "suite", type: "string" },
            { key: "test_name", type: "string" },
            { key: "status", type: "string" },
            { key: "duration_ms", type: "float" },
            { key: "error_message", type: "string" },
            { key: "screenshot_data", type: "string" },
            { key: "file", type: "string" },
            { key: "line", type: "integer" },
          ],
          ingestion_methods: ["webhook", "manual"],
          webhook_token: null,
          active: true,
        },
      },
    ],
    panels: [
      // Top row: Allure-style overview, donut + 2x2 metrics + pass-rate gauge.
      {
        widget_type: "pie_chart",
        title: "Status Distribution",
        x: 0,
        y: 0,
        width: 4,
        height: 4,
        config: {
          group_column: "status",
          aggregation: "count",
          time_window: "all",
          donut: true,
          palette_map: { pass: "#10b981", fail: "#ef4444", skip: "#f59e0b" },
        },
        data_source_slug: sslug,
      },
      {
        widget_type: "metric",
        title: "Total Tests",
        x: 4,
        y: 0,
        width: 2,
        height: 2,
        config: { aggregation: "count", time_window: "all" },
        data_source_slug: sslug,
      },
      {
        widget_type: "metric",
        title: "Passed",
        x: 6,
        y: 0,
        width: 2,
        height: 2,
        config: {
          aggregation: "count",
          time_window: "all",
          filter: { status: "pass" },
          color: "#10b981",
        },
        data_source_slug: sslug,
      },
      {
        widget_type: "metric",
        title: "Failed",
        x: 4,
        y: 2,
        width: 2,
        height: 2,
        config: {
          aggregation: "count",
          time_window: "all",
          filter: { status: "fail" },
          color: "#ef4444",
        },
        data_source_slug: sslug,
      },
      {
        widget_type: "metric",
        title: "Skipped",
        x: 6,
        y: 2,
        width: 2,
        height: 2,
        config: {
          aggregation: "count",
          time_window: "all",
          filter: { status: "skip" },
          color: "#f59e0b",
        },
        data_source_slug: sslug,
      },
      {
        widget_type: "pass_rate",
        title: "Pass Rate",
        x: 8,
        y: 0,
        width: 4,
        height: 4,
        config: { good_threshold: 90, warn_threshold: 70 },
        data_source_slug: sslug,
      },
      // Bottom row: full test list + suite breakdown.
      {
        widget_type: "test_list",
        title: "All Tests",
        x: 0,
        y: 4,
        width: 8,
        height: 5,
        config: { limit: 200, show_failures_only: false },
        data_source_slug: sslug,
      },
      {
        widget_type: "suite_progress",
        title: "Suite Pass Rate",
        x: 8,
        y: 4,
        width: 4,
        height: 5,
        config: { good_threshold: 90, warn_threshold: 70 },
        data_source_slug: sslug,
      },
    ],
  });
}
