import { defineWidget } from "@aguspe/tiler-core";
import { ImageExample } from "./example";
import { ImageWidget } from "./ImageWidget";
import { ImageConfig } from "./schema";

defineWidget({
  meta: {
    type: "image",
    label: "Image",
    description: "Static image. URLs must be https or relative.",
    requires_data_source: false,
    default_size: { w: 4, h: 3 },
    min_size: { w: 1, h: 1 },
    max_size: { w: 12, h: 12 },
  },
  configSchema: ImageConfig,
  component: ImageWidget,
  example: ImageExample,
});

export { ImageConfig, ImageWidget, ImageExample };
