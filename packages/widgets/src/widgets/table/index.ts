import { defineWidget } from "@aguspe/tiler-core";
import { TableWidget } from "./TableWidget";
import { TableExample } from "./example";
import { resolveTable } from "./resolve";
import { TableConfig } from "./schema";

defineWidget({
  meta: {
    type: "table",
    label: "Table",
    description: "Tabular records with per-column formatting and optional pagination.",
    requires_data_source: true,
    default_size: { w: 6, h: 4 },
    min_size: { w: 3, h: 3 },
    max_size: { w: 12, h: 12 },
  },
  configSchema: TableConfig,
  resolve: resolveTable,
  component: TableWidget,
  example: TableExample,
});

export { TableConfig, TableWidget, TableExample, resolveTable };
