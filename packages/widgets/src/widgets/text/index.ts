import { defineWidget } from "@aguspe/tiler-core";
import { TextWidget } from "./TextWidget";
import { TextExample } from "./example";
import { TextConfig } from "./schema";

defineWidget({
  meta: {
    type: "text",
    label: "Text",
    description: "Markdown text. Sanitized HTML output.",
    requires_data_source: false,
    default_size: { w: 3, h: 2 },
    min_size: { w: 1, h: 1 },
    max_size: { w: 12, h: 12 },
  },
  configSchema: TextConfig,
  component: TextWidget,
  example: TextExample,
});

export { TextConfig, TextWidget, TextExample };
