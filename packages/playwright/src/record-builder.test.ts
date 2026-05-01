import { describe, expect, it } from "vitest";
import { buildRecord, statusFromPlaywright } from "./record-builder";

describe("statusFromPlaywright", () => {
  it.each([
    ["passed", "pass"],
    ["failed", "fail"],
    ["timedOut", "fail"],
    ["interrupted", "fail"],
    ["skipped", "skip"],
  ])("maps %s → %s", (pw, tiler) => {
    expect(statusFromPlaywright(pw as never)).toBe(tiler);
  });
});

describe("buildRecord", () => {
  it("builds a DataRecord from the playwright test + result", () => {
    const record = buildRecord({
      dataSourceId: "ds1",
      now: new Date("2026-04-30T12:00:00.000Z"),
      test: {
        title: "places order",
        parent: { title: "checkout suite" },
        location: { file: "tests/checkout.spec.ts", line: 14 },
      },
      result: {
        status: "passed",
        duration: 142,
        retry: 0,
        attachments: [],
      },
      project: "chromium",
    });
    expect(record.payload.suite).toBe("checkout suite");
    expect(record.payload.test_name).toBe("places order");
    expect(record.payload.status).toBe("pass");
    expect(record.payload.duration_ms).toBe(142);
    expect(record.payload.project).toBe("chromium");
    expect(record.ingested_via).toBe("manual");
  });

  it("includes error_message when result.error.message is set", () => {
    const record = buildRecord({
      dataSourceId: "ds1",
      now: new Date("2026-04-30T12:00:00.000Z"),
      test: { title: "x", parent: { title: "y" } },
      result: {
        status: "failed",
        duration: 10,
        retry: 0,
        attachments: [],
        error: { message: "boom" },
      },
      project: "chromium",
    });
    expect(record.payload.error_message).toBe("boom");
  });

  it("includes trace_path when an attachment named 'trace' is present", () => {
    const record = buildRecord({
      dataSourceId: "ds1",
      now: new Date("2026-04-30T12:00:00.000Z"),
      test: { title: "x" },
      result: {
        status: "failed",
        duration: 10,
        retry: 0,
        attachments: [{ name: "trace", path: "/tmp/trace.zip" }],
      },
      project: "chromium",
    });
    expect(record.payload.trace_path).toBe("/tmp/trace.zip");
  });
});
