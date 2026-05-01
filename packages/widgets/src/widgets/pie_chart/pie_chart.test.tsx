import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PieChartExample } from "./example";
import { PieChartWidget } from "./PieChartWidget";
import { resolvePieChart } from "./resolve";

describe("resolvePieChart", () => {
  it("returns one slice per status, all with count > 0", () => {
    const { panel, records } = PieChartExample();
    const result = resolvePieChart({
      panel,
      records,
      now: new Date("2026-04-30T12:00:00.000Z"),
    });
    expect(result.resolved.bars.length).toBe(4);
    expect(result.resolved.bars.every((b) => b.v > 0)).toBe(true);
  });
});

describe("PieChartWidget", () => {
  it("renders empty state", () => {
    const { panel } = PieChartExample();
    render(<PieChartWidget panel={panel} data={{ resolved: { bars: [] }, empty: true }} />);
    expect(screen.getByText("No data in window.")).toBeInTheDocument();
  });
});
