import { describe, expect, it } from "vitest";
import { definePlaywrightConfig } from "./define-config";
import type { DashboardSeed } from "@aguspe/tiler-core";
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
  it("a PlaywrightTilerConfig value is assignable to core's DashboardSeed", () => {
    // Type-level check: if PlaywrightTilerConfig drifts away from
    // DashboardSeed, the assignment below stops compiling.
    const sample: PlaywrightTilerConfig = {
      excludePanels: ["Pass Rate"],
      panels: [
        { widget_type: "metric", title: "T", x: 0, width: 3, height: 2, config: {} },
      ],
      dataSources: [],
      dashboard: { name: "X" },
    };
    const asCore: DashboardSeed = sample;
    expect(asCore).toBe(sample);
  });

  it("a DashboardSeed value is assignable to PlaywrightTilerConfig", () => {
    // The reverse direction: anything core declares should also be
    // valid playwright input. Catches narrowing of the playwright type.
    const sample: DashboardSeed = {
      excludePanels: ["X"],
      dashboard: { name: "Y" },
    };
    const asPw: PlaywrightTilerConfig = sample;
    expect(asPw).toBe(sample);
  });
});
