import { defineWidget } from "@aguspe/tiler-core";
import { ListWidget } from "./ListWidget";
import { ListExample } from "./example";
import { resolveList } from "./resolve";
import { ListConfig } from "./schema";

defineWidget({
  meta: {
    type: "list",
    label: "List",
    description: "Recent records as a column-projected table.",
    requires_data_source: true,
    default_size: { w: 4, h: 4 },
    min_size: { w: 2, h: 2 },
    max_size: { w: 12, h: 12 },
  },
  configSchema: ListConfig,
  resolve: resolveList,
  component: ListWidget,
  example: ListExample,
});

export { ListConfig, ListWidget, ListExample, resolveList };
