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
  it("rejects an outDir with absolute path", () => {
    expect(ReporterOptions.safeParse({ outDir: "/etc/foo" }).success).toBe(false);
  });
});
