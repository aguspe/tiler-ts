import { describe, expect, it } from "vitest";
import { defineConfig } from "./config";
import { MemoryStore } from "./memory_store";

describe("defineConfig", () => {
  it("accepts a minimal config and applies defaults", () => {
    const cfg = defineConfig({
      store: new MemoryStore(),
    });
    expect(cfg.port).toBe(4567);
    expect(cfg.host).toBe("127.0.0.1");
    expect(cfg.widgets).toEqual([]);
    expect(cfg.presets).toEqual([]);
    expect(cfg.auth).toEqual({});
  });

  it("preserves all provided fields", () => {
    const cfg = defineConfig({
      store: new MemoryStore(),
      port: 8080,
      host: "0.0.0.0",
      auth: { basic: { user: "x", pass: "y" }, webhookSecret: "secret" },
      widgets: ["@aguspe/tiler-widgets"],
      presets: ["test_automation"],
    });
    expect(cfg.port).toBe(8080);
    expect(cfg.host).toBe("0.0.0.0");
    expect(cfg.auth.basic?.user).toBe("x");
    expect(cfg.auth.webhookSecret).toBe("secret");
    expect(cfg.widgets).toEqual(["@aguspe/tiler-widgets"]);
    expect(cfg.presets).toEqual(["test_automation"]);
  });

  it("only includes viewerClientDir when explicitly provided", () => {
    const cfg = defineConfig({ store: new MemoryStore() });
    expect(cfg.viewerClientDir).toBeUndefined();
    const cfg2 = defineConfig({
      store: new MemoryStore(),
      viewerClientDir: "/custom/path",
    });
    expect(cfg2.viewerClientDir).toBe("/custom/path");
  });
});
