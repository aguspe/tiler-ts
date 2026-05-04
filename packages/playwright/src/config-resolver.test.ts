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

describe("resolveConfig — user data sources", () => {
  function fakeSource(slug: string, id = `01HFAKE${slug.toUpperCase().padEnd(20, "X")}`) {
    return {
      id,
      name: slug,
      slug,
      description: "",
      schema_definition: [{ key: "v", type: "integer" as const }],
      ingestion_methods: ["manual" as const],
      webhook_token: null,
      active: true,
      created_at: NOW.toISOString(),
      updated_at: NOW.toISOString(),
    };
  }

  it("appends user sources after preset sources and registers their collectors", async () => {
    const cov = fakeSource("coverage");
    const collect = vi.fn(async () => []);
    const r = resolveConfig({
      rawOpts: { ...baseOpts(), dataSources: [{ source: cov, collect }] },
      startedAt: NOW,
    });
    expect(r.dataSources.map((d) => d.slug)).toContain("coverage");
    expect(r.collectors.size).toBe(1);
    expect(r.collectors.get(cov.id)).toBe(collect);
  });

  it("resolves a panel slug to a user source", () => {
    const cov = fakeSource("coverage");
    const r = resolveConfig({
      rawOpts: {
        ...baseOpts(),
        dataSources: [{ source: cov, collect: async () => [] }],
        panels: [
          {
            widget_type: "metric",
            title: "Coverage",
            x: 0,
            y: 10,
            width: 3,
            height: 2,
            config: {},
            data_source_slug: "coverage",
          },
        ],
      },
      startedAt: NOW,
    });
    expect(r.panels.find((p) => p.title === "Coverage")!.data_source_id).toBe(cov.id);
  });

  it("throws when a user source duplicates a preset slug", () => {
    const dup = fakeSource("test_runs");
    expect(() =>
      resolveConfig({
        rawOpts: { ...baseOpts(), dataSources: [{ source: dup, collect: async () => [] }] },
        startedAt: NOW,
      }),
    ).toThrow(/duplicate data source slug "test_runs"/);
  });
});

describe("resolveConfig — dashboard overrides", () => {
  it("shallow-merges name/slug/description on the preset dashboard", () => {
    const r = resolveConfig({
      rawOpts: {
        ...baseOpts(),
        dashboard: { name: "My Run", slug: "my_run" },
      },
      startedAt: NOW,
    });
    expect(r.dashboard.name).toBe("My Run");
    expect(r.dashboard.slug).toBe("my_run");
    // description not provided, preset default kept
    expect(r.dashboard.description).toMatch(/Playwright/);
  });
});
