import { describe, expect, it } from "vitest";
import { ReporterOptions } from "./options";

describe("ReporterOptions", () => {
  it("applies all defaults when nothing provided", () => {
    const opts = ReporterOptions.parse({});
    expect(opts.outDir).toBe("tiler-report");
    expect(opts.captureLogs).toBe(false);
    expect(opts.linkTraceFiles).toBe(true);
    expect(opts.excludePanels).toEqual([]);
    expect(opts.panels).toEqual([]);
    expect(opts.dataSources).toEqual([]);
    expect(opts.config).toBeUndefined();
    expect(opts.customConfig).toBeUndefined();
  });

  it("accepts both relative and absolute outDir", () => {
    expect(ReporterOptions.safeParse({ outDir: "report" }).success).toBe(true);
    expect(ReporterOptions.safeParse({ outDir: "/tmp/report" }).success).toBe(true);
  });

  it("rejects an empty outDir", () => {
    expect(ReporterOptions.safeParse({ outDir: "" }).success).toBe(false);
  });

  it("accepts inline panels with optional y", () => {
    const r = ReporterOptions.safeParse({
      panels: [
        { widget_type: "metric", title: "Custom", x: 0, width: 3, height: 2, config: {} },
        { widget_type: "metric", title: "Other",  x: 0, y: 8, width: 3, height: 2, config: {} },
      ],
    });
    expect(r.success).toBe(true);
  });

  it("rejects panels missing required fields", () => {
    const r = ReporterOptions.safeParse({
      panels: [{ widget_type: "metric", title: "Bad", x: 0, height: 2 }],
    });
    expect(r.success).toBe(false);
  });

  it("accepts a config file path string", () => {
    const r = ReporterOptions.safeParse({ config: "./tiler.config.ts" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.config).toBe("./tiler.config.ts");
  });

  it("accepts the deprecated customConfig alias", () => {
    const r = ReporterOptions.safeParse({ customConfig: "./old.config.ts" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.customConfig).toBe("./old.config.ts");
  });
});
