import type { Panel } from "@aguspe/tiler-core";

export function TextExample(): { panel: Panel; records: never[] } {
  const now = "2026-04-30T12:00:00.000Z";
  const panel: Panel = {
    id: "text-1",
    dashboard_id: "demo",
    data_source_id: null,
    title: "Notes",
    widget_type: "text",
    x: 0,
    y: 0,
    width: 4,
    height: 3,
    config: {
      markdown: "## Sprint 12\n\nFollow [docs](https://example.com).",
      align: "left",
    },
    created_at: now,
    updated_at: now,
  };
  return { panel, records: [] };
}
