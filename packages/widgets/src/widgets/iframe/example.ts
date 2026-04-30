import type { Panel } from "@aguspe/tiler-core";

export function IframeExample(): { panel: Panel; records: never[] } {
  const now = "2026-04-30T12:00:00.000Z";
  const panel: Panel = {
    id: "iframe-1",
    dashboard_id: "demo",
    data_source_id: null,
    title: "Embedded view",
    widget_type: "iframe",
    x: 0,
    y: 0,
    width: 6,
    height: 4,
    config: {
      url: "https://aguspe.github.io/tiler-ts/embedded.html",
      sandbox: ["allow-scripts"],
      allow: [],
    },
    created_at: now,
    updated_at: now,
  };
  return { panel, records: [] };
}
