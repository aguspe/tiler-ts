import { getWidget, listWidgets } from "@aguspe/tiler-core";
import { describe, expect, it } from "vitest";
import "./index";

const ALL_TYPES = [
  "clock",
  "text",
  "image",
  "iframe",
  "metric",
  "number_with_delta",
  "meter",
  "list",
  "status_grid",
  "comments",
  "table",
  "line_chart",
  "bar_chart",
  "pie_chart",
] as const;

describe("registry smoke — all 14 widgets register", () => {
  it.each(ALL_TYPES)("%s is registered", (type) => {
    expect(getWidget(type)).toBeDefined();
  });

  it("listWidgets returns 14 widgets", () => {
    expect(listWidgets()).toHaveLength(14);
  });

  it("data-backed widgets all expose a resolver", () => {
    const dataBacked = listWidgets().filter((w) => w.meta.requires_data_source);
    expect(dataBacked).toHaveLength(10);
    expect(dataBacked.every((w) => typeof w.resolve === "function")).toBe(true);
  });

  it("config-only widgets are exactly 4", () => {
    const configOnly = listWidgets().filter((w) => !w.meta.requires_data_source);
    expect(configOnly).toHaveLength(4);
    expect(configOnly.map((w) => w.meta.type).sort()).toEqual([
      "clock",
      "iframe",
      "image",
      "text",
    ]);
  });
});
