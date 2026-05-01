import "@aguspe/tiler-widgets";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TilerPalette } from "./TilerPalette";

describe("TilerPalette", () => {
  it("renders one entry per registered widget", () => {
    render(<TilerPalette dashboardId="d1" onAdd={() => {}} />);
    // All 14 widgets are registered via the side-effect import.
    const entries = screen.getAllByRole("option");
    expect(entries.length).toBeGreaterThanOrEqual(14);
  });

  it("entries are draggable", () => {
    render(<TilerPalette dashboardId="d1" onAdd={() => {}} />);
    const entries = screen.getAllByRole("option");
    expect(entries[0]?.getAttribute("draggable")).toBe("true");
  });

  it("a clock palette entry is present and labeled", () => {
    render(<TilerPalette dashboardId="d1" onAdd={() => {}} />);
    expect(screen.getByText("Clock")).toBeInTheDocument();
  });

  it("does NOT call onAdd when drag ends outside the .grid-stack container", () => {
    const onAdd = vi.fn();
    render(<TilerPalette dashboardId="d1" onAdd={onAdd} />);
    const clock = screen.getByText("Clock");
    // Simulate dragEnd outside any grid-stack container — onAdd should not fire.
    const event = new Event("dragend") as DragEvent;
    Object.defineProperty(event, "clientX", { value: 0, configurable: true });
    Object.defineProperty(event, "clientY", { value: 0, configurable: true });
    clock.dispatchEvent(event);
    expect(onAdd).not.toHaveBeenCalled();
  });
});
