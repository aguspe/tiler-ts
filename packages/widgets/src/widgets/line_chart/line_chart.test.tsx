import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LineChartWidget } from "./LineChartWidget";
import { LineChartExample } from "./example";
import { resolveLineChart } from "./resolve";

describe("resolveLineChart", () => {
  it("returns one series per group_column value", () => {
    const { panel, records } = LineChartExample();
    const result = resolveLineChart({
      panel,
      records,
      now: new Date("2026-04-30T12:00:00.000Z"),
    });
    expect(result.resolved.series.length).toBeGreaterThan(0);
  });
});

describe("LineChartWidget", () => {
  it("renders empty-state text when empty", () => {
    const { panel } = LineChartExample();
    render(<LineChartWidget panel={panel} data={{ resolved: { series: [] }, empty: true }} />);
    expect(screen.getByText("No data in window.")).toBeInTheDocument();
  });
});
