import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { loadConfigFile } from "./config-loader";

const fixtures = (name: string) => resolve(__dirname, "__fixtures__", name);

describe("loadConfigFile", () => {
  it("loads a valid config and returns its default export", () => {
    const cfg = loadConfigFile(fixtures("valid-config.ts"));
    expect(cfg.excludePanels).toEqual(["Pass Rate"]);
    expect(cfg.panels?.[0]?.title).toBe("From File");
  });

  it("throws when the file has no default export", () => {
    expect(() => loadConfigFile(fixtures("no-default-export.ts"))).toThrow(
      /default export/,
    );
  });

  it("throws when the file does not exist", () => {
    expect(() => loadConfigFile(fixtures("does-not-exist.ts"))).toThrow();
  });
});
