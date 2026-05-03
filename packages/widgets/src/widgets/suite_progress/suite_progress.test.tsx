import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SuiteProgressWidget } from "./SuiteProgressWidget";
import { SuiteProgressExample } from "./example";
import { resolveSuiteProgress } from "./resolve";

describe("resolveSuiteProgress", () => {
  it("groups by suite and computes pass_rate", () => {
    const { panel, records } = SuiteProgressExample();
    const result = resolveSuiteProgress({ panel, records, now: new Date() });
    const auth = result.resolved.find((r) => r.suite === "auth");
    expect(auth).toBeDefined();
    expect(auth!.pass_rate).toBeCloseTo(100);
  });

  it("sorts by pass_rate ascending (worst first)", () => {
    const { panel, records } = SuiteProgressExample();
    const result = resolveSuiteProgress({ panel, records, now: new Date() });
    for (let i = 1; i < result.resolved.length; i++) {
      expect(result.resolved[i - 1]!.pass_rate <= result.resolved[i]!.pass_rate).toBe(true);
    }
  });

  it("returns empty=true with no records", () => {
    const { panel } = SuiteProgressExample();
    const result = resolveSuiteProgress({ panel, records: [], now: new Date() });
    expect(result.empty).toBe(true);
  });
});

describe("SuiteProgressWidget", () => {
  it("renders suite names and percentages", () => {
    const { panel, records } = SuiteProgressExample();
    const data = resolveSuiteProgress({ panel, records, now: new Date() });
    render(<SuiteProgressWidget panel={panel} data={data} />);
    expect(screen.getByText("auth")).toBeInTheDocument();
    expect(screen.getAllByText("100%")).toHaveLength(2);
  });

  it("renders empty state with no records", () => {
    const { panel } = SuiteProgressExample();
    render(<SuiteProgressWidget panel={panel} data={{ resolved: [], empty: true }} />);
    expect(screen.getByText("No suite data.")).toBeInTheDocument();
  });
});
