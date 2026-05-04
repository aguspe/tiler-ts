import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { newId } from "@aguspe/tiler-core";
import { definePlaywrightConfig } from "@aguspe/tiler-playwright";
import "./widgets/flaky-tests";

const COVERAGE_SOURCE_ID = "01HCOVERAGEEXAMPLEXXXXXXX1";

export default definePlaywrightConfig({
  excludePanels: ["Pass Rate"],
  panels: [
    {
      widget_type: "flaky_tests",
      title: "Flaky last 30 runs",
      x: 0,
      width: 6,
      height: 4,
      config: { window: 30 },
    },
  ],
  dataSources: [
    {
      source: {
        id: COVERAGE_SOURCE_ID,
        name: "Coverage",
        slug: "coverage",
        description: "Per-file coverage from coverage.json.",
        schema_definition: [
          { key: "path", type: "string" },
          { key: "pct", type: "float" },
        ],
        ingestion_methods: ["manual"],
        webhook_token: null,
        active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      collect: async ({ startedAt }) => {
        const raw = JSON.parse(
          readFileSync(resolve(process.cwd(), "coverage.json"), "utf8"),
        ) as { files: Array<{ path: string; pct: number }> };
        const iso = startedAt.toISOString();
        return raw.files.map((f) => ({
          id: newId(),
          data_source_id: COVERAGE_SOURCE_ID,
          payload: { path: f.path, pct: f.pct },
          recorded_at: iso,
          source_ref: null,
          ingested_via: "manual" as const,
          created_at: iso,
        }));
      },
    },
  ],
});
