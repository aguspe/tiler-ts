import type { Dashboard, Panel } from "@aguspe/tiler-core";
import { describe, expect, it } from "vitest";
import { createEditorStore } from "./editor-store";

const NOW = "2026-01-01T00:00:00.000Z";

const PANEL_A: Panel = {
  id: "p1",
  dashboard_id: "d1",
  data_source_id: null,
  title: "A",
  widget_type: "clock",
  x: 0,
  y: 0,
  width: 3,
  height: 2,
  config: {},
  created_at: NOW,
  updated_at: NOW,
};

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

describe("createEditorStore", () => {
  it("hydrates with a dashboard + panels", () => {
    const store = createEditorStore({ dashboard: DASHBOARD, panels: [PANEL_A] });
    expect(store.getState().dashboard.id).toBe("d1");
    expect(store.getState().panels).toHaveLength(1);
    expect(store.getState().dirty).toBe(false);
    expect(store.getState().undoStack).toHaveLength(0);
  });

  it("setPanelLayout marks the store dirty + pushes to undo stack", () => {
    const store = createEditorStore({ dashboard: DASHBOARD, panels: [PANEL_A] });
    store.getState().setPanelLayout("p1", { x: 3, y: 0, width: 6, height: 2 });
    expect(store.getState().panels[0]?.x).toBe(3);
    expect(store.getState().panels[0]?.width).toBe(6);
    expect(store.getState().dirty).toBe(true);
    expect(store.getState().undoStack).toHaveLength(1);
  });

  it("setPanelLayout is a no-op when layout is unchanged", () => {
    const store = createEditorStore({ dashboard: DASHBOARD, panels: [PANEL_A] });
    store.getState().setPanelLayout("p1", { x: 0, y: 0, width: 3, height: 2 });
    expect(store.getState().dirty).toBe(false);
    expect(store.getState().undoStack).toHaveLength(0);
  });

  it("undo restores the previous panel layout", () => {
    const store = createEditorStore({ dashboard: DASHBOARD, panels: [PANEL_A] });
    store.getState().setPanelLayout("p1", { x: 6, y: 0, width: 3, height: 2 });
    store.getState().undo();
    expect(store.getState().panels[0]?.x).toBe(0);
  });

  it("redo re-applies the undone change", () => {
    const store = createEditorStore({ dashboard: DASHBOARD, panels: [PANEL_A] });
    store.getState().setPanelLayout("p1", { x: 6, y: 0, width: 3, height: 2 });
    store.getState().undo();
    store.getState().redo();
    expect(store.getState().panels[0]?.x).toBe(6);
  });

  it("a new mutation after undo clears the redo stack", () => {
    const store = createEditorStore({ dashboard: DASHBOARD, panels: [PANEL_A] });
    store.getState().setPanelLayout("p1", { x: 6, y: 0, width: 3, height: 2 });
    store.getState().undo();
    expect(store.getState().redoStack).toHaveLength(1);
    store.getState().setPanelTitle("p1", "B");
    expect(store.getState().redoStack).toHaveLength(0);
  });

  it("addPanel + removePanel mutate dirty + history", () => {
    const store = createEditorStore({ dashboard: DASHBOARD, panels: [] });
    store.getState().addPanel({ ...PANEL_A, id: "p2" });
    expect(store.getState().panels).toHaveLength(1);
    expect(store.getState().dirty).toBe(true);
    store.getState().removePanel("p2");
    expect(store.getState().panels).toHaveLength(0);
    expect(store.getState().undoStack).toHaveLength(2);
  });

  it("toggleTvMode flips the dashboard.settings.tv_mode flag", () => {
    const store = createEditorStore({ dashboard: DASHBOARD, panels: [] });
    store.getState().toggleTvMode();
    expect(store.getState().dashboard.settings.tv_mode).toBe(true);
    store.getState().toggleTvMode();
    expect(store.getState().dashboard.settings.tv_mode).toBe(false);
  });

  it("setThemeToken sets/clears tokens", () => {
    const store = createEditorStore({ dashboard: DASHBOARD, panels: [] });
    store.getState().setThemeToken("page", "#000");
    expect(store.getState().dashboard.settings.theme?.page).toBe("#000");
    store.getState().setThemeToken("page", undefined);
    expect(store.getState().dashboard.settings.theme?.page).toBeUndefined();
  });

  it("markClean resets dirty to false without touching panels", () => {
    const store = createEditorStore({ dashboard: DASHBOARD, panels: [PANEL_A] });
    store.getState().setPanelLayout("p1", { x: 6, y: 0, width: 3, height: 2 });
    store.getState().markClean();
    expect(store.getState().dirty).toBe(false);
    expect(store.getState().panels[0]?.x).toBe(6);
  });

  it("openDrawer + closeDrawer toggle drawerPanelId", () => {
    const store = createEditorStore({ dashboard: DASHBOARD, panels: [PANEL_A] });
    store.getState().openDrawer("p1");
    expect(store.getState().drawerPanelId).toBe("p1");
    store.getState().closeDrawer();
    expect(store.getState().drawerPanelId).toBeNull();
  });
});
