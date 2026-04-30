import type { Panel, WidgetData } from "@aguspe/tiler-core";
import { ImageConfig } from "./schema";

export function ImageWidget({
  panel,
}: {
  panel: Panel;
  data: WidgetData<null>;
}): JSX.Element {
  const cfg = ImageConfig.parse(panel.config);
  return (
    <img
      src={cfg.url}
      alt={cfg.alt}
      referrerPolicy="no-referrer"
      style={{ width: "100%", height: "100%", objectFit: cfg.fit }}
    />
  );
}
