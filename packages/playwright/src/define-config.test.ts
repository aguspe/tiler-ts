import { describe, expect, it } from "vitest";
import { definePlaywrightConfig } from "./define-config";
import type { DashboardConfig } from "@aguspe/tiler-core";
import type { PlaywrightTilerConfig } from "./define-config";

describe("definePlaywrightConfig", () => {
  it("is an identity function (returns its input)", () => {
    const cfg = { excludePanels: ["Pass Rate"] };
    expect(definePlaywrightConfig(cfg)).toBe(cfg);
  });

  it("accepts a fully empty object", () => {
    expect(definePlaywrightConfig({})).toEqual({});
  });
});

describe("PlaywrightTilerConfig structural drift guard", () => {
  it("a PlaywrightTilerConfig value is assignable to core's DashboardConfig", () => {
    // Type-level check: if PlaywrightTilerConfig drifts away from
    // DashboardConfig, the assignment below stops compiling.
    const sample: PlaywrightTilerConfig = {
      excludePanels: ["Pass Rate"],
      panels: [
        { widget_type: "metric", title: "T", x: 0, width: 3, height: 2, config: {} },
      ],
      dataSources: [],
      dashboard: { name: "X" },
    };
    const asCore: DashboardConfig = sample;
    expect(asCore).toBe(sample);
  });
});
