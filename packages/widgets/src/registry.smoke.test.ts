import { getWidget, listWidgets } from "@aguspe/tiler-core";
import { describe, expect, it } from "vitest";
import "./index";

// Intermediate smoke test: asserts every widget the package barrel currently
// imports is registered. As each Phase 2 widget lands, add its type to ALL_TYPES.
// At the end of Phase 2 (Task 18), this is tightened to assert exactly 14.
const ALL_TYPES = [
  "clock",
  "text",
  "image",
  "iframe",
  "metric",
  "number_with_delta",
  "meter",
] as const;

describe("registry smoke — registered widgets", () => {
  it.each(ALL_TYPES)("%s is registered", (type) => {
    expect(getWidget(type)).toBeDefined();
  });

  it("listWidgets count matches ALL_TYPES length", () => {
    expect(listWidgets()).toHaveLength(ALL_TYPES.length);
  });
});
