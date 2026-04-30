import { defineWidget } from "@aguspe/tiler-core";
import { ClockWidget } from "./ClockWidget";
import { ClockExample } from "./example";
import { ClockConfig } from "./schema";

defineWidget({
  meta: {
    type: "clock",
    label: "Clock",
    description: "Shows the current time. No data source required.",
    requires_data_source: false,
    default_size: { w: 3, h: 2 },
    min_size: { w: 2, h: 2 },
    max_size: { w: 6, h: 4 },
  },
  configSchema: ClockConfig,
  component: ClockWidget,
  example: ClockExample,
});

export { ClockConfig, ClockWidget, ClockExample };
