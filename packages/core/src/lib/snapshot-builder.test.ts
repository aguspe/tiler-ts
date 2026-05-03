import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { z } from "zod";
import { testAutomationPreset } from "../presets/test_automation";
import { __resetRegistryForTests, defineWidget } from "../registry";
import type { WidgetData } from "../widget";
import { buildSnapshot } from "./snapshot-builder";

const NOW = new Date("2026-04-30T12:00:00.000Z");

const PRESET_TYPES = [
  "metric",
  "number_with_delta",
  "clock",
  "pie_chart",
  "line_chart",
  "status_grid",
  "bar_chart",
  "list",
];

function registerStubs(): void {
  for (const type of PRESET_TYPES) {
    defineWidget({
      meta: {
        type,
        label: type,
        requires_data_source: type !== "clock",
        default_size: { w: 3, h: 2 },
        min_size: { w: 1, h: 1 },
        max_size: { w: 12, h: 12 },
      },
      configSchema: z.object({}).passthrough(),
      resolve: ({ records }): WidgetData<number> => ({
        resolved: records.length,
        empty: records.length === 0,
      }),
      component: () => null,
      example: () => ({ panel: {} as never, records: [] }),
    });
  }
}

beforeEach(() => __resetRegistryForTests());
afterEach(() => __resetRegistryForTests());

describe("buildSnapshot", () => {
  it("runs resolvers for each panel and includes resolved data keyed by panel.id", async () => {
    registerStubs();
    const preset = testAutomationPreset({ now: NOW });
    const snapshot = await buildSnapshot({
      dashboard: preset.dashboard,
      dataSources: preset.dataSources,
      panels: preset.panels,
      records: [],
      now: NOW,
    });
    expect(snapshot.version).toBe(1);
    expect(Object.keys(snapshot.resolved)).toHaveLength(8);
    for (const panel of preset.panels) {
      expect(snapshot.resolved[panel.id]).toBeDefined();
    }
  });

  it("returns synthetic empty entries when widgets are not registered", async () => {
    const preset = testAutomationPreset({ now: NOW });
    const snapshot = await buildSnapshot({
      dashboard: preset.dashboard,
      dataSources: preset.dataSources,
      panels: preset.panels,
      records: [],
      now: NOW,
    });
    for (const panel of preset.panels) {
      expect(snapshot.resolved[panel.id]).toEqual({ resolved: null, empty: true });
    }
  });

  it("captures resolver errors as empty entries with an error payload", async () => {
    defineWidget({
      meta: {
        type: "explode",
        label: "Explode",
        requires_data_source: false,
        default_size: { w: 1, h: 1 },
        min_size: { w: 1, h: 1 },
        max_size: { w: 1, h: 1 },
      },
      configSchema: z.object({}),
      resolve: () => {
        throw new Error("boom");
      },
      component: () => null,
      example: () => ({ panel: {} as never, records: [] }),
    });
    const preset = testAutomationPreset({ now: NOW });
    const sourcePanel = preset.panels[0];
    if (!sourcePanel) throw new Error("preset must have at least one panel");
    const panels = [{ ...sourcePanel, widget_type: "explode" }];
    const snapshot = await buildSnapshot({
      dashboard: preset.dashboard,
      dataSources: preset.dataSources,
      panels: panels as never,
      records: [],
      now: NOW,
    });
    const entry = snapshot.resolved[panels[0]?.id ?? ""];
    expect(entry?.empty).toBe(true);
    expect(entry?.resolved).toMatchObject({ error: "boom" });
  });
});
