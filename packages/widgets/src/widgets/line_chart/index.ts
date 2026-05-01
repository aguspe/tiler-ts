import { defineWidget } from "@aguspe/tiler-core";
import { LineChartWidget } from "./LineChartWidget";
import { LineChartExample } from "./example";
import { resolveLineChart } from "./resolve";
import { LineChartConfig } from "./schema";

defineWidget({
  meta: {
    type: "line_chart",
    label: "Line chart",
    description: "Time-series line chart, optionally split by group_column.",
    requires_data_source: true,
    default_size: { w: 6, h: 3 },
    min_size: { w: 3, h: 2 },
    max_size: { w: 12, h: 12 },
  },
  configSchema: LineChartConfig,
  resolve: resolveLineChart,
  component: LineChartWidget,
  example: LineChartExample,
});

export { LineChartConfig, LineChartWidget, LineChartExample, resolveLineChart };
