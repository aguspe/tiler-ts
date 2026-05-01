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
import { TilerNav } from "./TilerNav";
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
  const store = useMemo(
    () => createEditorStore({ dashboard, panels }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dashboard.id],
  );

  const api = useMemo(
    () => createApiClient({ baseUrl: apiBaseUrl, ...(csrfToken && { csrfToken }) }),
    [apiBaseUrl, csrfToken],
  );

  const [tick, setTick] = useState(0);
  useEffect(() => store.subscribe(() => setTick((t) => t + 1)), [store]);
  const state = store.getState();

  // Palette is hidden by default — the user opens it via the "+ Add Panel"
  // button. This matches the Rails editor where the palette is an opt-in
  // overlay, not a permanent side rail.
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [themeEditorOpen, setThemeEditorOpen] = useState(false);

  // Mirror tv_mode onto <html data-tv-mode> so any global styles can react.
  // Theme switching (light/dark) for TV displays goes through the same hook
  // by writing data-theme="dark" — the token sheet has the dark overrides.
  useEffect(() => {
    const root = document.documentElement;
    if (state.dashboard.settings.tv_mode) {
      root.setAttribute("data-theme", "dark");
    } else {
      root.removeAttribute("data-theme");
    }
  }, [state.dashboard.settings.tv_mode]);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, dataSources, records, state.dashboard, state.panels]);

  return (
    <div className={`tiler-shell${paletteOpen ? " tiler-editing-mode" : ""}`}>
      <TilerNav />
      <main className="tiler-page">
        <TilerToolbar
          store={store}
          api={api}
          paletteOpen={paletteOpen}
          onTogglePalette={() => setPaletteOpen((o) => !o)}
          themeEditorOpen={themeEditorOpen}
          onToggleThemeEditor={() => setThemeEditorOpen((o) => !o)}
        />
        <div className="tiler-grid-wrap">
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
      </main>
      {paletteOpen && (
        <TilerPalette
          dashboardId={state.dashboard.id}
          onAdd={(panel) => store.getState().addPanel(panel)}
        />
      )}
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
