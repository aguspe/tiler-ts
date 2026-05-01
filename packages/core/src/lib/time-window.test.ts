import { describe, expect, it } from "vitest";
import type { DataRecord } from "../schema/data_record";
import { applyTimeWindow, timeWindowBounds } from "./time-window";

const REF = new Date("2026-04-30T12:00:00.000Z");

const rec = (recorded_at: string): DataRecord => ({
  id: "r",
  data_source_id: "s",
  payload: {},
  recorded_at,
  source_ref: null,
  ingested_via: "manual",
  created_at: recorded_at,
});

describe("timeWindowBounds", () => {
  it("'24h' returns (now-24h, now)", () => {
    const { since, until } = timeWindowBounds("24h", REF);
    expect(until).toBe(REF.toISOString());
    expect(since).toBe(new Date(REF.getTime() - 24 * 3600_000).toISOString());
  });
  it("'7d' returns (now-7d, now)", () => {
    const { since } = timeWindowBounds("7d", REF);
    expect(since).toBe(new Date(REF.getTime() - 7 * 24 * 3600_000).toISOString());
  });
  it("'all' returns since=null", () => {
    const { since, until } = timeWindowBounds("all", REF);
    expect(since).toBeNull();
    expect(until).toBe(REF.toISOString());
  });
});

describe("applyTimeWindow", () => {
  const records = [
    rec("2026-04-30T11:30:00.000Z"),
    rec("2026-04-29T13:00:00.000Z"),
    rec("2026-04-28T11:00:00.000Z"),
  ];
  it("filters records inside the window", () => {
    expect(applyTimeWindow(records, "24h", REF)).toHaveLength(2);
  });
  it("returns all records when window is 'all'", () => {
    expect(applyTimeWindow(records, "all", REF)).toHaveLength(3);
  });
  it("never includes future-dated records", () => {
    const future = rec("2027-01-01T00:00:00.000Z");
    expect(applyTimeWindow([...records, future], "24h", REF)).toHaveLength(2);
  });
});
