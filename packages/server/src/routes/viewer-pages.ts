import { readdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { type ResolvedTilerConfig, type TilerStore, buildSnapshot } from "@aguspe/tiler-core";
import { renderEditorHtml } from "@aguspe/tiler-editor";
import "@aguspe/tiler-widgets"; // side effect: register all widgets
import fastifyStatic from "@fastify/static";
import type { FastifyPluginAsync } from "fastify";

const RECORDS_LOOKBACK_MS = 30 * 24 * 3600_000;

function resolveEditorClientDir(): string {
  const r = createRequire(import.meta.url);
  const serverEntry = r.resolve("@aguspe/tiler-editor");
  return resolve(dirname(serverEntry), "../client");
}

function findEntryJs(dir: string): string | undefined {
  // Vite splits the bundle into an entry + zero or more vendor chunks.
  // The editor's vite.config names them `editor-entry-<hash>.js` vs
  // `editor-chunk-<hash>.js`, so we filter by the `editor-entry-` prefix.
  for (const entry of readdirSync(dir)) {
    if (entry.startsWith("editor-entry-") && entry.endsWith(".js")) return entry;
  }
  return undefined;
}

function findCss(dir: string): string | undefined {
  for (const entry of readdirSync(dir)) {
    if (entry.endsWith(".css") && !entry.endsWith(".map")) return entry;
  }
  return undefined;
}

/**
 * Plugin:
 *   - Serves `/assets/*` from `@aguspe/tiler-editor/dist/client/`.
 *   - Renders `/dashboards/:slug` as SSR'd HTML using the editor.
 *   - Renders `/dashboards` as a minimal list page linking to each dashboard.
 *
 * Phase 5 swap: the editor SSR shell replaces the read-only viewer at
 * `/dashboards/:slug`. The editor's Vite-built client bundle hydrates over
 * the SSR'd HTML and provides drag/resize/drop/drawer/palette behaviors.
 */
export const viewerPagesPlugin: FastifyPluginAsync = async (app) => {
  const cfg = (app as unknown as { tilerConfig: ResolvedTilerConfig }).tilerConfig;
  const store: TilerStore = cfg.store;

  const editorClientDir = cfg.viewerClientDir ?? resolveEditorClientDir();
  const jsAsset = findEntryJs(editorClientDir);
  const cssAsset = findCss(editorClientDir);

  // Serve editor's prebuilt client bundle from /assets/*.
  await app.register(fastifyStatic, {
    root: editorClientDir,
    prefix: "/assets/",
    index: false,
  });

  // List page (still a tiny static HTML page; full dashboard chooser is editor's job in v0.5+).
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

  // Detail page (SSR'd editor).
  app.get<{ Params: { slug: string } }>("/dashboards/:slug", async (req, reply) => {
    const dashboard = await store.getDashboard(req.params.slug);
    if (!dashboard) return reply.code(404).send({ error: "not found" });
    const panels = await store.listPanels(dashboard.id);
    const allSources = await store.listDataSources();
    const referencedSourceIds = new Set(
      panels.map((p) => p.data_source_id).filter((x): x is string => x !== null),
    );
    const referencedSources = allSources.filter((s) => referencedSourceIds.has(s.id));
    const since = new Date(Date.now() - RECORDS_LOOKBACK_MS).toISOString();
    const recordBatches = await Promise.all(
      referencedSources.map((s) =>
        store.queryRecords({ dataSourceId: s.id, since, orderBy: "recorded_at_desc" }),
      ),
    );
    const records = recordBatches.flat();
    const snapshot = await buildSnapshot({
      dashboard,
      dataSources: referencedSources,
      panels,
      records,
      now: new Date(),
    });

    if (!jsAsset) {
      return reply
        .code(500)
        .send({ error: `editor client bundle not found in ${editorClientDir}` });
    }
    const html = renderEditorHtml({
      dashboard,
      // Pass *all* sources so the drawer's source dropdown isn't artificially narrowed.
      dataSources: allSources,
      panels,
      snapshot,
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
