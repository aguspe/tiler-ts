import { describe, expect, it } from "vitest";
import { ReporterOptions } from "./options";

describe("ReporterOptions", () => {
  it("applies all defaults when nothing provided", () => {
    const opts = ReporterOptions.parse({});
    expect(opts.outDir).toBe("tiler-report");
    expect(opts.preset).toBe("test_automation");
    expect(opts.captureLogs).toBe(false);
    expect(opts.linkTraceFiles).toBe(true);
  });
  it("accepts both relative and absolute outDir", () => {
    expect(ReporterOptions.safeParse({ outDir: "report" }).success).toBe(true);
    expect(ReporterOptions.safeParse({ outDir: "/tmp/report" }).success).toBe(true);
  });
  it("rejects an empty outDir", () => {
    expect(ReporterOptions.safeParse({ outDir: "" }).success).toBe(false);
  });
});
