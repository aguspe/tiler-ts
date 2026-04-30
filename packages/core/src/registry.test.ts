import { afterEach, describe, expect, it } from "vitest";
import { z } from "zod";
import { __resetRegistryForTests, defineWidget, getWidget, listWidgets } from "./registry";
import type { WidgetDefinition } from "./widget";

const FIXTURE: WidgetDefinition = {
  meta: {
    type: "demo",
    label: "Demo",
    requires_data_source: false,
    default_size: { w: 1, h: 1 },
    min_size: { w: 1, h: 1 },
    max_size: { w: 2, h: 2 },
  },
  configSchema: z.object({}),
  component: () => null,
  example: () => ({
    panel: {
      id: "p",
      dashboard_id: "d",
      data_source_id: null,
      title: "Demo",
      widget_type: "demo",
      x: 0,
      y: 0,
      width: 1,
      height: 1,
      config: {},
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
    },
    records: [],
  }),
};

afterEach(() => __resetRegistryForTests());

describe("registry", () => {
  it("registers a widget by type", () => {
    defineWidget(FIXTURE);
    expect(getWidget("demo")?.meta.label).toBe("Demo");
  });

  it("listWidgets returns all registered widgets", () => {
    defineWidget(FIXTURE);
    expect(listWidgets()).toHaveLength(1);
  });

  it("throws on duplicate type", () => {
    defineWidget(FIXTURE);
    expect(() => defineWidget(FIXTURE)).toThrow(/already registered/);
  });
});
