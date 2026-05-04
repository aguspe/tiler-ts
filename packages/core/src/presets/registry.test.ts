import { describe, expect, it } from "vitest";
import { getPreset, listPresets } from "./registry";

describe("preset registry", () => {
  it("returns the test_automation factory by name", () => {
    const fn = getPreset("test_automation");
    expect(typeof fn).toBe("function");
  });

  it("calling the returned factory produces a PresetOutput", () => {
    const fn = getPreset("test_automation")!;
    const out = fn({ now: new Date("2026-05-05T00:00:00.000Z") });
    expect(out.dashboard.slug).toBe("test_automation");
    expect(out.panels.length).toBeGreaterThan(0);
    expect(out.dataSources.length).toBeGreaterThan(0);
  });

  it("returns undefined for an unknown name", () => {
    expect(getPreset("not_a_preset")).toBeUndefined();
  });

  it("listPresets returns every registered name", () => {
    expect(listPresets()).toEqual(["test_automation"]);
  });
});
