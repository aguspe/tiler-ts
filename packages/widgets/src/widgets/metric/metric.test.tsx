import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MetricWidget } from "./MetricWidget";
import { MetricExample } from "./example";
import { resolveMetric } from "./resolve";

describe("resolveMetric", () => {
  it("counts records by default", () => {
    const { panel, records } = MetricExample();
    const result = resolveMetric({
      panel,
      records,
      now: new Date("2026-04-30T12:00:00.000Z"),
    });
    expect(result.resolved).toBe(47);
    expect(result.empty).toBe(false);
  });
  it("returns empty=false for count with zero records (0 is a valid count)", () => {
    const { panel } = MetricExample();
    const result = resolveMetric({
      panel,
      records: [],
      now: new Date("2026-04-30T12:00:00.000Z"),
    });
    expect(result.resolved).toBe(0);
    expect(result.empty).toBe(false);
  });
});

describe("MetricWidget", () => {
  it("renders the formatted number with prefix/suffix", () => {
    const { panel } = MetricExample();
    render(
      <MetricWidget
        panel={{
          ...panel,
          config: {
            aggregation: "count",
            time_window: "24h",
            prefix: "$",
            suffix: " runs",
            decimals: 0,
          },
        }}
        data={{ resolved: 1234, empty: false }}
      />,
    );
    expect(screen.getByText("$1,234 runs")).toBeInTheDocument();
  });

  it("applies color from config to the value text", () => {
    const { panel } = MetricExample();
    const { container } = render(
      <MetricWidget
        panel={{ ...panel, config: { aggregation: "count", time_window: "all", color: "#ef4444" } }}
        data={{ resolved: 5, empty: false }}
      />,
    );
    const value = container.querySelector(".tiler-metric__value") as HTMLElement;
    expect(value.style.color).toBe("rgb(239, 68, 68)");
  });
});
