import type { TilerSnapshot } from "@aguspe/tiler-core";
import { renderToString } from "react-dom/server";
import { TilerDashboardViewer } from "../components/TilerDashboardViewer";

export interface RenderToHtmlOptions {
  /** Path (relative to the output HTML) to the client JS bundle. */
  clientAssetPath: string;
  /** Optional path to the client CSS. If omitted, no <link> is emitted. */
  cssAssetPath?: string;
}

export function renderToHtml(snapshot: TilerSnapshot, opts: RenderToHtmlOptions): string {
  const body = renderToString(<TilerDashboardViewer snapshot={snapshot} />);
  // Escape </script> so the embedded JSON cannot break out of the script tag.
  const safeJson = JSON.stringify(snapshot).replace(/<\/script/gi, "<\\/script");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(snapshot.dashboard.name)} — tiler-ts</title>
${opts.cssAssetPath ? `<link rel="stylesheet" href="${opts.cssAssetPath}">` : ""}
</head>
<body>
<div id="tiler-root">${body}</div>
<script id="tiler-snapshot" type="application/json">${safeJson}</script>
<script type="module" src="${opts.clientAssetPath}"></script>
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
