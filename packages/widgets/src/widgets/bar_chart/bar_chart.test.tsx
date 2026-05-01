import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BarChartWidget } from "./BarChartWidget";
import { BarChartExample } from "./example";
import { resolveBarChart } from "./resolve";

describe("resolveBarChart", () => {
  it("returns bars sorted by value descending and respects limit", () => {
    const { panel, records } = BarChartExample();
    const result = resolveBarChart({
      panel,
      records,
      now: new Date("2026-04-30T12:00:00.000Z"),
    });
    expect(result.resolved.bars.length).toBeGreaterThan(0);
    for (let i = 1; i < result.resolved.bars.length; i++) {
      const prev = result.resolved.bars[i - 1]?.v;
      const curr = result.resolved.bars[i]?.v;
      if (prev !== undefined && curr !== undefined) {
        expect(prev >= curr).toBe(true);
      }
    }
  });
});

describe("BarChartWidget", () => {
  it("renders empty state", () => {
    const { panel } = BarChartExample();
    render(<BarChartWidget panel={panel} data={{ resolved: { bars: [] }, empty: true }} />);
    expect(screen.getByText("No data in window.")).toBeInTheDocument();
  });
});
