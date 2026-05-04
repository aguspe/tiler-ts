import { describe, expect, it } from "vitest";
import { playwrightConfigToPresetOutput } from "./playwright-config";

const NOW = new Date("2026-05-05T00:00:00.000Z");

describe("playwrightConfigToPresetOutput", () => {
  it("materializes a minimal dashboard with defaults", () => {
    const out = playwrightConfigToPresetOutput({
      config: { dashboard: { slug: "my_dash", name: "My Dash" } },
      now: NOW,
    });
    expect(out.dashboard.slug).toBe("my_dash");
    expect(out.dashboard.name).toBe("My Dash");
    expect(out.dashboard.id).toMatch(/^[0-9A-Z]{26}$/);
    expect(out.dashboard.created_at).toBe(NOW.toISOString());
    expect(out.dashboard.refresh_seconds).toBe(0);
    expect(out.panels).toEqual([]);
    expect(out.dataSources).toEqual([]);
  });

  it("synthesizes a slug when the user did not supply one", () => {
    const out = playwrightConfigToPresetOutput({
      config: { dashboard: { name: "no slug" } },
      now: NOW,
    });
    expect(out.dashboard.slug).toMatch(/^dash-[0-9A-Z]{26}$/);
  });

  it("materializes user data sources with fresh ids and timestamps", () => {
    const out = playwrightConfigToPresetOutput({
      config: {
        dashboard: { slug: "d1" },
        dataSources: [
          {
            source: {
              name: "Coverage",
              slug: "coverage",
              description: "",
              schema_definition: [{ key: "pct", type: "float" }],
              ingestion_methods: ["manual"],
              webhook_token: null,
              active: true,
            },
            collect: async () => [],
          },
        ],
      },
      now: NOW,
    });
    expect(out.dataSources).toHaveLength(1);
    expect(out.dataSources[0]!.slug).toBe("coverage");
    expect(out.dataSources[0]!.id).toMatch(/^[0-9A-Z]{26}$/);
    expect(out.dataSources[0]!.created_at).toBe(NOW.toISOString());
  });

  it("preserves a user-supplied data source id", () => {
    const id = "01HCUSTOMSOURCEIDXXXXXXXXX";
    const out = playwrightConfigToPresetOutput({
      config: {
        dashboard: { slug: "d2" },
        dataSources: [
          {
            source: {
              id,
              name: "X",
              slug: "x",
              description: "",
              schema_definition: [{ key: "v", type: "integer" }],
              ingestion_methods: ["manual"],
              webhook_token: null,
              active: true,
            },
            collect: async () => [],
          },
        ],
      },
      now: NOW,
    });
    expect(out.dataSources[0]!.id).toBe(id);
  });

  it("fills panel id, dashboard_id, timestamps, and config defaults", () => {
    const out = playwrightConfigToPresetOutput({
      config: {
        dashboard: { slug: "d3" },
        panels: [
          {
            widget_type: "metric",
            title: "T",
            x: 0,
            y: 0,
            width: 3,
            height: 2,
            config: {},
            data_source_id: "01HEXISTINGSOURCEXXXXXXXXX",
          },
        ],
      },
      now: NOW,
    });
    const p = out.panels[0]!;
    expect(p.id).toMatch(/^[0-9A-Z]{26}$/);
    expect(p.dashboard_id).toBe(out.dashboard.id);
    expect(p.created_at).toBe(NOW.toISOString());
    expect(p.config).toEqual({});
  });

  it("auto-places panels with omitted y starting at cursor 0", () => {
    const out = playwrightConfigToPresetOutput({
      config: {
        dashboard: { slug: "d4" },
        panels: [
          {
            widget_type: "metric",
            title: "A",
            x: 0,
            width: 3,
            height: 2,
            config: {},
            data_source_id: "01HSRCAXXXXXXXXXXXXXXXXXXX",
          },
          {
            widget_type: "metric",
            title: "B",
            x: 0,
            y: 100,
            width: 3,
            height: 2,
            config: {},
            data_source_id: "01HSRCBXXXXXXXXXXXXXXXXXXX",
          },
          {
            widget_type: "metric",
            title: "C",
            x: 0,
            width: 3,
            height: 4,
            config: {},
            data_source_id: "01HSRCCXXXXXXXXXXXXXXXXXXX",
          },
        ],
      },
      now: NOW,
    });
    const a = out.panels.find((p) => p.title === "A")!;
    const b = out.panels.find((p) => p.title === "B")!;
    const c = out.panels.find((p) => p.title === "C")!;
    expect(a.y).toBe(0);
    expect(b.y).toBe(100);
    expect(c.y).toBe(2); // cursor advanced by A's height (2), B was explicit so didn't move it
  });

  it("resolves data_source_slug to a user source's id", () => {
    const out = playwrightConfigToPresetOutput({
      config: {
        dashboard: { slug: "d5" },
        dataSources: [
          {
            source: {
              name: "Coverage",
              slug: "coverage",
              description: "",
              schema_definition: [{ key: "pct", type: "float" }],
              ingestion_methods: ["manual"],
              webhook_token: null,
              active: true,
            },
            collect: async () => [],
          },
        ],
        panels: [
          {
            widget_type: "metric",
            title: "Linked",
            x: 0,
            y: 10,
            width: 3,
            height: 2,
            config: {},
            data_source_slug: "coverage",
          },
        ],
      },
      now: NOW,
    });
    const cov = out.dataSources.find((d) => d.slug === "coverage")!;
    const linked = out.panels.find((p) => p.title === "Linked")!;
    expect(linked.data_source_id).toBe(cov.id);
  });

  it("throws when data_source_slug does not match any source", () => {
    expect(() =>
      playwrightConfigToPresetOutput({
        config: {
          dashboard: { slug: "d6" },
          panels: [
            {
              widget_type: "metric",
              title: "Bad",
              x: 0,
              y: 10,
              width: 3,
              height: 2,
              config: {},
              data_source_slug: "missing",
            },
          ],
        },
        now: NOW,
      }),
    ).toThrow(/data_source_slug "missing"/);
  });
});
