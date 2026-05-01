import { MemoryStore } from "@aguspe/tiler-core";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { type TilerFastifyInstance, createServer } from "../server";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeCsrfHeaders(token: string): Record<string, string> {
  return {
    "x-tiler-csrf": token,
    Cookie: `tiler-csrf=${token}`,
  };
}

function basicAuth(user: string, pass: string): string {
  return `Basic ${Buffer.from(`${user}:${pass}`).toString("base64")}`;
}

// ---------------------------------------------------------------------------
// Unauthenticated app (read-only checks + auth-required checks)
// ---------------------------------------------------------------------------

describe("dashboards — no auth configured", () => {
  let app: TilerFastifyInstance;

  beforeEach(async () => {
    const store = new MemoryStore();
    app = await createServer({ store, logger: false });
  });

  afterEach(async () => {
    await app.close();
  });

  it("GET / on empty store → []", async () => {
    const res = await app.inject({ method: "GET", url: "/api/dashboards" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual([]);
  });

  it("POST / creates a dashboard and returns 201", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/dashboards",
      headers: { "content-type": "application/json" },
      payload: {
        name: "Test Dashboard",
        slug: "test-dashboard",
        description: "A test",
        refresh_seconds: 60,
        settings: { tv_mode: false },
      },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.slug).toBe("test-dashboard");
    expect(body.name).toBe("Test Dashboard");
    expect(body.id).toBeDefined();
    expect(body.created_at).toBeDefined();
  });

  it("GET /:slug returns the dashboard snapshot after creation", async () => {
    // Create first
    const create = await app.inject({
      method: "POST",
      url: "/api/dashboards",
      headers: { "content-type": "application/json" },
      payload: { name: "Snap Test", slug: "snap-test", settings: { tv_mode: false } },
    });
    expect(create.statusCode).toBe(201);

    const res = await app.inject({ method: "GET", url: "/api/dashboards/snap-test" });
    expect(res.statusCode).toBe(200);
    const snapshot = res.json();
    expect(snapshot.version).toBe(1);
    expect(snapshot.dashboard.slug).toBe("snap-test");
    expect(snapshot.panels).toEqual([]);
    expect(snapshot.records).toEqual([]);
    expect(snapshot.resolved).toEqual({});
  });

  it("GET /:slug returns 404 for unknown slug", async () => {
    const res = await app.inject({ method: "GET", url: "/api/dashboards/does-not-exist" });
    expect(res.statusCode).toBe(404);
  });

  it("PATCH /:id updates a dashboard", async () => {
    const create = await app.inject({
      method: "POST",
      url: "/api/dashboards",
      headers: { "content-type": "application/json" },
      payload: { name: "Old Name", slug: "patch-me", settings: { tv_mode: false } },
    });
    const created = create.json();

    const patch = await app.inject({
      method: "PATCH",
      url: `/api/dashboards/${created.id}`,
      headers: { "content-type": "application/json" },
      payload: { name: "New Name" },
    });
    expect(patch.statusCode).toBe(200);
    expect(patch.json().name).toBe("New Name");
    expect(patch.json().slug).toBe("patch-me");
  });

  it("PATCH /:id returns 404 for unknown id", async () => {
    const res = await app.inject({
      method: "PATCH",
      url: "/api/dashboards/nonexistent-id",
      headers: { "content-type": "application/json" },
      payload: { name: "X" },
    });
    expect(res.statusCode).toBe(404);
  });

  it("DELETE /:id returns 204", async () => {
    const create = await app.inject({
      method: "POST",
      url: "/api/dashboards",
      headers: { "content-type": "application/json" },
      payload: { name: "Delete Me", slug: "delete-me", settings: { tv_mode: false } },
    });
    const { id } = create.json();

    const del = await app.inject({ method: "DELETE", url: `/api/dashboards/${id}` });
    expect(del.statusCode).toBe(204);

    // Confirm gone
    const get = await app.inject({ method: "GET", url: "/api/dashboards/delete-me" });
    expect(get.statusCode).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// Authenticated app
// ---------------------------------------------------------------------------

describe("dashboards — with basic auth configured", () => {
  let app: TilerFastifyInstance;

  beforeEach(async () => {
    const store = new MemoryStore();
    app = await createServer({
      store,
      auth: { basic: { user: "admin", pass: "secret" } },
      logger: false,
    });
  });

  afterEach(async () => {
    await app.close();
  });

  it("POST / without auth → 401", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/dashboards",
      headers: { "content-type": "application/json" },
      payload: { name: "X", slug: "x", settings: { tv_mode: false } },
    });
    expect(res.statusCode).toBe(401);
  });

  it("POST / with auth but missing CSRF → 403", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/dashboards",
      headers: {
        "content-type": "application/json",
        authorization: basicAuth("admin", "secret"),
        // no CSRF header/cookie
      },
      payload: { name: "X", slug: "x", settings: { tv_mode: false } },
    });
    expect(res.statusCode).toBe(403);
  });

  it("POST / with auth + CSRF → 201", async () => {
    const csrfToken = "test-csrf-token-abc";
    const res = await app.inject({
      method: "POST",
      url: "/api/dashboards",
      headers: {
        "content-type": "application/json",
        authorization: basicAuth("admin", "secret"),
        ...makeCsrfHeaders(csrfToken),
      },
      payload: { name: "Auth Dashboard", slug: "auth-dashboard", settings: { tv_mode: false } },
    });
    expect(res.statusCode).toBe(201);
  });

  it("GET / requires no auth and returns 200", async () => {
    const res = await app.inject({ method: "GET", url: "/api/dashboards" });
    expect(res.statusCode).toBe(200);
  });
});
