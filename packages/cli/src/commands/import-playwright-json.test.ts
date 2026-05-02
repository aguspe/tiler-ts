import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { importPlaywrightJsonCommand } from "./import-playwright-json";

let dir: string;
let prevCwd: string;

const MINI_REPORT = {
  suites: [
    {
      title: "checkout",
      specs: [
        {
          title: "creates an order",
          tests: [{ results: [{ status: "passed", duration: 1234 }] }],
        },
      ],
      suites: [
        {
          title: "edge",
          specs: [
            {
              title: "rejects empty cart",
              tests: [{ results: [{ status: "failed", duration: 567 }] }],
            },
          ],
        },
      ],
    },
  ],
};

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "tiler-import-"));
  prevCwd = process.cwd();
  process.chdir(dir);
});
afterEach(() => {
  process.chdir(prevCwd);
  rmSync(dir, { recursive: true, force: true });
});

describe("tiler import-playwright-json", () => {
  it("flattens specs into ingest records and writes them", async () => {
    writeFileSync("report.json", JSON.stringify(MINI_REPORT));
    await importPlaywrightJsonCommand({
      file: "report.json",
      out: "out.json",
      sourceSlug: "test_runs",
    });
    const records = JSON.parse(readFileSync("out.json", "utf8")) as Array<{
      payload: Record<string, unknown>;
    }>;
    expect(records).toHaveLength(2);
    expect(records[0]?.payload).toMatchObject({
      suite: "checkout",
      test_name: "creates an order",
      status: "passed",
      duration_ms: 1234,
    });
    expect(records[1]?.payload).toMatchObject({
      suite: "checkout > edge",
      test_name: "rejects empty cart",
      status: "failed",
    });
  });

  it("requires --out or --server", async () => {
    writeFileSync("report.json", JSON.stringify({ suites: [] }));
    await expect(
      importPlaywrightJsonCommand({ file: "report.json", sourceSlug: "test_runs" }),
    ).rejects.toThrow(/Provide either --out/);
  });

  it("requires a secret when posting to a server", async () => {
    writeFileSync("report.json", JSON.stringify({ suites: [] }));
    await expect(
      importPlaywrightJsonCommand({
        file: "report.json",
        server: "http://localhost:4567",
        sourceSlug: "test_runs",
      }),
    ).rejects.toThrow(/secret/);
  });
});
