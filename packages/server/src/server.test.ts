import { MemoryStore } from "@aguspe/tiler-core";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { type TilerFastifyInstance, createServer } from "./server";

let app: TilerFastifyInstance;

beforeEach(async () => {
  const store = new MemoryStore();
  app = await createServer({ store, logger: false });
});
afterEach(async () => {
  await app.close();
});

describe("createServer", () => {
  it("responds 200 on /healthz with { status: 'ok' }", async () => {
    const res = await app.inject({ method: "GET", url: "/healthz" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: "ok" });
  });

  it("redirects GET / to /dashboards", async () => {
    const res = await app.inject({ method: "GET", url: "/" });
    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toBe("/dashboards");
  });

  it("decorates the Fastify instance with the resolved Tiler config", () => {
    expect(app.tilerConfig).toBeDefined();
    expect(app.tilerConfig.port).toBe(4567);
    expect(app.tilerConfig.host).toBe("127.0.0.1");
  });

  it("seeds dashboards from config on createServer", async () => {
    const store = new MemoryStore();
    const app = await createServer({
      store,
      presets: ["test_automation"],
      logger: false,
    });
    const dash = await store.getDashboard("test_automation");
    expect(dash).not.toBeNull();
    await app.close();
  });
});
