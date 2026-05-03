import { defineWidget } from "@aguspe/tiler-core";
import { TestTimelineWidget } from "./TestTimelineWidget";
import { TestTimelineExample } from "./example";
import { resolveTestTimeline } from "./resolve";
import { TestTimelineConfig } from "./schema";

defineWidget({
  meta: {
    type: "test_timeline",
    label: "Test Timeline",
    description: "Horizontal bars per test sorted by duration, coloured by status.",
    requires_data_source: true,
    default_size: { w: 12, h: 3 },
    min_size: { w: 4, h: 2 },
    max_size: { w: 12, h: 8 },
  },
  configSchema: TestTimelineConfig,
  resolve: resolveTestTimeline,
  component: TestTimelineWidget,
  example: TestTimelineExample,
});

export { TestTimelineConfig, TestTimelineWidget, TestTimelineExample, resolveTestTimeline };
