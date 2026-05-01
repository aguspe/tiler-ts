import { describe, expect, it } from "vitest";
import { testAutomationPreset } from "./test_automation";

const NOW = new Date("2026-04-30T12:00:00.000Z");

describe("testAutomationPreset", () => {
  it("returns a dashboard, one data source, and 9 panels", () => {
    const result = testAutomationPreset({ now: NOW });
    expect(result.dashboard.slug).toBe("test_automation");
    expect(result.dataSources).toHaveLength(1);
    expect(result.dataSources[0]?.slug).toBe("test_runs");
    expect(result.panels).toHaveLength(9);
  });

  it("data-backed panels reference the test_runs data source; clock is config-only", () => {
    const { panels, dataSources } = testAutomationPreset({ now: NOW });
    const sourceId = dataSources[0]?.id ?? "";
    const dataBacked = panels.filter((p) => p.data_source_id !== null);
    const configOnly = panels.filter((p) => p.data_source_id === null);
    expect(dataBacked.every((p) => p.data_source_id === sourceId)).toBe(true);
    expect(configOnly.every((p) => p.widget_type === "clock")).toBe(true);
  });

  it("respects the slug option", () => {
    const result = testAutomationPreset({ now: NOW, slug: "qa_cockpit" });
    expect(result.dashboard.slug).toBe("qa_cockpit");
  });

  it("panels lay out without overlap on a 12-column grid", () => {
    const { panels } = testAutomationPreset({ now: NOW });
    const cells = new Set<string>();
    for (const p of panels) {
      for (let dx = 0; dx < p.width; dx++) {
        for (let dy = 0; dy < p.height; dy++) {
          const key = `${p.x + dx},${p.y + dy}`;
          expect(cells.has(key)).toBe(false);
          cells.add(key);
        }
      }
    }
  });
});
