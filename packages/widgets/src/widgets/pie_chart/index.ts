import { defineWidget } from "@aguspe/tiler-core";
import { PieChartWidget } from "./PieChartWidget";
import { PieChartExample } from "./example";
import { resolvePieChart } from "./resolve";
import { PieChartConfig } from "./schema";

defineWidget({
  meta: {
    type: "pie_chart",
    label: "Pie chart",
    description: "Pie / donut chart by group_column.",
    requires_data_source: true,
    default_size: { w: 6, h: 3 },
    min_size: { w: 3, h: 3 },
    max_size: { w: 12, h: 12 },
  },
  configSchema: PieChartConfig,
  resolve: resolvePieChart,
  component: PieChartWidget,
  example: PieChartExample,
});

export { PieChartConfig, PieChartWidget, PieChartExample, resolvePieChart };
