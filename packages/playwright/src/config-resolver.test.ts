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

describe("resolveConfig — append panels (explicit y)", () => {
  it("appends user panels with id/dashboard_id/timestamps filled", () => {
    const r = resolveConfig({
      rawOpts: {
        ...baseOpts(),
        panels: [
          {
            widget_type: "metric",
            title: "Custom",
            x: 0,
            y: 10,
            width: 3,
            height: 2,
            config: {},
          },
        ],
      },
      startedAt: NOW,
    });
    const last = r.panels[r.panels.length - 1]!;
    expect(last.title).toBe("Custom");
    expect(last.dashboard_id).toBe(r.dashboard.id);
    expect(last.id).toMatch(/^[0-9A-Z]{26}$/);
    expect(last.created_at).toBe(NOW.toISOString());
    expect(last.updated_at).toBe(NOW.toISOString());
  });

  it("defaults a panel's data_source_id to the preset's test_runs source", () => {
    const r = resolveConfig({
      rawOpts: {
        ...baseOpts(),
        panels: [
          {
            widget_type: "metric",
            title: "Custom",
            x: 0,
            y: 10,
            width: 3,
            height: 2,
            config: {},
          },
        ],
      },
      startedAt: NOW,
    });
    const last = r.panels[r.panels.length - 1]!;
    const testRuns = r.dataSources.find((d) => d.slug === "test_runs");
    expect(testRuns).toBeDefined();
    expect(last.data_source_id).toBe(testRuns!.id);
  });

  it("uses an explicit data_source_id when provided", () => {
    const explicitId = "01HEXPLICITDATASOURCEIDXX";
    const r = resolveConfig({
      rawOpts: {
        ...baseOpts(),
        panels: [
          {
            widget_type: "metric",
            title: "Custom",
            x: 0,
            y: 10,
            width: 3,
            height: 2,
            config: {},
            data_source_id: explicitId,
          },
        ],
      },
      startedAt: NOW,
    });
    expect(r.panels[r.panels.length - 1]!.data_source_id).toBe(explicitId);
  });
});

describe("resolveConfig — auto-place", () => {
  it("places a panel with omitted y below the lowest preset panel", () => {
    const preset = testAutomationPreset({ now: NOW });
    const presetMaxY = Math.max(...preset.panels.map((p) => p.y + p.height));

    const r = resolveConfig({
      rawOpts: {
        ...baseOpts(),
        panels: [
          {
            widget_type: "metric",
            title: "Auto Placed",
            x: 0,
            width: 3,
            height: 2,
            config: {},
          },
        ],
      },
      startedAt: NOW,
    });
    const placed = r.panels.find((p) => p.title === "Auto Placed")!;
    expect(placed.y).toBe(presetMaxY);
  });

  it("advances the cursor for each auto-placed panel; explicit y panels do not advance it", () => {
    const preset = testAutomationPreset({ now: NOW });
    const presetMaxY = Math.max(...preset.panels.map((p) => p.y + p.height));

    const r = resolveConfig({
      rawOpts: {
        ...baseOpts(),
        panels: [
          { widget_type: "metric", title: "Auto1", x: 0, width: 3, height: 2, config: {} },
          { widget_type: "metric", title: "Pinned", x: 0, y: 100, width: 3, height: 2, config: {} },
          { widget_type: "metric", title: "Auto2", x: 0, width: 3, height: 4, config: {} },
        ],
      },
      startedAt: NOW,
    });
    const a1 = r.panels.find((p) => p.title === "Auto1")!;
    const pin = r.panels.find((p) => p.title === "Pinned")!;
    const a2 = r.panels.find((p) => p.title === "Auto2")!;
    expect(a1.y).toBe(presetMaxY);
    expect(pin.y).toBe(100);
    expect(a2.y).toBe(presetMaxY + 2); // advanced by Auto1's height only
  });
});

describe("resolveConfig — data_source_slug", () => {
  it("resolves a slug that exists in the preset", () => {
    const r = resolveConfig({
      rawOpts: {
        ...baseOpts(),
        panels: [
          {
            widget_type: "metric",
            title: "ViaSlug",
            x: 0,
            y: 10,
            width: 3,
            height: 2,
            config: {},
            data_source_slug: "test_runs",
          },
        ],
      },
      startedAt: NOW,
    });
    const placed = r.panels.find((p) => p.title === "ViaSlug")!;
    const testRuns = r.dataSources.find((d) => d.slug === "test_runs")!;
    expect(placed.data_source_id).toBe(testRuns.id);
  });

  it("throws when the slug does not exist", () => {
    expect(() =>
      resolveConfig({
        rawOpts: {
          ...baseOpts(),
          panels: [
            {
              widget_type: "metric",
              title: "Missing",
              x: 0,
              y: 10,
              width: 3,
              height: 2,
              config: {},
              data_source_slug: "nope",
            },
          ],
        },
        startedAt: NOW,
      }),
    ).toThrow(/data_source_slug "nope"/);
  });
});
