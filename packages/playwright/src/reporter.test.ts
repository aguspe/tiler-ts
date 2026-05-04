import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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
    expect(Object.keys(snapshot.resolved)).toHaveLength(8);
  });

  it("renders extra panels declared inline in reporter options", async () => {
    const reporter = new TilerReporter({
      outDir,
      viewerClientDir,
      panels: [
        { widget_type: "metric", title: "Custom Inline", x: 0, width: 3, height: 2, config: {} },
      ],
    } as never);
    reporter.onBegin({} as never, {} as never);
    await reporter.onEnd({ status: "passed" } as never);
    const snapshot = JSON.parse(readFileSync(join(outDir, "snapshot.json"), "utf8")) as {
      panels: Array<{ title: string }>;
    };
    expect(snapshot.panels.map((p) => p.title)).toContain("Custom Inline");
  });

  it("invokes collect() and merges the records under the user data source's id", async () => {
    const startedAt = new Date("2026-05-03T00:00:00.000Z");
    const cov = {
      id: "01HCOVERAGEXXXXXXXXXXXXXXX",
      name: "coverage",
      slug: "coverage",
      description: "",
      schema_definition: [{ key: "pct", type: "float" as const }],
      ingestion_methods: ["manual" as const],
      webhook_token: null,
      active: true,
      created_at: startedAt.toISOString(),
      updated_at: startedAt.toISOString(),
    };
    const reporter = new TilerReporter({
      outDir,
      viewerClientDir,
      dataSources: [
        {
          source: cov,
          collect: async () => [
            {
              id: "01HCOVRECORDXXXXXXXXXXXXXX",
              data_source_id: "WILL_BE_OVERWRITTEN",
              payload: { pct: 87.5 },
              recorded_at: startedAt.toISOString(),
              source_ref: null,
              ingested_via: "manual",
              created_at: startedAt.toISOString(),
            },
          ],
        },
      ],
    } as never);
    reporter.onBegin({} as never, {} as never);
    await reporter.onEnd({ status: "passed" } as never);
    const snapshot = JSON.parse(readFileSync(join(outDir, "snapshot.json"), "utf8")) as {
      records: Array<{ data_source_id: string; payload: Record<string, unknown> }>;
    };
    const covRec = snapshot.records.find((r) => r.payload.pct === 87.5);
    expect(covRec).toBeDefined();
    expect(covRec!.data_source_id).toBe(cov.id);
  });

  it("warns and continues when a collector throws", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const startedAt = new Date("2026-05-03T00:00:00.000Z");
    const bad = {
      id: "01HBADXXXXXXXXXXXXXXXXXXXX",
      name: "bad",
      slug: "bad",
      description: "",
      schema_definition: [{ key: "v", type: "integer" as const }],
      ingestion_methods: ["manual" as const],
      webhook_token: null,
      active: true,
      created_at: startedAt.toISOString(),
      updated_at: startedAt.toISOString(),
    };
    const reporter = new TilerReporter({
      outDir,
      viewerClientDir,
      dataSources: [
        {
          source: bad,
          collect: async () => {
            throw new Error("boom");
          },
        },
      ],
    } as never);
    reporter.onBegin({} as never, {} as never);
    await expect(reporter.onEnd({ status: "passed" } as never)).resolves.toBeUndefined();
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("collect()"),
      expect.anything(),
    );
    warn.mockRestore();
  });
});
