import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { initCommand } from "./init";

let dir: string;
let prevCwd: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "tiler-init-"));
  prevCwd = process.cwd();
  process.chdir(dir);
});
afterEach(() => {
  process.chdir(prevCwd);
  rmSync(dir, { recursive: true, force: true });
});

describe("tiler init", () => {
  it("writes tiler.config.ts and .env.example", async () => {
    await initCommand({ force: false, store: "sqlite", port: 4567 });
    expect(existsSync(join(dir, "tiler.config.ts"))).toBe(true);
    expect(existsSync(join(dir, ".env.example"))).toBe(true);
    const config = readFileSync(join(dir, "tiler.config.ts"), "utf8");
    expect(config).toContain("BetterSqliteStore");
    expect(config).toContain("port: 4567");
  });

  it("memory store template skips sqlite import", async () => {
    await initCommand({ force: false, store: "memory", port: 9000 });
    const config = readFileSync(join(dir, "tiler.config.ts"), "utf8");
    expect(config).toContain("MemoryStore");
    expect(config).not.toContain("BetterSqliteStore");
    expect(config).toContain("port: 9000");
  });

  it("refuses to overwrite without --force", async () => {
    writeFileSync(join(dir, "tiler.config.ts"), "// existing\n");
    await expect(initCommand({ force: false, store: "sqlite", port: 4567 })).rejects.toThrow(
      /Refusing to overwrite/,
    );
  });

  it("--force overwrites existing files", async () => {
    writeFileSync(join(dir, "tiler.config.ts"), "// stale\n");
    await initCommand({ force: true, store: "sqlite", port: 4567 });
    const config = readFileSync(join(dir, "tiler.config.ts"), "utf8");
    expect(config).toContain("BetterSqliteStore");
  });
});
