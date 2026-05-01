import { MemoryStore } from "@aguspe/tiler-core";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createServer, type TilerFastifyInstance } from "../server";
import { makeBasicAuthHook, makeCsrfHook } from "./index";

describe("makeBasicAuthHook", () => {
  it("is a no-op when cfg.basic is unset", async () => {
    const hook = makeBasicAuthHook({});
    // Calling it with throwaway args should not throw or send anything.
    await expect(
      hook({ headers: {} } as never, {} as never),
    ).resolves.toBeUndefined();
  });
});

describe("makeCsrfHook", () => {
  it("is a no-op when cfg.basic is unset", async () => {
    const hook = makeCsrfHook({});
    await expect(
      hook({ headers: {}, method: "POST" } as never, {} as never),
    ).resolves.toBeUndefined();
  });
});

describe("auth integration via Fastify", () => {
  let app: TilerFastifyInstance;
  beforeEach(async () => {
    const store = new MemoryStore();
    app = await createServer({
      store,
      auth: { basic: { user: "admin", pass: "secret" } },
      logger: false,
    });
    app.addHook("preHandler", makeBasicAuthHook(app.tilerConfig.auth));
    app.post("/echo", async () => ({ ok: true }));
  });
  afterEach(async () => {
    await app.close();
  });

  it("rejects requests without Authorization header (401)", async () => {
    const res = await app.inject({ method: "POST", url: "/echo" });
    expect(res.statusCode).toBe(401);
  });

  it("accepts requests with the correct Basic header", async () => {
    const auth = `Basic ${Buffer.from("admin:secret").toString("base64")}`;
    const res = await app.inject({
      method: "POST",
      url: "/echo",
      headers: { authorization: auth },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true });
  });

  it("rejects requests with the wrong password (401)", async () => {
    const auth = `Basic ${Buffer.from("admin:wrong").toString("base64")}`;
    const res = await app.inject({
      method: "POST",
      url: "/echo",
      headers: { authorization: auth },
    });
    expect(res.statusCode).toBe(401);
  });
});
