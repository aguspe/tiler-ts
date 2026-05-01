import "@aguspe/tiler-widgets";
import { type Dashboard, type Panel } from "@aguspe/tiler-core";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import type { TilerApiClient } from "../api/client";
import { createEditorStore } from "../state/editor-store";
import { TilerEditableTile } from "./TilerEditableTile";

const NOW = "2026-01-01T00:00:00.000Z";
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

const mockApi: TilerApiClient = {
  upsertPanel: vi.fn().mockResolvedValue(PANEL),
  deletePanel: vi.fn().mockResolvedValue(undefined),
  patchDashboard: vi.fn(),
};

let confirmSpy: Mock;
beforeEach(() => {
  confirmSpy = vi.fn().mockReturnValue(true);
  Object.defineProperty(window, "confirm", { value: confirmSpy, configurable: true });
  (mockApi.deletePanel as Mock).mockClear();
  (mockApi.upsertPanel as Mock).mockClear();
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe("TilerEditableTile", () => {
  it("renders the panel via TilerWidgetTile", () => {
    const store = createEditorStore({ dashboard: DASHBOARD, panels: [PANEL] });
    render(<TilerEditableTile panel={PANEL} data={{ resolved: null, empty: false }} store={store} api={mockApi} />);
    expect(screen.getByText("Build clock")).toBeInTheDocument();
  });

  it("double-click on the body opens an inline title editor", () => {
    const store = createEditorStore({ dashboard: DASHBOARD, panels: [PANEL] });
    const { container } = render(
      <TilerEditableTile panel={PANEL} data={{ resolved: null, empty: false }} store={store} api={mockApi} />,
    );
    fireEvent.doubleClick(screen.getByText("Build clock"));
    expect(container.querySelector('input[type="text"]')).toBeTruthy();
  });

  it("Enter on the title input commits the new title to the store", () => {
    const store = createEditorStore({ dashboard: DASHBOARD, panels: [PANEL] });
    const { container } = render(
      <TilerEditableTile panel={PANEL} data={{ resolved: null, empty: false }} store={store} api={mockApi} />,
    );
    fireEvent.doubleClick(screen.getByText("Build clock"));
    const input = container.querySelector('input[type="text"]')!;
    fireEvent.change(input, { target: { value: "New title" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(store.getState().panels[0]?.title).toBe("New title");
  });

  it("delete button asks for confirmation, calls api, and removes from store", async () => {
    const store = createEditorStore({ dashboard: DASHBOARD, panels: [PANEL] });
    render(
      <TilerEditableTile panel={PANEL} data={{ resolved: null, empty: false }} store={store} api={mockApi} />,
    );
    const deleteBtn = screen.getByRole("button", { name: /Delete panel/i });
    fireEvent.click(deleteBtn);
    expect(confirmSpy).toHaveBeenCalled();
    expect(store.getState().panels).toHaveLength(0);
    // api.deletePanel is async; just verify the call shape
    expect(mockApi.deletePanel).toHaveBeenCalledWith("p1");
  });

  it("clicking the body opens the drawer", () => {
    const store = createEditorStore({ dashboard: DASHBOARD, panels: [PANEL] });
    render(
      <TilerEditableTile panel={PANEL} data={{ resolved: null, empty: false }} store={store} api={mockApi} />,
    );
    fireEvent.click(screen.getByText("Build clock"));
    expect(store.getState().drawerPanelId).toBe("p1");
  });
});
