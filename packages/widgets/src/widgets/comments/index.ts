import { defineWidget } from "@aguspe/tiler-core";
import { CommentsWidget } from "./CommentsWidget";
import { CommentsExample } from "./example";
import { resolveComments } from "./resolve";
import { CommentsConfig } from "./schema";

defineWidget({
  meta: {
    type: "comments",
    label: "Comments",
    description: "Vertical list of records as comments with author and timestamp.",
    requires_data_source: true,
    default_size: { w: 4, h: 4 },
    min_size: { w: 2, h: 2 },
    max_size: { w: 12, h: 12 },
  },
  configSchema: CommentsConfig,
  resolve: resolveComments,
  component: CommentsWidget,
  example: CommentsExample,
});

export { CommentsConfig, CommentsWidget, CommentsExample, resolveComments };
