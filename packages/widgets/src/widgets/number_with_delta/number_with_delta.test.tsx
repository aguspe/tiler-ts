import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { NumberWithDeltaExample } from "./example";
import { NumberWithDeltaWidget } from "./NumberWithDeltaWidget";
import { resolveNumberWithDelta } from "./resolve";

describe("resolveNumberWithDelta", () => {
  it("computes value and a sparkline array", () => {
    const { panel, records } = NumberWithDeltaExample();
    const result = resolveNumberWithDelta({
      panel,
      records,
      now: new Date("2026-04-30T12:00:00.000Z"),
    });
    expect(result.resolved.value).toBeGreaterThanOrEqual(0);
    expect(Array.isArray(result.resolved.spark)).toBe(true);
  });
  it("returns delta_pct=null when prior period was zero", () => {
    const { panel } = NumberWithDeltaExample();
    const result = resolveNumberWithDelta({
      panel,
      records: [],
      now: new Date("2026-04-30T12:00:00.000Z"),
    });
    expect(result.resolved.delta_pct).toBeNull();
    expect(result.empty).toBe(true);
  });
});

describe("NumberWithDeltaWidget", () => {
  it("renders value and trend marker", () => {
    const { panel } = NumberWithDeltaExample();
    render(
      <NumberWithDeltaWidget
        panel={panel}
        data={{
          resolved: { value: 12, delta: -3, delta_pct: -20, spark: [1, 2, 3, 4] },
          empty: false,
        }}
      />,
    );
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText(/▼ 3/)).toBeInTheDocument();
  });
});
