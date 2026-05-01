import { defineWidget } from "@aguspe/tiler-core";
import { StatusGridExample } from "./example";
import { resolveStatusGrid } from "./resolve";
import { StatusGridConfig } from "./schema";
import { StatusGridWidget } from "./StatusGridWidget";

defineWidget({
  meta: {
    type: "status_grid",
    label: "Status grid",
    description: "Grid of cells colored by latest status per group_column value.",
    requires_data_source: true,
    default_size: { w: 6, h: 3 },
    min_size: { w: 2, h: 2 },
    max_size: { w: 12, h: 12 },
  },
  configSchema: StatusGridConfig,
  resolve: resolveStatusGrid,
  component: StatusGridWidget,
  example: StatusGridExample,
});

export { StatusGridConfig, StatusGridWidget, StatusGridExample, resolveStatusGrid };
