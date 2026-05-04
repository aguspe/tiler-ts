import { createElement } from "react";
import { defineWidget } from "@aguspe/tiler-core";
import { z } from "zod";

const FlakyTestsConfig = z.object({
  window: z.number().int().positive().default(30),
});

defineWidget({
  meta: {
    type: "flaky_tests",
    label: "Flaky Tests",
    description: "Headline count of flaky tests in the latest window.",
    requires_data_source: true,
    default_size: { w: 6, h: 4 },
    min_size: { w: 3, h: 2 },
    max_size: { w: 12, h: 6 },
  },
  configSchema: FlakyTestsConfig,
  resolve: ({ records }) => {
    const flaky = records.filter((r) => r.payload.status === "fail").length;
    return { resolved: flaky, empty: records.length === 0 };
  },
  component: ({ data }) =>
    createElement(
      "div",
      { style: { padding: 16, fontSize: 32, fontWeight: 600 } },
      data.empty ? "—" : `${data.resolved} flaky`,
    ),
  example: () => ({
    panel: {
      id: "ex",
      dashboard_id: "ex",
      data_source_id: "ex",
      title: "Flaky",
      widget_type: "flaky_tests",
      x: 0,
      y: 0,
      width: 6,
      height: 4,
      config: { window: 30 },
      created_at: "2026-05-03T00:00:00.000Z",
      updated_at: "2026-05-03T00:00:00.000Z",
    },
    records: [],
  }),
});
