import "@aguspe/tiler-widgets"; // register all widgets
import type { Dashboard, DataRecord, DataSource, Panel } from "@aguspe/tiler-core";
import { buildSnapshot } from "@aguspe/tiler-core";
import type { WidgetData } from "@aguspe/tiler-core";
import { useEffect, useMemo, useState } from "react";
import { createApiClient } from "../api/client";
import { createEditorStore } from "../state/editor-store";
import { TilerDrawer } from "./TilerDrawer";
import { TilerEditableTile } from "./TilerEditableTile";
import { TilerGridstack } from "./TilerGridstack";
import { TilerPalette } from "./TilerPalette";
import { TilerThemeEditor } from "./TilerThemeEditor";
import { TilerToolbar } from "./TilerToolbar";

export interface TilerDashboardEditorProps {
  dashboard: Dashboard;
  panels: Panel[];
  dataSources: DataSource[];
  /** Optional initial records for resolver runs. */
  records?: DataRecord[];
  /** Base URL for API requests. Defaults to `""` (same origin). */
  apiBaseUrl?: string;
  csrfToken?: string;
}

export function TilerDashboardEditor({
  dashboard,
  panels,
  dataSources,
  records = [],
  apiBaseUrl = "",
  csrfToken,
}: TilerDashboardEditorProps): JSX.Element {
  // Re-create the store when the dashboard id changes (e.g. user navigates).
  const store = useMemo(
    () => createEditorStore({ dashboard, panels }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dashboard.id],
  );

  const api = useMemo(
    () => createApiClient({ baseUrl: apiBaseUrl, ...(csrfToken && { csrfToken }) }),
    [apiBaseUrl, csrfToken],
  );

  // Subscribe to vanilla Zustand store with a tick counter.
  const [tick, setTick] = useState(0);
  useEffect(() => store.subscribe(() => setTick((t) => t + 1)), [store]);
  const state = store.getState();

  const [paletteOpen, setPaletteOpen] = useState(true);
  const [themeEditorOpen, setThemeEditorOpen] = useState(false);

  // Compute resolved widget data whenever the store or inputs change.
  const [resolved, setResolved] = useState<Record<string, WidgetData>>({});
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const snapshot = await buildSnapshot({
        dashboard: state.dashboard,
        dataSources,
        panels: state.panels,
        records,
        now: new Date(),
      });
      if (!cancelled) {
        setResolved(snapshot.resolved as Record<string, WidgetData>);
      }
    })();
    return () => {
      cancelled = true;
    };
    // `tick` drives re-computation whenever the store mutates.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, dataSources, records, state.dashboard, state.panels]);

  return (
    <div
      className="tiler-dashboard-editor"
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        background: "var(--tiler-color-page, #0b0d12)",
        color: "var(--tiler-color-text, #e6edf3)",
        fontFamily: "var(--tiler-font-sans, system-ui)",
      }}
    >
      <TilerToolbar
        store={store}
        api={api}
        paletteOpen={paletteOpen}
        onTogglePalette={() => setPaletteOpen((o) => !o)}
        themeEditorOpen={themeEditorOpen}
        onToggleThemeEditor={() => setThemeEditorOpen((o) => !o)}
      />
      <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
        {paletteOpen && (
          <TilerPalette
            dashboardId={state.dashboard.id}
            onAdd={(panel) => store.getState().addPanel(panel)}
          />
        )}
        <div style={{ flex: 1, padding: 16, overflow: "auto" }}>
          <TilerGridstack
            panels={state.panels}
            onPanelLayoutChanged={(id, layout) =>
              store.getState().setPanelLayout(id, layout)
            }
          >
            {state.panels.map((p) => (
              <div
                key={p.id}
                className="grid-stack-item"
                gs-id={p.id}
                gs-x={p.x}
                gs-y={p.y}
                gs-w={p.width}
                gs-h={p.height}
              >
                <div className="grid-stack-item-content">
                  <TilerEditableTile
                    panel={p}
                    data={resolved[p.id] ?? { resolved: null, empty: true }}
                    store={store}
                    api={api}
                  />
                </div>
              </div>
            ))}
          </TilerGridstack>
        </div>
      </div>
      <TilerDrawer store={store} api={api} />
      {themeEditorOpen && (
        <TilerThemeEditor
          store={store}
          api={api}
          onClose={() => setThemeEditorOpen(false)}
        />
      )}
    </div>
  );
}
