import { defineWidget } from "@aguspe/tiler-core";
import { PassRateWidget } from "./PassRateWidget";
import { PassRateExample } from "./example";
import { resolvePassRate } from "./resolve";
import { PassRateConfig } from "./schema";

defineWidget({
  meta: {
    type: "pass_rate",
    label: "Pass Rate",
    description: "Percentage of records with a passing status, coloured by threshold.",
    requires_data_source: true,
    default_size: { w: 3, h: 2 },
    min_size: { w: 2, h: 2 },
    max_size: { w: 12, h: 4 },
  },
  configSchema: PassRateConfig,
  resolve: resolvePassRate,
  component: PassRateWidget,
  example: PassRateExample,
});

export { PassRateConfig, PassRateWidget, PassRateExample, resolvePassRate };
