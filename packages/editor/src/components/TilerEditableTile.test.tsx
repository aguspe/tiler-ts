import "@aguspe/tiler-widgets";
import type { Dashboard, Panel } from "@aguspe/tiler-core";
import { fireEvent, render, screen } from "@testing-library/react";
import { type Mock, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TilerApiClient } from "../api/client";
import { createEditorStore } from "../state/editor-store";
import { TilerEditableTile } from "./TilerEditableTile";

// Some FocusLock internals call into selection APIs that jsdom doesn't
// implement. Stub them so the dialog can mount in tests.
if (typeof window !== "undefined") {
  // @ts-expect-error jsdom polyfill
  if (!window.getSelection)
    window.getSelection = () => ({ removeAllRanges: () => {}, addRange: () => {} });
}

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
    render(
      <TilerEditableTile
        panel={PANEL}
        data={{ resolved: null, empty: false }}
        store={store}
        api={mockApi}
      />,
    );
    expect(screen.getByText("Build clock")).toBeInTheDocument();
  });

  it("double-click on the body opens an inline title editor", () => {
    const store = createEditorStore({ dashboard: DASHBOARD, panels: [PANEL] });
    const { container } = render(
      <TilerEditableTile
        panel={PANEL}
        data={{ resolved: null, empty: false }}
        store={store}
        api={mockApi}
      />,
    );
    fireEvent.doubleClick(screen.getByText("Build clock"));
    expect(container.querySelector('input[type="text"]')).toBeTruthy();
  });

  it("Enter on the title input commits the new title to the store", () => {
    const store = createEditorStore({ dashboard: DASHBOARD, panels: [PANEL] });
    const { container } = render(
      <TilerEditableTile
        panel={PANEL}
        data={{ resolved: null, empty: false }}
        store={store}
        api={mockApi}
      />,
    );
    fireEvent.doubleClick(screen.getByText("Build clock"));
    const input = container.querySelector('input[type="text"]')!;
    fireEvent.change(input, { target: { value: "New title" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(store.getState().panels[0]?.title).toBe("New title");
  });

  it("delete button opens a confirm dialog; confirming removes the panel and calls the api", () => {
    const store = createEditorStore({ dashboard: DASHBOARD, panels: [PANEL] });
    render(
      <TilerEditableTile
        panel={PANEL}
        data={{ resolved: null, empty: false }}
        store={store}
        api={mockApi}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Delete panel/i }));
    // The dialog mounts with a "Delete" button distinct from the panel-action.
    const confirm = screen.getByRole("button", { name: /^Delete$/ });
    fireEvent.click(confirm);
    expect(store.getState().panels).toHaveLength(0);
    expect(mockApi.deletePanel).toHaveBeenCalledWith("p1");
  });

  it("delete dialog Cancel keeps the panel intact", () => {
    const store = createEditorStore({ dashboard: DASHBOARD, panels: [PANEL] });
    render(
      <TilerEditableTile
        panel={PANEL}
        data={{ resolved: null, empty: false }}
        store={store}
        api={mockApi}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Delete panel/i }));
    fireEvent.click(screen.getByRole("button", { name: /Cancel/ }));
    expect(store.getState().panels).toHaveLength(1);
    expect(mockApi.deletePanel).not.toHaveBeenCalled();
  });

  it("clicking the body opens the drawer", () => {
    const store = createEditorStore({ dashboard: DASHBOARD, panels: [PANEL] });
    render(
      <TilerEditableTile
        panel={PANEL}
        data={{ resolved: null, empty: false }}
        store={store}
        api={mockApi}
      />,
    );
    fireEvent.click(screen.getByText("Build clock"));
    expect(store.getState().drawerPanelId).toBe("p1");
  });
});
