import type { Panel, WidgetData } from "@aguspe/tiler-core";
import { IframeConfig } from "./schema";

export function IframeWidget({
  panel,
}: {
  panel: Panel;
  data: WidgetData<null>;
}): JSX.Element {
  const cfg = IframeConfig.parse(panel.config);
  return (
    <iframe
      title={panel.title}
      src={cfg.url}
      sandbox={cfg.sandbox.join(" ")}
      allow={cfg.allow.join("; ")}
      referrerPolicy="no-referrer"
      style={{ width: "100%", height: "100%", border: 0 }}
    />
  );
}
