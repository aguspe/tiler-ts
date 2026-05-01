import "@aguspe/tiler-widgets";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TilerDashboardViewer } from "./TilerDashboardViewer";

const NOW = "2026-04-30T12:00:00.000Z";

const SNAPSHOT = {
  version: 1 as const,
  generated_at: NOW,
  dashboard: {
    id: "d1",
    name: "QA",
    slug: "qa",
    description: null,
    refresh_seconds: 0,
    settings: { tv_mode: false },
    created_at: NOW,
    updated_at: NOW,
  },
  panels: [
    {
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
    },
  ],
  data_sources: [],
  records: [],
  resolved: { p1: { resolved: null, empty: false } },
};

describe("TilerDashboardViewer", () => {
  it("renders the dashboard name and each panel as a tile", () => {
    render(<TilerDashboardViewer snapshot={SNAPSHOT} />);
    expect(screen.getByRole("heading", { name: "QA" })).toBeInTheDocument();
    expect(screen.getByText("Build clock")).toBeInTheDocument();
  });
});
