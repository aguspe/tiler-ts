import { describe, expect, it } from "vitest";
import { definePlaywrightConfig } from "./define-config";

describe("definePlaywrightConfig", () => {
  it("is an identity function (returns its input)", () => {
    const cfg = { excludePanels: ["Pass Rate"] };
    expect(definePlaywrightConfig(cfg)).toBe(cfg);
  });

  it("accepts a fully empty object", () => {
    expect(definePlaywrightConfig({})).toEqual({});
  });
});
