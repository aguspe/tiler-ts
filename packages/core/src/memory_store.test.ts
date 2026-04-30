import { beforeEach, describe, expect, it } from "vitest";
import { MemoryStore } from "./memory_store";

let store: MemoryStore;
beforeEach(() => {
  store = new MemoryStore();
});

describe("MemoryStore — dashboards", () => {
  it("upserts and lists", async () => {
    await store.upsertDashboard({
      name: "QA",
      slug: "qa",
      description: null,
      refresh_seconds: 0,
      settings: { tv_mode: false },
    });
    const list = await store.listDashboards();
    expect(list).toHaveLength(1);
    expect(list[0]?.slug).toBe("qa");
  });
  it("getDashboard returns null on miss", async () => {
    expect(await store.getDashboard("missing")).toBeNull();
  });
});

describe("MemoryStore — data sources", () => {
  it("inserts and finds by slug", async () => {
    const src = await store.upsertDataSource({
      name: "Test Runs",
      slug: "test_runs",
      description: null,
      schema_definition: [],
      ingestion_methods: ["webhook"],
      webhook_token: null,
      active: true,
    });
    expect((await store.getDataSource("test_runs"))?.id).toBe(src.id);
  });
});

describe("MemoryStore — records", () => {
  it("filters by dataSourceId and time window", async () => {
    const src = await store.upsertDataSource({
      name: "Runs",
      slug: "runs",
      description: null,
      schema_definition: [],
      ingestion_methods: ["webhook"],
      webhook_token: null,
      active: true,
    });
    await store.insertRecord({
      data_source_id: src.id,
      payload: { status: "pass" },
      recorded_at: "2026-04-30T11:00:00.000Z",
      source_ref: null,
      ingested_via: "webhook",
    });
    await store.insertRecord({
      data_source_id: src.id,
      payload: { status: "fail" },
      recorded_at: "2026-04-29T11:00:00.000Z",
      source_ref: null,
      ingested_via: "webhook",
    });

    const result = await store.queryRecords({
      dataSourceId: src.id,
      since: "2026-04-30T00:00:00.000Z",
    });
    expect(result).toHaveLength(1);
    expect(result[0]?.payload).toEqual({ status: "pass" });
  });

  it("orders desc by default when orderBy=recorded_at_desc", async () => {
    const src = await store.upsertDataSource({
      name: "x",
      slug: "x",
      description: null,
      schema_definition: [],
      ingestion_methods: ["webhook"],
      webhook_token: null,
      active: true,
    });
    await store.insertRecord({
      data_source_id: src.id,
      payload: { n: 1 },
      recorded_at: "2026-04-30T10:00:00.000Z",
      source_ref: null,
      ingested_via: "webhook",
    });
    await store.insertRecord({
      data_source_id: src.id,
      payload: { n: 2 },
      recorded_at: "2026-04-30T11:00:00.000Z",
      source_ref: null,
      ingested_via: "webhook",
    });
    const desc = await store.queryRecords({
      dataSourceId: src.id,
      orderBy: "recorded_at_desc",
    });
    expect(desc.map((r) => r.payload.n)).toEqual([2, 1]);
  });
});
