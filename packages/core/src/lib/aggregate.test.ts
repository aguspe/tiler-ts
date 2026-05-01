import { describe, expect, it } from "vitest";
import type { DataRecord } from "../schema/data_record";
import { aggregate } from "./aggregate";

const NOW = "2026-04-30T12:00:00.000Z";
const rec = (payload: Record<string, unknown>, recorded_at = NOW): DataRecord => ({
  id: "r",
  data_source_id: "s",
  payload,
  recorded_at,
  source_ref: null,
  ingested_via: "manual",
  created_at: NOW,
});

describe("aggregate", () => {
  it("count: returns record count regardless of column", () => {
    expect(aggregate([rec({}), rec({}), rec({})], { aggregation: "count" })).toBe(3);
  });
  it("count on empty array is 0", () => {
    expect(aggregate([], { aggregation: "count" })).toBe(0);
  });
  it("sum: sums numeric column values", () => {
    expect(
      aggregate([rec({ x: 1 }), rec({ x: 2 }), rec({ x: 3 })], {
        aggregation: "sum",
        value_column: "x",
      }),
    ).toBe(6);
  });
  it("avg: averages numeric column values", () => {
    expect(
      aggregate([rec({ x: 2 }), rec({ x: 4 })], { aggregation: "avg", value_column: "x" }),
    ).toBe(3);
  });
  it("avg on empty values returns 0", () => {
    expect(aggregate([rec({})], { aggregation: "avg", value_column: "x" })).toBe(0);
  });
  it("min/max ignore non-numeric values", () => {
    expect(
      aggregate([rec({ x: 5 }), rec({ x: "nope" }), rec({ x: 3 })], {
        aggregation: "min",
        value_column: "x",
      }),
    ).toBe(3);
    expect(
      aggregate([rec({ x: 5 }), rec({ x: "nope" }), rec({ x: 3 })], {
        aggregation: "max",
        value_column: "x",
      }),
    ).toBe(5);
  });
  it("first: returns the value of the first record's column", () => {
    expect(
      aggregate([rec({ x: 10 }), rec({ x: 20 })], { aggregation: "first", value_column: "x" }),
    ).toBe(10);
  });
  it("last: returns the value of the last record's column", () => {
    expect(
      aggregate([rec({ x: 10 }), rec({ x: 20 })], { aggregation: "last", value_column: "x" }),
    ).toBe(20);
  });
  it("returns 0 when value_column is missing for sum/avg/min/max", () => {
    expect(aggregate([rec({}), rec({})], { aggregation: "sum" })).toBe(0);
  });
});
