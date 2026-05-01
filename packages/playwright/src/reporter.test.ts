import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import "@aguspe/tiler-widgets";
import TilerReporter from "./reporter";

let tmp: string;
let outDir: string;
let viewerClientDir: string;

beforeEach(() => {
  tmp = mkdtempSync(join(tmpdir(), "tiler-playwright-test-"));
  outDir = join(tmp, "report");
  viewerClientDir = join(tmp, "node_modules", "@aguspe", "tiler-viewer", "dist", "client");
  mkdirSync(viewerClientDir, { recursive: true });
  writeFileSync(join(viewerClientDir, "viewer-test.js"), "/* fake js bundle */", "utf8");
  writeFileSync(join(viewerClientDir, "viewer-test.css"), "/* fake css */", "utf8");
});

afterEach(() => {
  rmSync(tmp, { recursive: true, force: true });
});

describe("TilerReporter", () => {
  it("writes index.html and snapshot.json with correct content", async () => {
    const reporter = new TilerReporter({ outDir, viewerClientDir });

    reporter.onBegin({} as never, {} as never);

    reporter.onTestEnd(
      {
        title: "test1",
        parent: { title: "suite a" },
        location: { file: "a.spec.ts", line: 1 },
      } as never,
      {
        status: "passed",
        duration: 100,
        retry: 0,
        attachments: [],
      } as never,
    );

    reporter.onTestEnd(
      {
        title: "test2",
        parent: { title: "suite a" },
        location: { file: "a.spec.ts", line: 2 },
      } as never,
      {
        status: "failed",
        duration: 200,
        retry: 0,
        attachments: [],
        error: { message: "boom" },
      } as never,
    );

    await reporter.onEnd({ status: "failed" } as never);

    const html = readFileSync(join(outDir, "index.html"), "utf8");
    const snapshotRaw = readFileSync(join(outDir, "snapshot.json"), "utf8");
    const snapshot = JSON.parse(snapshotRaw) as {
      dashboard: { slug: string };
      records: unknown[];
      resolved: Record<string, unknown>;
    };

    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("Test Automation");
    expect(snapshot.records).toHaveLength(2);
    expect(snapshot.dashboard.slug).toBe("test_automation");
    expect(Object.keys(snapshot.resolved)).toHaveLength(9);
  });
});
