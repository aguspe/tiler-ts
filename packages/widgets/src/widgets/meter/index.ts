import { defineWidget } from "@aguspe/tiler-core";
import { MeterExample } from "./example";
import { MeterWidget } from "./MeterWidget";
import { resolveMeter } from "./resolve";
import { MeterConfig } from "./schema";

defineWidget({
  meta: {
    type: "meter",
    label: "Meter",
    description: "Semicircle gauge with optional target marker.",
    requires_data_source: true,
    default_size: { w: 3, h: 2 },
    min_size: { w: 2, h: 2 },
    max_size: { w: 12, h: 4 },
  },
  configSchema: MeterConfig,
  resolve: resolveMeter,
  component: MeterWidget,
  example: MeterExample,
});

export { MeterConfig, MeterWidget, MeterExample, resolveMeter };
