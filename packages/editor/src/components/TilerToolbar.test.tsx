import type { Dashboard, Panel } from "@aguspe/tiler-core";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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

const RENDER_PROPS = {
  paletteOpen: false,
  onTogglePalette: () => {},
  themeEditorOpen: false,
  onToggleThemeEditor: () => {},
  darkMode: false,
  onToggleDarkMode: () => {},
};

beforeEach(() => {});
afterEach(() => vi.restoreAllMocks());

describe("TilerToolbar", () => {
  it("renders the dashboard name", () => {
    const store = createEditorStore({ dashboard: DASHBOARD, panels: [] });
    render(<TilerToolbar store={store} {...RENDER_PROPS} />);
    expect(screen.getByText("QA")).toBeInTheDocument();
  });

  it("Add Panel button is the primary action and is leftmost in the actions row", () => {
    const store = createEditorStore({ dashboard: DASHBOARD, panels: [] });
    render(<TilerToolbar store={store} {...RENDER_PROPS} />);
    const addBtn = screen.getByLabelText("Toggle palette");
    expect(addBtn).toHaveTextContent("+ Add Panel");
    expect(addBtn).toHaveClass("tiler-btn-primary");
    // Other action buttons render after Add Panel in DOM order.
    const actions = addBtn.parentElement?.querySelectorAll("button");
    expect(actions?.[0]).toBe(addBtn);
  });

  it("does not render a Save button (auto-save replaces it)", () => {
    const store = createEditorStore({ dashboard: DASHBOARD, panels: [PANEL] });
    render(<TilerToolbar store={store} {...RENDER_PROPS} />);
    expect(screen.queryByLabelText("Save")).not.toBeInTheDocument();
  });

  it("Undo button is disabled when undoStack is empty", () => {
    const store = createEditorStore({ dashboard: DASHBOARD, panels: [] });
    render(<TilerToolbar store={store} {...RENDER_PROPS} />);
    expect(screen.getByLabelText("Undo (Cmd+Z)")).toBeDisabled();
  });

  it("TV mode button toggles the store flag", () => {
    const store = createEditorStore({ dashboard: DASHBOARD, panels: [] });
    render(<TilerToolbar store={store} {...RENDER_PROPS} />);
    fireEvent.click(screen.getByLabelText("Toggle TV mode"));
    expect(store.getState().dashboard.settings.tv_mode).toBe(true);
  });

  it("Dark-mode button calls onToggleDarkMode", () => {
    const store = createEditorStore({ dashboard: DASHBOARD, panels: [] });
    const onToggleDarkMode = vi.fn();
    render(
      <TilerToolbar
        store={store}
        {...RENDER_PROPS}
        onToggleDarkMode={onToggleDarkMode}
      />,
    );
    fireEvent.click(screen.getByLabelText("Switch to dark mode"));
    expect(onToggleDarkMode).toHaveBeenCalled();
  });

  it("Cmd+Z triggers undo", () => {
    const store = createEditorStore({ dashboard: DASHBOARD, panels: [PANEL] });
    store.getState().setPanelTitle("p1", "X");
    expect(store.getState().panels[0]?.title).toBe("X");
    render(<TilerToolbar store={store} {...RENDER_PROPS} />);
    fireEvent.keyDown(document, { key: "z", metaKey: true });
    expect(store.getState().panels[0]?.title).toBe("Build clock");
  });

  it("double-click on the dashboard name opens an inline editor", () => {
    const store = createEditorStore({ dashboard: DASHBOARD, panels: [] });
    render(<TilerToolbar store={store} {...RENDER_PROPS} />);
    fireEvent.doubleClick(screen.getByText("QA"));
    const input = screen.getByLabelText("Dashboard name") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "QA Renamed" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(store.getState().dashboard.name).toBe("QA Renamed");
  });
});
