import type { Dashboard, Panel } from "@aguspe/tiler-core";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { createEditorStore } from "../state/editor-store";
import { TilerHistoryBar } from "./TilerHistoryBar";

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
  config: {},
  created_at: NOW,
  updated_at: NOW,
};

describe("TilerHistoryBar", () => {
  it("disables both buttons when there's no history", () => {
    const store = createEditorStore({ dashboard: DASHBOARD, panels: [] });
    render(<TilerHistoryBar store={store} />);
    expect(screen.getByLabelText("Undo (Cmd+Z)")).toBeDisabled();
    expect(screen.getByLabelText("Redo (Cmd+Shift+Z)")).toBeDisabled();
  });

  it("clicking undo pops the last change off the undo stack", () => {
    const store = createEditorStore({ dashboard: DASHBOARD, panels: [PANEL] });
    store.getState().setPanelTitle("p1", "Renamed");
    expect(store.getState().panels[0]?.title).toBe("Renamed");
    render(<TilerHistoryBar store={store} />);
    fireEvent.click(screen.getByLabelText("Undo (Cmd+Z)"));
    expect(store.getState().panels[0]?.title).toBe("Build clock");
  });
});
