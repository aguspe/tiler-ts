import { defineWidget } from "@aguspe/tiler-core";
import { BarChartWidget } from "./BarChartWidget";
import { BarChartExample } from "./example";
import { resolveBarChart } from "./resolve";
import { BarChartConfig } from "./schema";

defineWidget({
  meta: {
    type: "bar_chart",
    label: "Bar chart",
    description: "Bar chart by group_column with vertical or horizontal orientation.",
    requires_data_source: true,
    default_size: { w: 6, h: 3 },
    min_size: { w: 3, h: 2 },
    max_size: { w: 12, h: 12 },
  },
  configSchema: BarChartConfig,
  resolve: resolveBarChart,
  component: BarChartWidget,
  example: BarChartExample,
});

export { BarChartConfig, BarChartWidget, BarChartExample, resolveBarChart };
