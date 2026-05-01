import { describe, expect, it } from "vitest";
import type { DataRecord } from "../schema/data_record";
import { applyFilter } from "./filter";

const rec = (payload: Record<string, unknown>): DataRecord => ({
  id: "r",
  data_source_id: "s",
  payload,
  recorded_at: "2026-04-30T12:00:00.000Z",
  source_ref: null,
  ingested_via: "manual",
  created_at: "2026-04-30T12:00:00.000Z",
});

describe("applyFilter", () => {
  it("returns records matching all filter keys", () => {
    const result = applyFilter(
      [rec({ status: "pass" }), rec({ status: "fail" }), rec({ status: "pass" })],
      { status: "pass" },
    );
    expect(result).toHaveLength(2);
  });
  it("returns all records when filter is undefined", () => {
    const result = applyFilter([rec({ a: 1 })], undefined);
    expect(result).toHaveLength(1);
  });
  it("matches multiple keys with AND semantics", () => {
    const result = applyFilter(
      [
        rec({ status: "pass", suite: "checkout" }),
        rec({ status: "pass", suite: "auth" }),
        rec({ status: "fail", suite: "checkout" }),
      ],
      { status: "pass", suite: "checkout" },
    );
    expect(result).toHaveLength(1);
  });
  it("matches numeric and boolean values", () => {
    expect(
      applyFilter([rec({ retried: true }), rec({ retried: false })], { retried: true }),
    ).toHaveLength(1);
    expect(
      applyFilter([rec({ priority: 1 }), rec({ priority: 2 })], { priority: 1 }),
    ).toHaveLength(1);
  });
});
