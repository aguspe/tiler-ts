import type { TilerSnapshot } from "@aguspe/tiler-core";
import { renderToString } from "react-dom/server";
import { TilerDashboardViewer } from "../components/TilerDashboardViewer";

export interface RenderToHtmlOptions {
  /** Path (relative to the output HTML) to the client JS bundle. */
  clientAssetPath: string;
  /** Optional path to the client CSS. If omitted, no <link> is emitted. */
  cssAssetPath?: string;
}

const BASE_STYLES = `
*,*::before,*::after{box-sizing:border-box}
body{margin:0;background:var(--tiler-color-page);color:var(--tiler-color-text);font-family:var(--tiler-font-sans)}
:root{
  --tiler-font-sans:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
  --tiler-font-mono:ui-monospace,SFMono-Regular,Menlo,monospace;
  --tiler-color-page:#f1f5f9;
  --tiler-color-text:#0f172a;
  --paper-2:#ffffff;
  --border:rgba(0,0,0,0.10);
  --ink:#0f172a;
  --ink-3:#64748b;
  --page-bg:rgba(0,0,0,0.04);
  --tile-bg:rgba(0,0,0,0.02);
  --fs-body-sm:13px;
  --font-display:var(--tiler-font-sans);
}
@media(prefers-color-scheme:dark){
  :root:not([data-theme="light"]){
    --tiler-color-page:#0f172a;
    --tiler-color-text:#e2e8f0;
    --paper-2:#1e293b;
    --border:rgba(255,255,255,0.10);
    --ink:#e2e8f0;
    --ink-3:#94a3b8;
    --page-bg:rgba(255,255,255,0.06);
    --tile-bg:rgba(255,255,255,0.03);
  }
}
:root[data-theme="dark"]{
  --tiler-color-page:#0f172a;
  --tiler-color-text:#e2e8f0;
  --paper-2:#1e293b;
  --border:rgba(255,255,255,0.10);
  --ink:#e2e8f0;
  --ink-3:#94a3b8;
  --page-bg:rgba(255,255,255,0.06);
  --tile-bg:rgba(255,255,255,0.03);
}
body.tv-mode{overflow:hidden}
body.tv-mode .tiler-dashboard{padding:4px!important;min-height:100vh}
body.tv-mode .tiler-dashboard>header,body.tv-mode .tiler-dashboard>footer{display:none}
`.trim();

const THEME_TOGGLE = `<button
  id="tiler-theme-btn"
  onclick="(function(){var h=document.documentElement;var c=h.getAttribute('data-theme')||(matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light');h.setAttribute('data-theme',c==='dark'?'light':'dark');})()"
  title="Toggle light/dark mode"
  style="position:fixed;bottom:12px;right:12px;z-index:9999;padding:4px 10px;border:1px solid var(--border);background:var(--paper-2);color:var(--ink-3);border-radius:4px;cursor:pointer;font-size:11px;font-family:var(--tiler-font-sans);opacity:0.7"
>◐ theme</button>`;

export function renderToHtml(snapshot: TilerSnapshot, opts: RenderToHtmlOptions): string {
  const body = renderToString(<TilerDashboardViewer snapshot={snapshot} />);
  // Escape </script> so the embedded JSON cannot break out of the script tag.
  const safeJson = JSON.stringify(snapshot).replace(/<\/script/gi, "<\\/script");
  const tvMode = snapshot.dashboard.settings.tv_mode;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(snapshot.dashboard.name)} — tiler-ts</title>
<style>${BASE_STYLES}</style>
${opts.cssAssetPath ? `<link rel="stylesheet" href="${opts.cssAssetPath}">` : ""}
</head>
<body${tvMode ? ' class="tv-mode"' : ""}>
<div id="tiler-root">${body}</div>
${tvMode ? "" : THEME_TOGGLE}
<script id="tiler-snapshot" type="application/json">${safeJson}</script>
<script src="${opts.clientAssetPath}"></script>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
