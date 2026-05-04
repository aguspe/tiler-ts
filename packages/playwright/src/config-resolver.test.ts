import { describe, expect, it } from "vitest";
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
