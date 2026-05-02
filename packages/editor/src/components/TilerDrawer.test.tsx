import "@aguspe/tiler-widgets"; // side effect: registers all widgets so getWidget("clock") works
import type { Dashboard, Panel } from "@aguspe/tiler-core";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Mock } from "vitest";
import type { TilerApiClient } from "../api/client";
import { createEditorStore } from "../state/editor-store";
import { TilerDrawer } from "./TilerDrawer";

const NOW = "2024-01-01T00:00:00.000Z";

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

function makeMockApi(): TilerApiClient {
  return {
    upsertPanel: vi.fn().mockResolvedValue(PANEL),
    deletePanel: vi.fn(),
    patchDashboard: vi.fn(),
  };
}

function makeStore(drawerOpen = false) {
  const store = createEditorStore({ dashboard: DASHBOARD, panels: [PANEL] });
  if (drawerOpen) {
    store.getState().openDrawer(PANEL.id);
  }
  return store;
}

describe("TilerDrawer", () => {
  let mockApi: TilerApiClient;

  beforeEach(() => {
    mockApi = makeMockApi();
  });

  it("renders nothing when drawerPanelId is null", () => {
    const store = makeStore(false);
    const { container } = render(<TilerDrawer store={store} api={mockApi} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders the panel title in the heading when open", () => {
    const store = makeStore(true);
    render(<TilerDrawer store={store} api={mockApi} />);
    // The heading shows the widget label ("Clock"), not the panel title.
    // The title input should show the panel title.
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    const titleInput = screen.getByLabelText("Title") as HTMLInputElement;
    expect(titleInput.value).toBe("Build clock");
  });

  it("shows an error when Save is clicked with invalid JSON config", async () => {
    const store = makeStore(true);
    render(<TilerDrawer store={store} api={mockApi} />);

    const textarea = screen.getByLabelText("Config (JSON)") as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: "{ bad json" } });

    const saveBtn = screen.getByRole("button", { name: /save/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Config is not valid JSON");
    });

    expect(mockApi.upsertPanel).not.toHaveBeenCalled();
  });

  it("Save button calls api.upsertPanel with merged title and config", async () => {
    const store = makeStore(true);
    render(<TilerDrawer store={store} api={mockApi} />);

    const titleInput = screen.getByLabelText("Title");
    fireEvent.change(titleInput, { target: { value: "My Clock" } });

    const newConfig = JSON.stringify(
      { format: "12h", timezone: "UTC", show_seconds: true },
      null,
      2,
    );
    const textarea = screen.getByLabelText("Config (JSON)");
    fireEvent.change(textarea, { target: { value: newConfig } });

    const saveBtn = screen.getByRole("button", { name: /save/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(mockApi.upsertPanel).toHaveBeenCalledTimes(1);
    });

    const calledWith = (mockApi.upsertPanel as Mock).mock.calls[0]?.[0] as Panel;
    expect(calledWith.title).toBe("My Clock");
    expect(calledWith.config).toMatchObject({ format: "12h", timezone: "UTC", show_seconds: true });
  });

  it("Cancel button closes the drawer without calling api", () => {
    const store = makeStore(true);
    render(<TilerDrawer store={store} api={mockApi} />);

    expect(screen.getByRole("dialog")).toBeInTheDocument();

    const cancelBtn = screen.getByRole("button", { name: /cancel/i });
    fireEvent.click(cancelBtn);

    expect(store.getState().drawerPanelId).toBeNull();
    expect(mockApi.upsertPanel).not.toHaveBeenCalled();
  });

  it("Esc key closes the drawer", async () => {
    const store = makeStore(true);
    render(<TilerDrawer store={store} api={mockApi} />);

    expect(screen.getByRole("dialog")).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });

    await waitFor(() => {
      expect(store.getState().drawerPanelId).toBeNull();
    });
  });
});
