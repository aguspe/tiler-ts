import "@aguspe/tiler-widgets";
import "@aguspe/tiler-widgets/styles/tokens.css";
import "gridstack/dist/gridstack.min.css";
import "../styles/editor.css";
import type { Dashboard, DataSource, Panel, TilerSnapshot } from "@aguspe/tiler-core";
import { hydrateRoot } from "react-dom/client";
import { TilerDashboardEditor } from "../components/TilerDashboardEditor";

interface EditorPayload {
  dashboard: Dashboard;
  dataSources: DataSource[];
  panels: Panel[];
  snapshot: TilerSnapshot;
  csrfToken: string | null;
  apiBaseUrl: string;
}

function bootstrap(): void {
  const dataEl = document.getElementById("tiler-editor-data");
  const rootEl = document.getElementById("tiler-editor-root");
  if (!dataEl || !rootEl) {
    console.error("[@aguspe/tiler-editor] missing #tiler-editor-data or #tiler-editor-root");
    return;
  }
  let payload: EditorPayload;
  try {
    payload = JSON.parse(dataEl.textContent ?? "") as EditorPayload;
  } catch (err) {
    console.error("[@aguspe/tiler-editor] failed to parse editor data", err);
    return;
  }
  hydrateRoot(
    rootEl,
    <TilerDashboardEditor
      dashboard={payload.dashboard}
      dataSources={payload.dataSources}
      panels={payload.panels}
      records={payload.snapshot.records}
      apiBaseUrl={payload.apiBaseUrl}
      {...(payload.csrfToken && { csrfToken: payload.csrfToken })}
    />,
  );
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bootstrap);
} else {
  bootstrap();
}
