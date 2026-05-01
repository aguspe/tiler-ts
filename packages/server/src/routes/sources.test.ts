import { MemoryStore } from "@aguspe/tiler-core";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { type TilerFastifyInstance, createServer } from "../server";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const BASE_SOURCE_PAYLOAD = {
  name: "Runs",
  slug: "runs",
  description: null,
  schema_definition: [
    { key: "status", type: "string" },
    { key: "duration_ms", type: "float" },
  ],
  ingestion_methods: ["webhook", "manual", "csv"],
  webhook_token: null,
  active: true,
};

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe("sources", () => {
  let app: TilerFastifyInstance;
  let store: MemoryStore;

  beforeEach(async () => {
    store = new MemoryStore();
    app = await createServer({ store, logger: false });
  });

  afterEach(async () => {
    await app.close();
  });

  it("GET / on empty store → []", async () => {
    const res = await app.inject({ method: "GET", url: "/api/data_sources" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual([]);
  });

  it("POST / creates a data source and returns 201", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/data_sources",
      headers: { "content-type": "application/json" },
      payload: BASE_SOURCE_PAYLOAD,
    });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.slug).toBe("runs");
    expect(body.id).toBeDefined();
  });

  it("GET /:slug returns the source after creation", async () => {
    await app.inject({
      method: "POST",
      url: "/api/data_sources",
      headers: { "content-type": "application/json" },
      payload: BASE_SOURCE_PAYLOAD,
    });
    const res = await app.inject({ method: "GET", url: "/api/data_sources/runs" });
    expect(res.statusCode).toBe(200);
    expect(res.json().slug).toBe("runs");
  });

  it("GET /:slug returns 404 for unknown slug", async () => {
    const res = await app.inject({ method: "GET", url: "/api/data_sources/nope" });
    expect(res.statusCode).toBe(404);
  });

  it("PATCH /:id updates the source", async () => {
    const create = await app.inject({
      method: "POST",
      url: "/api/data_sources",
      headers: { "content-type": "application/json" },
      payload: BASE_SOURCE_PAYLOAD,
    });
    const { id } = create.json();

    const patch = await app.inject({
      method: "PATCH",
      url: `/api/data_sources/${id}`,
      headers: { "content-type": "application/json" },
      payload: { name: "Updated Runs" },
    });
    expect(patch.statusCode).toBe(200);
    expect(patch.json().name).toBe("Updated Runs");
  });

  it("DELETE /:id returns 204 and removes the source", async () => {
    const create = await app.inject({
      method: "POST",
      url: "/api/data_sources",
      headers: { "content-type": "application/json" },
      payload: BASE_SOURCE_PAYLOAD,
    });
    const { id } = create.json();

    const del = await app.inject({ method: "DELETE", url: `/api/data_sources/${id}` });
    expect(del.statusCode).toBe(204);

    const get = await app.inject({ method: "GET", url: "/api/data_sources/runs" });
    expect(get.statusCode).toBe(404);
  });

  it("POST /:slug/records inserts a manual record", async () => {
    await app.inject({
      method: "POST",
      url: "/api/data_sources",
      headers: { "content-type": "application/json" },
      payload: BASE_SOURCE_PAYLOAD,
    });

    const res = await app.inject({
      method: "POST",
      url: "/api/data_sources/runs/records",
      headers: { "content-type": "application/json" },
      payload: {
        payload: { status: "passed", duration_ms: 1234.5 },
        recorded_at: "2025-01-01T00:00:00.000Z",
        source_ref: null,
      },
    });
    expect(res.statusCode).toBe(201);
    const record = res.json();
    expect(record.id).toBeDefined();
    expect(record.ingested_via).toBe("manual");
    expect(record.payload.status).toBe("passed");
  });

  it("POST /:slug/records returns 404 for unknown source", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/data_sources/unknown-slug/records",
      headers: { "content-type": "application/json" },
      payload: { payload: {}, source_ref: null },
    });
    expect(res.statusCode).toBe(404);
  });

  it("POST /:slug/import_csv with 3-row CSV inserts 3 records and returns { ingested: 3 }", async () => {
    await app.inject({
      method: "POST",
      url: "/api/data_sources",
      headers: { "content-type": "application/json" },
      payload: BASE_SOURCE_PAYLOAD,
    });

    const csv = [
      "recorded_at,status,duration_ms",
      "2025-01-01T00:00:00.000Z,passed,100",
      "2025-01-02T00:00:00.000Z,failed,200",
      "2025-01-03T00:00:00.000Z,passed,300",
    ].join("\n");

    const res = await app.inject({
      method: "POST",
      url: "/api/data_sources/runs/import_csv",
      headers: { "content-type": "text/csv" },
      payload: csv,
    });
    expect(res.statusCode).toBe(201);
    expect(res.json()).toEqual({ ingested: 3 });

    // Verify records are actually stored via the store directly
    const sources = await store.listDataSources();
    const source = sources.find((s) => s.slug === "runs");
    const storedRecords = await store.queryRecords({ dataSourceId: source?.id });
    expect(storedRecords).toHaveLength(3);
  });

  it("POST /:slug/import_csv returns 404 for unknown source", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/data_sources/nope/import_csv",
      headers: { "content-type": "text/csv" },
      payload: "recorded_at,status\n2025-01-01T00:00:00.000Z,ok",
    });
    expect(res.statusCode).toBe(404);
  });

  it("POST /:slug/import_csv with empty body returns 400", async () => {
    await app.inject({
      method: "POST",
      url: "/api/data_sources",
      headers: { "content-type": "application/json" },
      payload: BASE_SOURCE_PAYLOAD,
    });

    const res = await app.inject({
      method: "POST",
      url: "/api/data_sources/runs/import_csv",
      headers: { "content-type": "text/csv" },
      payload: "   ",
    });
    expect(res.statusCode).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// With basic auth
// ---------------------------------------------------------------------------

describe("sources — auth protection", () => {
  let app: TilerFastifyInstance;

  beforeEach(async () => {
    const store = new MemoryStore();
    app = await createServer({
      store,
      auth: { basic: { user: "admin", pass: "pw" } },
      logger: false,
    });
  });

  afterEach(async () => {
    await app.close();
  });

  it("POST / without auth → 401", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/data_sources",
      headers: { "content-type": "application/json" },
      payload: BASE_SOURCE_PAYLOAD,
    });
    expect(res.statusCode).toBe(401);
  });

  it("GET / requires no auth → 200", async () => {
    const res = await app.inject({ method: "GET", url: "/api/data_sources" });
    expect(res.statusCode).toBe(200);
  });
});
