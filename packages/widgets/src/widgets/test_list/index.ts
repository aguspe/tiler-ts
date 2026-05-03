import { defineWidget } from "@aguspe/tiler-core";
import { TestListWidget } from "./TestListWidget";
import { TestListExample } from "./example";
import { resolveTestList } from "./resolve";
import { TestListConfig } from "./schema";

defineWidget({
  meta: {
    type: "test_list",
    label: "Test List",
    description:
      "Sortable test result rows — failed rows expand to show screenshot and error message.",
    requires_data_source: true,
    default_size: { w: 8, h: 5 },
    min_size: { w: 4, h: 3 },
    max_size: { w: 12, h: 12 },
  },
  configSchema: TestListConfig,
  resolve: resolveTestList,
  component: TestListWidget,
  example: TestListExample,
});

export { TestListConfig, TestListWidget, TestListExample, resolveTestList };
