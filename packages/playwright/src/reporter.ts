import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import {
  buildSnapshot,
  MemoryStore,
  testAutomationPreset,
  type Dashboard,
  type DataRecord,
  type DataSource,
  type Panel,
} from "@aguspe/tiler-core";
import "@aguspe/tiler-widgets"; // register all widgets
import { renderToHtml } from "@aguspe/tiler-viewer";
import { copyClientAssets } from "./copy-assets";
import { ReporterOptions } from "./options";
import { buildRecord } from "./record-builder";

export interface TilerReporterOptions {
  outDir?: string;
  preset?: string;
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
  // ESM path: createRequire from current module URL.
  // eval("require") because tsup rewrites top-level require calls but not eval'd ones.
  // biome-ignore lint/security/noGlobalEval: standard ESM require shim
  const nodeModule = eval("require")("node:module") as typeof import("node:module");
  const r = nodeModule.createRequire(import.meta.url);
  const serverEntry = r.resolve("@aguspe/tiler-viewer");
  return resolve(dirname(serverEntry), "../client");
}

export default class TilerReporter implements PlaywrightReporter {
  private readonly opts: ReturnType<typeof ReporterOptions.parse>;
  private readonly viewerClientDirOverride?: string;

  private store!: MemoryStore;
  private dashboard!: Dashboard;
  private dataSource!: DataSource;
  private panels!: Panel[];
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
    const preset = testAutomationPreset({ now: this.startedAt });
    this.dashboard = preset.dashboard;
    this.dataSource = preset.dataSources[0]!;
    this.panels = preset.panels;
    this.records = [];
  }

  onTestEnd(test: unknown, result: unknown): void {
    const record = buildRecord({
      dataSourceId: this.dataSource.id,
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

    const viewerClientDir =
      this.viewerClientDirOverride ?? resolveViewerClientDir();

    const { jsEntry, cssEntry } = copyClientAssets({ viewerClientDir, outDir });

    const snapshot = await buildSnapshot({
      dashboard: this.dashboard,
      dataSources: [this.dataSource],
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
