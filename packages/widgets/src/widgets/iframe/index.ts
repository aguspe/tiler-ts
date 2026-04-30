import { defineWidget } from "@aguspe/tiler-core";
import { IframeExample } from "./example";
import { IframeWidget } from "./IframeWidget";
import { IframeConfig } from "./schema";

defineWidget({
  meta: {
    type: "iframe",
    label: "Iframe",
    description: "Embed an external URL with a sandbox allowlist.",
    requires_data_source: false,
    default_size: { w: 6, h: 4 },
    min_size: { w: 2, h: 2 },
    max_size: { w: 12, h: 12 },
  },
  configSchema: IframeConfig,
  component: IframeWidget,
  example: IframeExample,
});

export { IframeConfig, IframeWidget, IframeExample };
