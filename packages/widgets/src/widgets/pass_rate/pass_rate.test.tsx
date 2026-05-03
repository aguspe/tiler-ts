import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PassRateWidget } from "./PassRateWidget";
import { PassRateExample } from "./example";
import { resolvePassRate } from "./resolve";

describe("resolvePassRate", () => {
  it("computes percentage from pass/total", () => {
    const { panel, records } = PassRateExample();
    const result = resolvePassRate({ panel, records, now: new Date() });
    // Example has 7 pass out of 10
    expect(result.resolved.total).toBe(10);
    expect(result.resolved.passed).toBe(7);
    expect(result.resolved.value).toBeCloseTo(70);
    expect(result.empty).toBe(false);
  });

  it("returns empty=true with no records", () => {
    const { panel } = PassRateExample();
    const result = resolvePassRate({ panel, records: [], now: new Date() });
    expect(result.empty).toBe(true);
  });

  it("returns 100 when all records pass", () => {
    const { panel, records } = PassRateExample();
    const allPass = records.map((r) => ({ ...r, payload: { ...r.payload, status: "pass" } }));
    const result = resolvePassRate({ panel, records: allPass, now: new Date() });
    expect(result.resolved.value).toBe(100);
  });
});

describe("PassRateWidget", () => {
  it("renders the percentage with subtitle", () => {
    const { panel } = PassRateExample();
    render(
      <PassRateWidget
        panel={panel}
        data={{ resolved: { value: 95.1, total: 248, passed: 236 }, empty: false }}
      />,
    );
    expect(screen.getByText("95.1%")).toBeInTheDocument();
    expect(screen.getByText("236 / 248 passed")).toBeInTheDocument();
  });

  it("renders em dash when empty", () => {
    const { panel } = PassRateExample();
    render(
      <PassRateWidget
        panel={panel}
        data={{ resolved: { value: 0, total: 0, passed: 0 }, empty: true }}
      />,
    );
    expect(screen.getByText("—")).toBeInTheDocument();
  });
});
