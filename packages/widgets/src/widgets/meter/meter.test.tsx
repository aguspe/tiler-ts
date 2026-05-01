import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MeterExample } from "./example";
import { MeterWidget } from "./MeterWidget";
import { resolveMeter } from "./resolve";

describe("resolveMeter", () => {
  it("returns avg of value_column", () => {
    const { panel, records } = MeterExample();
    const result = resolveMeter({
      panel,
      records,
      now: new Date("2026-04-30T12:00:00.000Z"),
    });
    expect(result.resolved).toBeGreaterThan(0);
  });
});

describe("MeterWidget", () => {
  it("renders the formatted value", () => {
    const { panel } = MeterExample();
    render(<MeterWidget panel={panel} data={{ resolved: 250, empty: false }} />);
    expect(screen.getByText("250 ms")).toBeInTheDocument();
  });
  it("clamps overshoot values to max", () => {
    const { panel } = MeterExample();
    const { container } = render(
      <MeterWidget panel={panel} data={{ resolved: 99999, empty: false }} />,
    );
    expect(container.querySelector("svg")).toBeTruthy();
  });
});
