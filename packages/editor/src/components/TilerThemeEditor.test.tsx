import type { Dashboard } from "@aguspe/tiler-core";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { TilerApiClient } from "../api/client";
import { createEditorStore } from "../state/editor-store";
import { TilerThemeEditor } from "./TilerThemeEditor";

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

const mockApi: TilerApiClient = {
  upsertPanel: vi.fn(),
  deletePanel: vi.fn(),
  patchDashboard: vi.fn().mockResolvedValue(DASHBOARD),
};

describe("TilerThemeEditor", () => {
  it("renders 4 color inputs (one per token)", () => {
    const store = createEditorStore({ dashboard: DASHBOARD, panels: [] });
    render(<TilerThemeEditor store={store} api={mockApi} />);
    expect(screen.getByLabelText("Page background")).toBeInTheDocument();
    expect(screen.getByLabelText("Tile background")).toBeInTheDocument();
    expect(screen.getByLabelText("Tile header")).toBeInTheDocument();
    expect(screen.getByLabelText("Gutter")).toBeInTheDocument();
  });

  it("changing a token updates the store", () => {
    const store = createEditorStore({ dashboard: DASHBOARD, panels: [] });
    render(<TilerThemeEditor store={store} api={mockApi} />);
    const pageInput = screen.getByLabelText("Page background") as HTMLInputElement;
    fireEvent.change(pageInput, { target: { value: "#112233" } });
    expect(store.getState().dashboard.settings.theme?.page).toBe("#112233");
  });

  it("Save button is disabled when not dirty and enabled when dirty", () => {
    const store = createEditorStore({ dashboard: DASHBOARD, panels: [] });
    const { rerender } = render(<TilerThemeEditor store={store} api={mockApi} />);
    expect(screen.getByText("Save theme")).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Page background"), { target: { value: "#445566" } });
    rerender(<TilerThemeEditor store={store} api={mockApi} />);
    expect(screen.getByText("Save theme")).not.toBeDisabled();
  });
});
