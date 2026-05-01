import { describe, expect, it } from "vitest";
import type { DataRecord } from "../schema/data_record";
import { bucketByTime, groupByColumn } from "./group-bucket";

let _id = 0;
const rec = (payload: Record<string, unknown>, recorded_at: string): DataRecord => ({
  id: `r${_id++}`,
  data_source_id: "s",
  payload,
  recorded_at,
  source_ref: null,
  ingested_via: "manual",
  created_at: recorded_at,
});

describe("groupByColumn", () => {
  it("groups by string column", () => {
    const groups = groupByColumn(
      [
        rec({ status: "pass" }, "2026-04-30T10:00:00.000Z"),
        rec({ status: "fail" }, "2026-04-30T11:00:00.000Z"),
        rec({ status: "pass" }, "2026-04-30T12:00:00.000Z"),
      ],
      "status",
    );
    expect(groups).toHaveLength(2);
    expect(groups.find((g) => g.key === "pass")?.records).toHaveLength(2);
    expect(groups.find((g) => g.key === "fail")?.records).toHaveLength(1);
  });
  it("returns empty array when records are empty", () => {
    expect(groupByColumn([], "status")).toEqual([]);
  });
  it("treats missing column values as the empty-string key", () => {
    const groups = groupByColumn(
      [rec({}, "2026-04-30T10:00:00.000Z"), rec({ x: "a" }, "2026-04-30T11:00:00.000Z")],
      "x",
    );
    expect(groups).toHaveLength(2);
    expect(groups.find((g) => g.key === "")).toBeDefined();
  });
});

describe("bucketByTime", () => {
  it("buckets by 1h", () => {
    const buckets = bucketByTime(
      [
        rec({}, "2026-04-30T10:15:00.000Z"),
        rec({}, "2026-04-30T10:45:00.000Z"),
        rec({}, "2026-04-30T11:30:00.000Z"),
      ],
      "1h",
    );
    expect(buckets).toHaveLength(2);
    expect(buckets[0]?.key).toBe("2026-04-30T10:00:00.000Z");
    expect(buckets[0]?.records).toHaveLength(2);
    expect(buckets[1]?.key).toBe("2026-04-30T11:00:00.000Z");
  });
  it("buckets by 1d (UTC midnight)", () => {
    const buckets = bucketByTime(
      [
        rec({}, "2026-04-29T15:00:00.000Z"),
        rec({}, "2026-04-30T01:00:00.000Z"),
        rec({}, "2026-04-30T23:00:00.000Z"),
      ],
      "1d",
    );
    expect(buckets).toHaveLength(2);
  });
  it("buckets by 30s", () => {
    const buckets = bucketByTime(
      [
        rec({}, "2026-04-30T10:00:00.000Z"),
        rec({}, "2026-04-30T10:00:15.000Z"),
        rec({}, "2026-04-30T10:00:35.000Z"),
      ],
      "30s",
    );
    expect(buckets).toHaveLength(2);
  });
});
