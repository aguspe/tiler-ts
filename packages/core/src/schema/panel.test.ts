import { describe, expect, it } from "vitest";
import { Panel } from "./panel";

const NOW = "2026-04-30T12:00:00.000Z";
const base = {
  id: "01HV3",
  dashboard_id: "01HV2",
  data_source_id: "01HV1",
  title: "Total runs",
  widget_type: "metric",
  x: 0,
  y: 0,
  width: 3,
  height: 2,
  config: {},
  created_at: NOW,
  updated_at: NOW,
};

describe("Panel", () => {
  it("accepts a typical metric panel", () => {
    expect(Panel.safeParse(base).success).toBe(true);
  });
  it("allows null data_source_id (config-only widgets)", () => {
    expect(Panel.safeParse({ ...base, data_source_id: null }).success).toBe(true);
  });
  it("rejects x out of [0,11]", () => {
    expect(Panel.safeParse({ ...base, x: 12 }).success).toBe(false);
    expect(Panel.safeParse({ ...base, x: -1 }).success).toBe(false);
  });
  it("rejects width=0", () => {
    expect(Panel.safeParse({ ...base, width: 0 }).success).toBe(false);
  });
  it("rejects width>12", () => {
    expect(Panel.safeParse({ ...base, width: 13 }).success).toBe(false);
  });
});
