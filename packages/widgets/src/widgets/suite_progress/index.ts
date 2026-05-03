import { defineWidget } from "@aguspe/tiler-core";
import { SuiteProgressWidget } from "./SuiteProgressWidget";
import { SuiteProgressExample } from "./example";
import { resolveSuiteProgress } from "./resolve";
import { SuiteProgressConfig } from "./schema";

defineWidget({
  meta: {
    type: "suite_progress",
    label: "Suite Progress",
    description: "Pass-rate progress bar per test suite, sorted worst-first.",
    requires_data_source: true,
    default_size: { w: 4, h: 5 },
    min_size: { w: 2, h: 2 },
    max_size: { w: 12, h: 12 },
  },
  configSchema: SuiteProgressConfig,
  resolve: resolveSuiteProgress,
  component: SuiteProgressWidget,
  example: SuiteProgressExample,
});

export { SuiteProgressConfig, SuiteProgressWidget, SuiteProgressExample, resolveSuiteProgress };
