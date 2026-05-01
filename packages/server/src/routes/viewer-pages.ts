import { dirname, resolve } from "node:path";
import { buildSnapshot, type ResolvedTilerConfig, type TilerStore } from "@aguspe/tiler-core";
import "@aguspe/tiler-widgets"; // side effect: register all widgets
import { renderToHtml } from "@aguspe/tiler-viewer";
import fastifyStatic from "@fastify/static";
import type { FastifyPluginAsync } from "fastify";
import { readdirSync } from "node:fs";

const RECORDS_LOOKBACK_MS = 30 * 24 * 3600_000;

function resolveViewerClientDir(): string {
  const isCjs = typeof require === "function";
  if (isCjs) {
    const serverEntry = require.resolve("@aguspe/tiler-viewer");
    return resolve(dirname(serverEntry), "../client");
  }
  // biome-ignore lint/security/noGlobalEval: ESM require shim — tsup rewrites top-level require but not eval'd ones
  const nodeModule = eval("require")("node:module") as typeof import("node:module");
  const r = nodeModule.createRequire(import.meta.url);
  const serverEntry = r.resolve("@aguspe/tiler-viewer");
  return resolve(dirname(serverEntry), "../client");
}

function findAsset(dir: string, ext: ".js" | ".css"): string | undefined {
  for (const entry of readdirSync(dir)) {
    if (entry.endsWith(ext) && !entry.endsWith(".map")) return entry;
  }
  return undefined;
}

/**
 * Plugin:
 *   - Serves `/assets/*` from `@aguspe/tiler-viewer/dist/client/`.
 *   - Renders `/dashboards/:slug` as SSR'd HTML using the viewer.
 *   - Renders `/dashboards` as a minimal list page linking to each dashboard.
 */
export const viewerPagesPlugin: FastifyPluginAsync = async (app) => {
  const cfg = (app as unknown as { tilerConfig: ResolvedTilerConfig }).tilerConfig;
  const store: TilerStore = cfg.store;

  const viewerClientDir = cfg.viewerClientDir ?? resolveViewerClientDir();
  const jsAsset = findAsset(viewerClientDir, ".js");
  const cssAsset = findAsset(viewerClientDir, ".css");

  // Serve viewer's prebuilt client bundle from /assets/*.
  await app.register(fastifyStatic, {
    root: viewerClientDir,
    prefix: "/assets/",
    index: false,
  });

  // List page.
  app.get("/dashboards", async (_req, reply) => {
    const dashboards = await store.listDashboards();
    const items = dashboards
      .map(
        (d) =>
          `<li><a href="/dashboards/${d.slug}" style="color:var(--tiler-color-accent)">${escapeHtml(d.name)}</a></li>`,
      )
      .join("\n");
    const body = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>tiler-ts dashboards</title>
${cssAsset ? `<link rel="stylesheet" href="/assets/${cssAsset}">` : ""}
</head>
<body style="background:var(--tiler-color-page,#0b0d12);color:var(--tiler-color-text,#e6edf3);font-family:var(--tiler-font-sans,system-ui);padding:32px">
<h1>Dashboards</h1>
${items.length > 0 ? `<ul>${items}</ul>` : `<p style="opacity:0.7">No dashboards yet.</p>`}
</body>
</html>`;
    return reply.type("text/html").send(body);
  });

  // Detail page.
  app.get<{ Params: { slug: string } }>("/dashboards/:slug", async (req, reply) => {
    const dashboard = await store.getDashboard(req.params.slug);
    if (!dashboard) return reply.code(404).send({ error: "not found" });
    const panels = await store.listPanels(dashboard.id);
    const allSources = await store.listDataSources();
    const referencedSourceIds = new Set(
      panels.map((p) => p.data_source_id).filter((x): x is string => x !== null),
    );
    const dataSources = allSources.filter((s) => referencedSourceIds.has(s.id));
    const since = new Date(Date.now() - RECORDS_LOOKBACK_MS).toISOString();
    const recordBatches = await Promise.all(
      dataSources.map((s) =>
        store.queryRecords({ dataSourceId: s.id, since, orderBy: "recorded_at_desc" }),
      ),
    );
    const records = recordBatches.flat();
    const snapshot = await buildSnapshot({
      dashboard,
      dataSources,
      panels,
      records,
      now: new Date(),
    });

    if (!jsAsset) {
      return reply
        .code(500)
        .send({ error: `viewer client bundle not found in ${viewerClientDir}` });
    }
    const html = renderToHtml(snapshot, {
      clientAssetPath: `/assets/${jsAsset}`,
      ...(cssAsset && { cssAssetPath: `/assets/${cssAsset}` }),
    });
    return reply.type("text/html").send(html);
  });
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
