import { defineWidget } from "@aguspe/tiler-core";
import { MetricWidget } from "./MetricWidget";
import { MetricExample } from "./example";
import { resolveMetric } from "./resolve";
import { MetricConfig } from "./schema";

defineWidget({
  meta: {
    type: "metric",
    label: "Metric",
    description: "Single aggregated number with optional prefix / suffix.",
    requires_data_source: true,
    default_size: { w: 3, h: 2 },
    min_size: { w: 2, h: 2 },
    max_size: { w: 12, h: 4 },
  },
  configSchema: MetricConfig,
  resolve: resolveMetric,
  component: MetricWidget,
  example: MetricExample,
});

export { MetricConfig, MetricWidget, MetricExample, resolveMetric };
