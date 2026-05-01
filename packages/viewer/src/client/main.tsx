import "@aguspe/tiler-widgets";
import "@aguspe/tiler-widgets/styles/tokens.css";
import type { TilerSnapshot } from "@aguspe/tiler-core";
import { hydrateRoot } from "react-dom/client";
import { TilerDashboardViewer } from "../components/TilerDashboardViewer";

function bootstrap(): void {
  const scriptEl = document.getElementById("tiler-snapshot");
  const rootEl = document.getElementById("tiler-root");
  if (!scriptEl || !rootEl) {
    console.error("[@aguspe/tiler-viewer] Missing #tiler-snapshot or #tiler-root");
    return;
  }
  let snapshot: TilerSnapshot;
  try {
    snapshot = JSON.parse(scriptEl.textContent ?? "");
  } catch (err) {
    console.error("[@aguspe/tiler-viewer] Snapshot JSON parse error:", err);
    return;
  }
  hydrateRoot(rootEl, <TilerDashboardViewer snapshot={snapshot} />);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bootstrap);
} else {
  bootstrap();
}
