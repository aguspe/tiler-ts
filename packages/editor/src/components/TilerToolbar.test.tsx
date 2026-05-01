import type { Dashboard, Panel } from "@aguspe/tiler-core";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TilerApiClient } from "../api/client";
import { createEditorStore } from "../state/editor-store";
import { TilerToolbar } from "./TilerToolbar";

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

let mockApi: TilerApiClient;

beforeEach(() => {
  mockApi = {
    upsertPanel: vi.fn().mockResolvedValue(PANEL),
    deletePanel: vi.fn(),
    patchDashboard: vi.fn().mockResolvedValue(DASHBOARD),
  };
});
afterEach(() => vi.restoreAllMocks());

const RENDER_PROPS = {
  paletteOpen: true,
  onTogglePalette: () => {},
  themeEditorOpen: false,
  onToggleThemeEditor: () => {},
};

describe("TilerToolbar", () => {
  it("renders the dashboard name", () => {
    const store = createEditorStore({ dashboard: DASHBOARD, panels: [] });
    render(<TilerToolbar store={store} api={mockApi} {...RENDER_PROPS} />);
    expect(screen.getByText("QA")).toBeInTheDocument();
  });

  it("Save button is disabled when not dirty", () => {
    const store = createEditorStore({ dashboard: DASHBOARD, panels: [] });
    render(<TilerToolbar store={store} api={mockApi} {...RENDER_PROPS} />);
    expect(screen.getByLabelText("Save")).toBeDisabled();
  });

  it("Save button enables once the store is dirty + clicking it patches dashboard + upserts panels", async () => {
    const store = createEditorStore({ dashboard: DASHBOARD, panels: [PANEL] });
    store.getState().setPanelTitle("p1", "X");
    const { rerender } = render(<TilerToolbar store={store} api={mockApi} {...RENDER_PROPS} />);
    rerender(<TilerToolbar store={store} api={mockApi} {...RENDER_PROPS} />);
    const save = screen.getByLabelText("Save");
    expect(save).not.toBeDisabled();
    fireEvent.click(save);
    // Wait one microtask for the async handler
    await Promise.resolve();
    await Promise.resolve();
    expect(mockApi.patchDashboard).toHaveBeenCalled();
    expect(mockApi.upsertPanel).toHaveBeenCalled();
  });

  it("Undo button is disabled when undoStack is empty", () => {
    const store = createEditorStore({ dashboard: DASHBOARD, panels: [] });
    render(<TilerToolbar store={store} api={mockApi} {...RENDER_PROPS} />);
    expect(screen.getByLabelText("Undo (Cmd+Z)")).toBeDisabled();
  });

  it("TV mode button toggles the store flag", () => {
    const store = createEditorStore({ dashboard: DASHBOARD, panels: [] });
    render(<TilerToolbar store={store} api={mockApi} {...RENDER_PROPS} />);
    fireEvent.click(screen.getByLabelText("Toggle TV mode"));
    expect(store.getState().dashboard.settings.tv_mode).toBe(true);
  });

  it("Cmd+Z triggers undo", () => {
    const store = createEditorStore({ dashboard: DASHBOARD, panels: [PANEL] });
    store.getState().setPanelTitle("p1", "X");
    expect(store.getState().panels[0]?.title).toBe("X");
    render(<TilerToolbar store={store} api={mockApi} {...RENDER_PROPS} />);
    fireEvent.keyDown(document, { key: "z", metaKey: true });
    expect(store.getState().panels[0]?.title).toBe("Build clock");
  });

  it("double-click on the dashboard name opens an inline editor", () => {
    const store = createEditorStore({ dashboard: DASHBOARD, panels: [] });
    render(<TilerToolbar store={store} api={mockApi} {...RENDER_PROPS} />);
    fireEvent.doubleClick(screen.getByText("QA"));
    const input = screen.getByLabelText("Dashboard name") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "QA Renamed" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(store.getState().dashboard.name).toBe("QA Renamed");
  });
});

