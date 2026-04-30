import type { Panel } from "@aguspe/tiler-core";

export function ImageExample(): { panel: Panel; records: never[] } {
  const now = "2026-04-30T12:00:00.000Z";
  const panel: Panel = {
    id: "image-1",
    dashboard_id: "demo",
    data_source_id: null,
    title: "Logo",
    widget_type: "image",
    x: 0,
    y: 0,
    width: 4,
    height: 3,
    config: {
      url: "https://aguspe.github.io/tiler-ts/assets/logo.png",
      alt: "tiler-ts logo",
      fit: "contain",
    },
    created_at: now,
    updated_at: now,
  };
  return { panel, records: [] };
}
