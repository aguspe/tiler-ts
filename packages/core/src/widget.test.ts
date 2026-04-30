import { describe, expect, it } from "vitest";
import { z } from "zod";
import type { WidgetDefinition } from "./widget";

describe("WidgetDefinition", () => {
  it("permits a minimal config-only widget definition", () => {
    const def: WidgetDefinition<z.ZodObject<{ city: z.ZodString }>, { temp: number }> = {
      meta: {
        type: "weather",
        label: "Weather",
        requires_data_source: false,
        default_size: { w: 3, h: 2 },
        min_size: { w: 2, h: 2 },
        max_size: { w: 6, h: 4 },
      },
      configSchema: z.object({ city: z.string() }),
      component: () => null,
      example: () => ({
        panel: {
          id: "p",
          dashboard_id: "d",
          data_source_id: null,
          title: "X",
          widget_type: "weather",
          x: 0,
          y: 0,
          width: 3,
          height: 2,
          config: { city: "NYC" },
          created_at: "2026-01-01T00:00:00.000Z",
          updated_at: "2026-01-01T00:00:00.000Z",
        },
        records: [],
      }),
    };
    expect(def.meta.type).toBe("weather");
    expect(def.meta.requires_data_source).toBe(false);
    expect(def.configSchema.safeParse({ city: "NYC" }).success).toBe(true);
  });
});
