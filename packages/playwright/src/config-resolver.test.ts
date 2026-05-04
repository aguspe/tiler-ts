import { describe, expect, it, vi } from "vitest";
import { testAutomationPreset } from "@aguspe/tiler-core";
import { resolveConfig } from "./config-resolver";

const NOW = new Date("2026-05-03T00:00:00.000Z");

function baseOpts() {
  return {
    outDir: "tiler-report",
    preset: "test_automation" as const,
    excludePanels: [],
    panels: [],
    dataSources: [],
    captureLogs: false,
    linkTraceFiles: true,
    open: false,
  };
}

describe("resolveConfig — zero config", () => {
  it("returns the preset's panels and data sources unchanged", () => {
    const preset = testAutomationPreset({ now: NOW });
    const r = resolveConfig({ rawOpts: baseOpts(), startedAt: NOW });

    expect(r.dashboard.slug).toBe(preset.dashboard.slug);
    expect(r.panels).toHaveLength(preset.panels.length);
    expect(r.dataSources.map((d) => d.slug)).toEqual(
      preset.dataSources.map((d) => d.slug),
    );
    expect(r.collectors.size).toBe(0);
  });
});

describe("resolveConfig — excludePanels", () => {
  function opts(extra: Partial<ReturnType<typeof baseOpts>> = {}) {
    return { ...baseOpts(), ...extra };
  }

  it("drops preset panels whose title matches", () => {
    const r = resolveConfig({
      rawOpts: opts({ excludePanels: ["Pass Rate", "Skipped"] }),
      startedAt: NOW,
    });
    const titles = r.panels.map((p) => p.title);
    expect(titles).not.toContain("Pass Rate");
    expect(titles).not.toContain("Skipped");
    expect(r.panels.length).toBe(testAutomationPreset({ now: NOW }).panels.length - 2);
  });

  it("warns but does not throw when an exclude title is unknown", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const r = resolveConfig({
      rawOpts: opts({ excludePanels: ["Pass Rate", "Does Not Exist"] }),
      startedAt: NOW,
    });
    expect(r.panels.map((p) => p.title)).not.toContain("Pass Rate");
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("Does Not Exist"),
    );
    warn.mockRestore();
  });
});
