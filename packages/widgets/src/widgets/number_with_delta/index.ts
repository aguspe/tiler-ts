import { defineWidget } from "@aguspe/tiler-core";
import { NumberWithDeltaExample } from "./example";
import { NumberWithDeltaWidget } from "./NumberWithDeltaWidget";
import { resolveNumberWithDelta } from "./resolve";
import { NumberWithDeltaConfig } from "./schema";

defineWidget({
  meta: {
    type: "number_with_delta",
    label: "Number + Delta",
    description: "Big number with delta vs. prior period and a small sparkline.",
    requires_data_source: true,
    default_size: { w: 3, h: 2 },
    min_size: { w: 2, h: 2 },
    max_size: { w: 12, h: 4 },
  },
  configSchema: NumberWithDeltaConfig,
  resolve: resolveNumberWithDelta,
  component: NumberWithDeltaWidget,
  example: NumberWithDeltaExample,
});

export {
  NumberWithDeltaConfig,
  NumberWithDeltaWidget,
  NumberWithDeltaExample,
  resolveNumberWithDelta,
};
