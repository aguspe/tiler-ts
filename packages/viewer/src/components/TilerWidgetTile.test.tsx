import "@aguspe/tiler-widgets";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TilerWidgetTile } from "./TilerWidgetTile";

const NOW = "2026-04-30T12:00:00.000Z";
const PANEL = {
  id: "p1",
  dashboard_id: "d1",
  data_source_id: null,
  title: "Build clock",
  widget_type: "clock",
  x: 0,
  y: 0,
  width: 3,
  height: 2,
  config: { format: "24h", timezone: "UTC", show_seconds: false },
  created_at: NOW,
  updated_at: NOW,
};

describe("TilerWidgetTile", () => {
  it("renders the panel title and the widget component", () => {
    render(<TilerWidgetTile panel={PANEL} data={{ resolved: null, empty: false }} />);
    expect(screen.getByText("Build clock")).toBeInTheDocument();
  });

  it("renders an unknown-widget placeholder when widget_type is not registered", () => {
    render(
      <TilerWidgetTile
        panel={{ ...PANEL, widget_type: "weather" }}
        data={{ resolved: null, empty: false }}
      />,
    );
    expect(screen.getByText(/Unknown widget: weather/)).toBeInTheDocument();
  });
});
