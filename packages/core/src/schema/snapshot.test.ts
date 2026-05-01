import { describe, expect, it } from "vitest";
import { TilerSnapshot } from "./snapshot";

const NOW = "2026-04-30T12:00:00.000Z";

describe("TilerSnapshot", () => {
  it("accepts a minimal v1 snapshot", () => {
    const result = TilerSnapshot.parse({
      version: 1,
      generated_at: NOW,
      dashboard: {
        id: "d1",
        name: "QA",
        slug: "qa",
        description: null,
        refresh_seconds: 0,
        settings: { tv_mode: false },
        created_at: NOW,
        updated_at: NOW,
      },
      panels: [],
      data_sources: [],
      records: [],
      resolved: {},
    });
    expect(result.version).toBe(1);
    expect(result.resolved).toEqual({});
  });
  it("defaults `resolved` to an empty object when omitted", () => {
    const result = TilerSnapshot.parse({
      version: 1,
      generated_at: NOW,
      dashboard: {
        id: "d1",
        name: "QA",
        slug: "qa",
        description: null,
        refresh_seconds: 0,
        settings: { tv_mode: false },
        created_at: NOW,
        updated_at: NOW,
      },
      panels: [],
      data_sources: [],
      records: [],
    });
    expect(result.resolved).toEqual({});
  });
  it("rejects version=2", () => {
    expect(
      TilerSnapshot.safeParse({
        version: 2,
        generated_at: NOW,
        dashboard: {
          id: "x",
          name: "x",
          slug: "x",
          description: null,
          refresh_seconds: 0,
          settings: { tv_mode: false },
          created_at: NOW,
          updated_at: NOW,
        },
        panels: [],
        data_sources: [],
        records: [],
        resolved: {},
      }).success,
    ).toBe(false);
  });
});
