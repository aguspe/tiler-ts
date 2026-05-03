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

  it("uses configured status_column and pass_value", () => {
    const { panel } = PassRateExample();
    const now = "2026-04-30T12:00:00.000Z";
    const customPanel = { ...panel, config: { ...panel.config, status_column: "result", pass_value: "passed" } };
    const records = [
      { id: "r1", data_source_id: "ds-1", payload: { result: "passed" }, recorded_at: now, source_ref: null, ingested_via: "manual" as const, created_at: now },
      { id: "r2", data_source_id: "ds-1", payload: { result: "failed" }, recorded_at: now, source_ref: null, ingested_via: "manual" as const, created_at: now },
    ];
    const result = resolvePassRate({ panel: customPanel, records, now: new Date() });
    expect(result.resolved.passed).toBe(1);
    expect(result.resolved.total).toBe(2);
    expect(result.resolved.value).toBeCloseTo(50);
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
