import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import {
  type Dashboard,
  type DataRecord,
  type DataSource,
  MemoryStore,
  type Panel,
  buildSnapshot,
} from "@aguspe/tiler-core";
import "@aguspe/tiler-widgets"; // register all widgets
import { renderToHtml } from "@aguspe/tiler-viewer";
import { resolveConfig } from "./config-resolver";
import { copyClientAssets } from "./copy-assets";
import type { CollectContext } from "./define-config";
import { ReporterOptions } from "./options";
import { buildRecord } from "./record-builder";

export interface TilerReporterOptions {
  outDir?: string;
  preset?: "test_automation";
  excludePanels?: string[];
  panels?: unknown[];
  dataSources?: unknown[];
  dashboard?: { name?: string; slug?: string; description?: string };
  config?: string;
  /** @deprecated — use `config` instead. */
  customConfig?: string;
  captureLogs?: boolean;
  linkTraceFiles?: boolean;
  open?: boolean;
  /** Test override — points at a fake viewer dist for unit tests. */
  viewerClientDir?: string;
}

interface PlaywrightReporter {
  onBegin(config: unknown, suite: unknown): void;
  onTestEnd(test: unknown, result: unknown): void;
  onEnd(result: unknown): Promise<void> | void;
  printsToStdio?(): boolean;
}

function resolveViewerClientDir(): string {
  const isCjs = typeof require === "function";
  if (isCjs) {
    const serverEntry = require.resolve("@aguspe/tiler-viewer");
    return resolve(dirname(serverEntry), "../client");
  }
  // biome-ignore lint/security/noGlobalEval: standard ESM require shim
  const nodeModule = eval("require")("node:module") as typeof import("node:module");
  const r = nodeModule.createRequire(import.meta.url);
  const serverEntry = r.resolve("@aguspe/tiler-viewer");
  return resolve(dirname(serverEntry), "../client");
}

export default class TilerReporter implements PlaywrightReporter {
  private readonly opts: ReturnType<typeof ReporterOptions.parse>;
  private readonly viewerClientDirOverride: string | undefined;

  private store!: MemoryStore;
  private dashboard!: Dashboard;
  private dataSources!: DataSource[];
  private dataSourceTestRunsId!: string;
  private panels!: Panel[];
  private collectors!: Map<string, (ctx: CollectContext) => Promise<DataRecord[]>>;
  private records: DataRecord[] = [];
  private startedAt!: Date;

  constructor(rawOpts: TilerReporterOptions = {}) {
    const { viewerClientDir, ...rest } = rawOpts;
    this.viewerClientDirOverride = viewerClientDir;
    this.opts = ReporterOptions.parse(rest);
  }

  printsToStdio(): boolean {
    return false;
  }

  onBegin(_config: unknown, _suite: unknown): void {
    this.startedAt = new Date();
    this.store = new MemoryStore();
    const resolved = resolveConfig({ rawOpts: this.opts, startedAt: this.startedAt });
    this.dashboard = resolved.dashboard;
    this.dataSources = resolved.dataSources;
    const testRuns = resolved.dataSources.find((d) => d.slug === "test_runs");
    if (!testRuns) {
      throw new Error(
        "[tiler-playwright] preset must include a `test_runs` data source",
      );
    }
    this.dataSourceTestRunsId = testRuns.id;
    this.panels = resolved.panels;
    this.collectors = resolved.collectors;
    this.records = [];
  }

  onTestEnd(test: unknown, result: unknown): void {
    const record = buildRecord({
      dataSourceId: this.dataSourceTestRunsId,
      now: new Date(),
      test: test as Parameters<typeof buildRecord>[0]["test"],
      result: result as Parameters<typeof buildRecord>[0]["result"],
      project: "default",
    });
    this.records.push(record);
  }

  async onEnd(_result: unknown): Promise<void> {
    const outDir = resolve(this.opts.outDir);
    mkdirSync(outDir, { recursive: true });

    const endedAt = new Date();
    for (const [sourceId, collect] of this.collectors) {
      let extra: DataRecord[] = [];
      try {
        extra = await collect({ outDir, startedAt: this.startedAt, endedAt });
      } catch (err) {
        console.warn(
          `[tiler-playwright] collect() for data source ${sourceId} threw — skipping its records.`,
          err,
        );
        continue;
      }
      for (const r of extra) {
        this.records.push({ ...r, data_source_id: sourceId });
      }
    }

    const viewerClientDir = this.viewerClientDirOverride ?? resolveViewerClientDir();
    const { jsEntry, cssEntry } = copyClientAssets({ viewerClientDir, outDir });

    const snapshot = await buildSnapshot({
      dashboard: this.dashboard,
      dataSources: this.dataSources,
      panels: this.panels,
      records: this.records,
      now: new Date(),
    });

    const renderOpts: Parameters<typeof renderToHtml>[1] = {
      clientAssetPath: `./${jsEntry}`,
    };
    if (cssEntry !== undefined) {
      renderOpts.cssAssetPath = `./${cssEntry}`;
    }
    const html = renderToHtml(snapshot, renderOpts);

    writeFileSync(`${outDir}/index.html`, html, "utf8");
    writeFileSync(`${outDir}/snapshot.json`, JSON.stringify(snapshot, null, 2), "utf8");
  }
}
