import { MemoryStore } from "@aguspe/tiler-core";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { signBody } from "../auth";
import { createServer, type TilerFastifyInstance } from "../server";

// ---------------------------------------------------------------------------
// Setup helpers
// ---------------------------------------------------------------------------

const WEBHOOK_SECRET = "test-secret";

const SOURCE_INPUT = {
  name: "Runs",
  slug: "runs",
  description: null,
  schema_definition: [
    { key: "status", type: "string" as const },
    { key: "duration_ms", type: "float" as const },
  ],
  ingestion_methods: ["webhook" as const],
  webhook_token: null,
  active: true,
};

function makePayload(overrides?: Record<string, unknown>): Record<string, unknown> {
  return {
    status: "passed",
    duration_ms: 42.5,
    recorded_at: new Date().toISOString(),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe("ingest", () => {
  let app: TilerFastifyInstance;
  let store: MemoryStore;

  beforeEach(async () => {
    store = new MemoryStore();
    await store.upsertDataSource(SOURCE_INPUT);
    app = await createServer({
      store,
      auth: { webhookSecret: WEBHOOK_SECRET },
      logger: false,
    });
  });

  afterEach(async () => {
    await app.close();
  });

  it("POST /:source_slug with valid HMAC → 201 + { status: ok, id }", async () => {
    const body = JSON.stringify(makePayload());
    const sig = signBody(WEBHOOK_SECRET, body);

    const res = await app.inject({
      method: "POST",
      url: "/ingest/runs",
      headers: {
        "content-type": "application/json",
        "x-tiler-signature": sig,
      },
      payload: body,
    });
    expect(res.statusCode).toBe(201);
    const json = res.json();
    expect(json.status).toBe("ok");
    expect(json.id).toBeDefined();
  });

  it("POST /:source_slug without x-tiler-signature → 401", async () => {
    const body = JSON.stringify(makePayload());

    const res = await app.inject({
      method: "POST",
      url: "/ingest/runs",
      headers: { "content-type": "application/json" },
      payload: body,
    });
    expect(res.statusCode).toBe(401);
    expect(res.json().error).toBe("missing signature");
  });

  it("POST /:source_slug with wrong signature → 401", async () => {
    const body = JSON.stringify(makePayload());
    const wrongSig = signBody("wrong-secret", body);

    const res = await app.inject({
      method: "POST",
      url: "/ingest/runs",
      headers: {
        "content-type": "application/json",
        "x-tiler-signature": wrongSig,
      },
      payload: body,
    });
    expect(res.statusCode).toBe(401);
    expect(res.json().error).toBe("invalid signature");
  });

  it("POST /:source_slug with tampered body → 401", async () => {
    const originalBody = JSON.stringify(makePayload());
    const sig = signBody(WEBHOOK_SECRET, originalBody);
    const tamperedBody = JSON.stringify({ ...makePayload(), status: "injected" });

    const res = await app.inject({
      method: "POST",
      url: "/ingest/runs",
      headers: {
        "content-type": "application/json",
        "x-tiler-signature": sig,
      },
      payload: tamperedBody,
    });
    expect(res.statusCode).toBe(401);
  });

  it("POST /:source_slug for unknown source → 404", async () => {
    const body = JSON.stringify(makePayload());
    const sig = signBody(WEBHOOK_SECRET, body);

    const res = await app.inject({
      method: "POST",
      url: "/ingest/no-such-source",
      headers: {
        "content-type": "application/json",
        "x-tiler-signature": sig,
      },
      payload: body,
    });
    expect(res.statusCode).toBe(404);
  });

  it("POST /:source_slug with body containing unknown field → 400", async () => {
    const body = JSON.stringify({
      status: "passed",
      duration_ms: 10,
      recorded_at: new Date().toISOString(),
      rogue_field: "surprise",
    });
    const sig = signBody(WEBHOOK_SECRET, body);

    const res = await app.inject({
      method: "POST",
      url: "/ingest/runs",
      headers: {
        "content-type": "application/json",
        "x-tiler-signature": sig,
      },
      payload: body,
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toContain("unknown field");
  });

  it("POST /:source_slug with recorded_at too far in the past → 400", async () => {
    const pastDate = new Date(Date.now() - 60 * 24 * 3_600_000).toISOString(); // 60 days ago
    const body = JSON.stringify({ status: "passed", duration_ms: 1, recorded_at: pastDate });
    const sig = signBody(WEBHOOK_SECRET, body);

    const res = await app.inject({
      method: "POST",
      url: "/ingest/runs",
      headers: {
        "content-type": "application/json",
        "x-tiler-signature": sig,
      },
      payload: body,
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe("recorded_at outside skew window");
  });

  it("POST /:source_slug with recorded_at in the future → 400", async () => {
    const futureDate = new Date(Date.now() + 10 * 60_000).toISOString(); // 10 minutes from now
    const body = JSON.stringify({ status: "passed", duration_ms: 1, recorded_at: futureDate });
    const sig = signBody(WEBHOOK_SECRET, body);

    const res = await app.inject({
      method: "POST",
      url: "/ingest/runs",
      headers: {
        "content-type": "application/json",
        "x-tiler-signature": sig,
      },
      payload: body,
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe("recorded_at outside skew window");
  });

  it("POST /:source_slug with invalid JSON body → 400", async () => {
    const body = "not-json{bad";
    const sig = signBody(WEBHOOK_SECRET, body);

    const res = await app.inject({
      method: "POST",
      url: "/ingest/runs",
      headers: {
        "content-type": "application/json",
        "x-tiler-signature": sig,
      },
      payload: body,
    });
    expect(res.statusCode).toBe(400);
  });

  it("inserts record into the store and it is queryable", async () => {
    const body = JSON.stringify(makePayload({ status: "passed", duration_ms: 99.9 }));
    const sig = signBody(WEBHOOK_SECRET, body);

    await app.inject({
      method: "POST",
      url: "/ingest/runs",
      headers: {
        "content-type": "application/json",
        "x-tiler-signature": sig,
      },
      payload: body,
    });

    const sources = await store.listDataSources();
    const source = sources.find((s) => s.slug === "runs")!;
    const records = await store.queryRecords({ dataSourceId: source.id });
    expect(records).toHaveLength(1);
    expect(records[0]!.payload["duration_ms"]).toBe(99.9);
    expect(records[0]!.ingested_via).toBe("webhook");
  });
});

// ---------------------------------------------------------------------------
// Per-source token override
// ---------------------------------------------------------------------------

describe("ingest — per-source webhook token", () => {
  let app: TilerFastifyInstance;
  let store: MemoryStore;
  const PER_SOURCE_TOKEN = "per-source-token-xyz";

  beforeEach(async () => {
    store = new MemoryStore();
    await store.upsertDataSource({ ...SOURCE_INPUT, webhook_token: PER_SOURCE_TOKEN });
    app = await createServer({
      store,
      auth: { webhookSecret: "global-secret-should-not-be-used" },
      logger: false,
    });
  });

  afterEach(async () => {
    await app.close();
  });

  it("uses the per-source token for HMAC verification → 201", async () => {
    const body = JSON.stringify(makePayload());
    const sig = signBody(PER_SOURCE_TOKEN, body);

    const res = await app.inject({
      method: "POST",
      url: "/ingest/runs",
      headers: {
        "content-type": "application/json",
        "x-tiler-signature": sig,
      },
      payload: body,
    });
    expect(res.statusCode).toBe(201);
  });

  it("rejects the global secret when per-source token is set → 401", async () => {
    const body = JSON.stringify(makePayload());
    const sig = signBody("global-secret-should-not-be-used", body);

    const res = await app.inject({
      method: "POST",
      url: "/ingest/runs",
      headers: {
        "content-type": "application/json",
        "x-tiler-signature": sig,
      },
      payload: body,
    });
    expect(res.statusCode).toBe(401);
  });
});
