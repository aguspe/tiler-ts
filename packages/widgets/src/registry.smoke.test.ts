import { getWidget, listWidgets } from "@aguspe/tiler-core";
import { describe, expect, it } from "vitest";
import "./index";

describe("registry smoke — all four config-only widgets register", () => {
  it.each(["clock", "text", "image", "iframe"])("%s is registered", (type) => {
    expect(getWidget(type)).toBeDefined();
  });

  it("listWidgets returns 4 widgets", () => {
    expect(listWidgets()).toHaveLength(4);
  });

  it("none of the four widgets requires a data source", () => {
    expect(listWidgets().every((w) => w.meta.requires_data_source === false)).toBe(true);
  });
});
