import type { Dashboard, DataSource, Panel, TilerSnapshot } from "@aguspe/tiler-core";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { TilerDashboardEditor } from "../components/TilerDashboardEditor";

export const TILER_EDITOR_VERSION = "0.0.1" as const;

export interface RenderEditorHtmlInput {
  dashboard: Dashboard;
  dataSources: DataSource[];
  panels: Panel[];
  /** Pre-built snapshot; records are embedded as initial resolved state. */
  snapshot: TilerSnapshot;
  clientAssetPath: string;
  cssAssetPath?: string;
  csrfToken?: string;
}

export function renderEditorHtml(input: RenderEditorHtmlInput): string {
  const body = renderToString(
    createElement(TilerDashboardEditor, {
      dashboard: input.dashboard,
      dataSources: input.dataSources,
      panels: input.panels,
      records: input.snapshot.records,
    }),
  );

  // Escape `</script` inside embedded JSON so browsers don't terminate the tag.
  const safeJson = JSON.stringify({
    dashboard: input.dashboard,
    dataSources: input.dataSources,
    panels: input.panels,
    snapshot: input.snapshot,
    csrfToken: input.csrfToken ?? null,
    apiBaseUrl: "",
  }).replace(/<\/script/gi, "<\\/script");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(input.dashboard.name)} — tiler-ts editor</title>
${input.cssAssetPath ? `<link rel="stylesheet" href="${input.cssAssetPath}">` : ""}
</head>
<body>
<div id="tiler-editor-root">${body}</div>
<script id="tiler-editor-data" type="application/json">${safeJson}</script>
<script type="module" src="${input.clientAssetPath}"></script>
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

export { TilerDashboardEditor } from "../components/TilerDashboardEditor";
export type { TilerDashboardEditorProps } from "../components/TilerDashboardEditor";
