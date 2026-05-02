import { readdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import {
  type ResolvedTilerConfig,
  type TilerStore,
  buildSnapshot,
  listWidgets,
} from "@aguspe/tiler-core";
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

interface ShellContext {
  cssAsset: string | undefined;
  /** Slug of the active nav link (`dashboards` | `data-sources` | `settings`). */
  activeNav: "dashboards" | "data-sources" | "settings";
  title: string;
}

/**
 * Renders a paper-themed page shell (top nav + page container) for the
 * non-editor routes (`/dashboards`, `/settings`, `/data-sources`). The
 * editor's own SSR helper handles `/dashboards/:slug`.
 */
function renderShellHtml(ctx: ShellContext, body: string): string {
  const navLink = (slug: ShellContext["activeNav"], label: string, href: string): string =>
    `<a class="tiler-nav-link" href="${href}"${slug === ctx.activeNav ? ' aria-current="page"' : ""}>${label}</a>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(ctx.title)} — tiler-ts</title>
${ctx.cssAsset ? `<link rel="stylesheet" href="/assets/${ctx.cssAsset}">` : ""}
</head>
<body>
<div class="tiler-shell">
  <nav class="tiler-nav" aria-label="Primary">
    <a class="tiler-nav-brand" href="/dashboards">tiler</a>
    <div class="tiler-nav-links">
      ${navLink("dashboards", "Dashboards", "/dashboards")}
      ${navLink("data-sources", "Data Sources", "/data-sources")}
      ${navLink("settings", "Settings", "/settings")}
    </div>
  </nav>
  <main class="tiler-page">
    ${body}
  </main>
</div>
</body>
</html>`;
}

/**
 * Plugin:
 *   - Serves `/assets/*` from `@aguspe/tiler-editor/dist/client/`.
 *   - Renders `/dashboards/:slug` as SSR'd HTML using the editor.
 *   - Renders `/dashboards`, `/data-sources`, `/settings` as paper-themed
 *     index/placeholder pages.
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

  // Dashboards index — paper-themed card grid.
  app.get("/dashboards", async (_req, reply) => {
    const dashboards = await store.listDashboards();
    const cards =
      dashboards.length === 0
        ? `<p class="t-body-sm" style="color:var(--ink-3)">No dashboards yet.</p>`
        : `<div class="tiler-card-grid">${dashboards
            .map(
              (d) =>
                `<a class="tiler-card" href="/dashboards/${d.slug}">
                  <h3 style="font-family:var(--font-display);font-size:var(--fs-h3);font-weight:600;margin:0">${escapeHtml(
                    d.name,
                  )}</h3>
                  ${
                    d.description
                      ? `<p class="t-body-sm" style="color:var(--ink-3);margin:0">${escapeHtml(d.description)}</p>`
                      : ""
                  }
                </a>`,
            )
            .join("")}</div>`;
    const body = `
      <header class="tiler-page-header">
        <div>
          <h1 class="tiler-page-title">Dashboards</h1>
          <p class="tiler-page-description">All dashboards on this server.</p>
        </div>
      </header>
      ${cards}
    `;
    return reply
      .type("text/html")
      .send(renderShellHtml({ cssAsset, activeNav: "dashboards", title: "Dashboards" }, body));
  });

  // Data sources — placeholder index.
  app.get("/data-sources", async (_req, reply) => {
    const sources = await store.listDataSources();
    const list =
      sources.length === 0
        ? `<p class="t-body-sm" style="color:var(--ink-3)">No data sources registered.</p>`
        : `<div class="tiler-card-grid">${sources
            .map(
              (s) =>
                `<div class="tiler-card">
                  <h3 style="font-family:var(--font-display);font-size:var(--fs-h3);font-weight:600;margin:0">${escapeHtml(
                    s.name,
                  )}</h3>
                  <code class="t-mono" style="color:var(--ink-3)">${escapeHtml(s.slug)}</code>
                </div>`,
            )
            .join("")}</div>`;
    const body = `
      <header class="tiler-page-header">
        <div>
          <h1 class="tiler-page-title">Data Sources</h1>
          <p class="tiler-page-description">Endpoints that feed your dashboards. Manage via the API for now.</p>
        </div>
      </header>
      ${list}
    `;
    return reply
      .type("text/html")
      .send(renderShellHtml({ cssAsset, activeNav: "data-sources", title: "Data Sources" }, body));
  });

  // Settings — read-only server diagnostics.
  app.get("/settings", async (_req, reply) => {
    const dashboards = await store.listDashboards();
    const sources = await store.listDataSources();
    let panelCount = 0;
    for (const d of dashboards) {
      const panels = await store.listPanels(d.id);
      panelCount += panels.length;
    }
    const widgets = listWidgets();
    const storeBackend = store.constructor.name;
    const authMode = describeAuthMode(cfg.auth);
    const widgetSummary = widgets
      .map((w) => `<code class="t-mono" style="margin-right:8px">${escapeHtml(w.meta.type)}</code>`)
      .join("");

    const stat = (label: string, value: string): string =>
      `<div class="tiler-card">
        <p class="t-eyebrow" style="margin:0 0 6px">${escapeHtml(label)}</p>
        <p style="font-family:var(--font-display);font-size:var(--fs-h2);font-weight:600;margin:0">${value}</p>
      </div>`;

    const body = `
      <header class="tiler-page-header">
        <div>
          <h1 class="tiler-page-title">Settings</h1>
          <p class="tiler-page-description">Server diagnostics. Configuration lives in <code class="t-mono">tiler.config.ts</code>.</p>
        </div>
      </header>
      <div class="tiler-card-grid" style="margin-bottom:var(--s-6)">
        ${stat("Dashboards", String(dashboards.length))}
        ${stat("Panels", String(panelCount))}
        ${stat("Data sources", String(sources.length))}
        ${stat("Widgets registered", String(widgets.length))}
      </div>
      <div class="tiler-card-grid">
        <div class="tiler-card">
          <p class="t-eyebrow" style="margin:0 0 6px">Store backend</p>
          <code class="t-mono">${escapeHtml(storeBackend)}</code>
        </div>
        <div class="tiler-card">
          <p class="t-eyebrow" style="margin:0 0 6px">Auth mode</p>
          <code class="t-mono">${escapeHtml(authMode)}</code>
        </div>
        <div class="tiler-card">
          <p class="t-eyebrow" style="margin:0 0 6px">Listening on</p>
          <code class="t-mono">${escapeHtml(cfg.host)}:${cfg.port}</code>
        </div>
        <div class="tiler-card" style="grid-column:1 / -1">
          <p class="t-eyebrow" style="margin:0 0 8px">Registered widgets</p>
          <div>${widgetSummary}</div>
        </div>
      </div>
    `;
    return reply
      .type("text/html")
      .send(renderShellHtml({ cssAsset, activeNav: "settings", title: "Settings" }, body));
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

function describeAuthMode(auth: ResolvedTilerConfig["auth"]): string {
  const flags: string[] = [];
  if ("basic" in auth && auth.basic) flags.push("basic");
  if ("hmac" in auth && auth.hmac) flags.push("hmac");
  if ("custom" in auth && auth.custom) flags.push("custom");
  return flags.length === 0 ? "none (open)" : flags.join(" + ");
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
