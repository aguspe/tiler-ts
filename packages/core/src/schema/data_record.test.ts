import { describe, expect, it } from "vitest";
import { DataRecord } from "./data_record";

const NOW = "2026-04-30T12:00:00.000Z";

describe("DataRecord", () => {
  it("accepts an arbitrary payload object", () => {
    const result = DataRecord.parse({
      id: "01HV3",
      data_source_id: "01HV2",
      payload: { suite: "checkout", status: "pass", duration_ms: 142 },
      recorded_at: NOW,
      source_ref: null,
      ingested_via: "webhook",
      created_at: NOW,
    });
    expect(result.payload).toEqual({ suite: "checkout", status: "pass", duration_ms: 142 });
  });
  it("rejects an unknown ingested_via value", () => {
    expect(
      DataRecord.safeParse({
        id: "1",
        data_source_id: "1",
        payload: {},
        recorded_at: NOW,
        source_ref: null,
        ingested_via: "scp",
        created_at: NOW,
      }).success,
    ).toBe(false);
  });
});
