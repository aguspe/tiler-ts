import { mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { copyClientAssets } from "./copy-assets";

let tmp: string;
let viewerDist: string;
let outDir: string;

beforeEach(() => {
  tmp = mkdtempSync(join(tmpdir(), "tiler-pw-"));
  viewerDist = join(tmp, "viewer-dist");
  outDir = join(tmp, "out");
  mkdirSync(viewerDist, { recursive: true });
  writeFileSync(join(viewerDist, "viewer-abc.js"), "console.log(1)");
  writeFileSync(join(viewerDist, "viewer-abc.css"), "body{}");
});
afterEach(() => rmSync(tmp, { recursive: true, force: true }));

describe("copyClientAssets", () => {
  it("copies all files to outDir/assets and returns the entry paths", () => {
    const result = copyClientAssets({ viewerClientDir: viewerDist, outDir });
    const files = readdirSync(join(outDir, "assets"));
    expect(files.sort()).toEqual(["viewer-abc.css", "viewer-abc.js"]);
    expect(result.jsEntry).toMatch(/^assets\/viewer-[a-z0-9]+\.js$/);
    expect(result.cssEntry).toMatch(/^assets\/viewer-[a-z0-9]+\.css$/);
  });

  it("throws a helpful error when the viewer dist has no JS", () => {
    const empty = join(tmp, "empty");
    mkdirSync(empty);
    expect(() => copyClientAssets({ viewerClientDir: empty, outDir })).toThrow(
      /No JS bundle found/,
    );
  });
});
