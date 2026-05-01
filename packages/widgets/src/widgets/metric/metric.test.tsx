import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MetricExample } from "./example";
import { MetricWidget } from "./MetricWidget";
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
  it("returns empty=true on empty record set", () => {
    const { panel } = MetricExample();
    const result = resolveMetric({
      panel,
      records: [],
      now: new Date("2026-04-30T12:00:00.000Z"),
    });
    expect(result.resolved).toBe(0);
    expect(result.empty).toBe(true);
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
});
