import "@aguspe/tiler-widgets";
import type { Dashboard, DataSource, Panel } from "@aguspe/tiler-core";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TilerDashboardEditor } from "./TilerDashboardEditor";

const NOW = "2026-01-01T00:00:00.000Z";

const DASHBOARD: Dashboard = {
  id: "d1",
  name: "QA",
  slug: "qa",
  description: null,
  refresh_seconds: 0,
  settings: { tv_mode: false },
  created_at: NOW,
  updated_at: NOW,
};

const PANEL: Panel = {
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

const DATA_SOURCES: DataSource[] = [];

describe("TilerDashboardEditor", () => {
  it("renders the page header, tiles, and shows the palette only when Add Panel is toggled", () => {
    render(
      <TilerDashboardEditor
        dashboard={DASHBOARD}
        panels={[PANEL]}
        dataSources={DATA_SOURCES}
      />,
    );
    // Page header shows dashboard name
    expect(screen.getByText("QA")).toBeInTheDocument();
    // Tile title appears in the grid
    expect(screen.getByText("Build clock")).toBeInTheDocument();
    // Palette is hidden by default (parity with the Rails editor)
    expect(screen.queryByText("Clock")).not.toBeInTheDocument();
    // Toggling the Add Panel button reveals the palette
    fireEvent.click(screen.getByLabelText("Toggle palette"));
    expect(screen.getByText("Clock")).toBeInTheDocument();
  });
});
