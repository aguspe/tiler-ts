import "@aguspe/tiler-widgets"; // register all widgets
import type { Dashboard, DataRecord, DataSource, Panel } from "@aguspe/tiler-core";
import { buildSnapshot } from "@aguspe/tiler-core";
import type { WidgetData } from "@aguspe/tiler-core";
import { useEffect, useMemo, useRef, useState } from "react";
import { createApiClient, type TilerApiClient } from "../api/client";
import { createEditorStore, type EditorState } from "../state/editor-store";
import { TilerDrawer } from "./TilerDrawer";
import { TilerEditableTile } from "./TilerEditableTile";
import { TilerGridstack } from "./TilerGridstack";
import { TilerHistoryBar } from "./TilerHistoryBar";
import { TilerNav } from "./TilerNav";
import { TilerPalette, type PaletteDragMeta } from "./TilerPalette";
import { TilerThemeEditor } from "./TilerThemeEditor";
import { TilerToolbar } from "./TilerToolbar";

const AUTOSAVE_DEBOUNCE_MS = 600;

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

  const [paletteOpen, setPaletteOpen] = useState(false);
  const [themeEditorOpen, setThemeEditorOpen] = useState(false);
  const [paletteDrag, setPaletteDrag] = useState<PaletteDragMeta | null>(null);

  // Close the palette when the user clicks anywhere outside it (and away
  // from the toggle button itself, which already handles its own click).
  // Listening on `mousedown` lets the click finish on the original target
  // before the palette unmounts.
  useEffect(() => {
    if (!paletteOpen) return;
    function onMouseDown(e: MouseEvent): void {
      const target = e.target;
      if (!(target instanceof Element)) return;
      if (target.closest(".tiler-widget-palette")) return;
      if (target.closest('[aria-label="Toggle palette"]')) return;
      setPaletteOpen(false);
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [paletteOpen]);

  // Dark mode is independent of TV mode. We initialize from
  // `prefers-color-scheme` on first mount but the user can override at
  // any time via the toolbar toggle. The choice is mirrored to
  // `<html data-theme="dark">` for the token sheet.
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
  });
  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) root.setAttribute("data-theme", "dark");
    else root.removeAttribute("data-theme");
  }, [darkMode]);

  // Auto-save: whenever the store flips to dirty, schedule a debounced
  // persist. Each dirty-burst resets the timer so we batch consecutive
  // edits (e.g. dragging a panel fires many setPanelLayout calls).
  useAutosave(store, api);

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

  const tvMode = state.dashboard.settings.tv_mode;
  const shellClasses = [
    "tiler-shell",
    paletteOpen ? "tiler-editing-mode" : "",
    tvMode ? "tiler-tv-mode" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={shellClasses}>
      {tvMode && (
        <button
          type="button"
          className="tiler-tv-exit"
          onClick={() => store.getState().toggleTvMode()}
          aria-label="Exit TV mode"
        >
          Exit TV
        </button>
      )}
      <TilerNav />
      <div className="tiler-shell-body">
        <div className="tiler-shell-main">
          <main className="tiler-page">
            <TilerToolbar
              store={store}
              paletteOpen={paletteOpen}
              onTogglePalette={() => setPaletteOpen((o) => !o)}
              themeEditorOpen={themeEditorOpen}
              onToggleThemeEditor={() => setThemeEditorOpen((o) => !o)}
              darkMode={darkMode}
              onToggleDarkMode={() => setDarkMode((d) => !d)}
            />
            <div className="tiler-grid-wrap">
              <TilerGridstack
                panels={state.panels}
                paletteDrag={paletteDrag}
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
        </div>
        {paletteOpen && (
          <TilerPalette
            dashboardId={state.dashboard.id}
            onAdd={(panel) => store.getState().addPanel(panel)}
            onDragStart={(meta) => setPaletteDrag(meta)}
            onDragEnd={() => setPaletteDrag(null)}
          />
        )}
      </div>
      {!tvMode && <TilerHistoryBar store={store} />}
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

/**
 * Auto-save hook: subscribes to the editor store and, whenever it goes
 * dirty, schedules a debounced flush that patches the dashboard, upserts
 * every panel, and calls `markClean()`. The timer resets on each new
 * mutation so a long drag-resize batches into a single save.
 *
 * If the API call fails the store stays dirty so the next change retries.
 */
function useAutosave(
  store: ReturnType<typeof createEditorStore>,
  api: TilerApiClient,
): void {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlightRef = useRef(false);

  useEffect(() => {
    async function flush(): Promise<void> {
      if (inFlightRef.current) return;
      const state: EditorState = store.getState();
      if (!state.dirty) return;
      inFlightRef.current = true;
      try {
        await api.patchDashboard(state.dashboard.id, {
          name: state.dashboard.name,
          settings: state.dashboard.settings,
        });
        for (const panel of state.panels) {
          await api.upsertPanel(panel);
        }
        store.getState().markClean();
      } catch (err) {
        console.error("[tiler-editor] auto-save failed:", err);
        // Leave dirty: true so the next mutation retries.
      } finally {
        inFlightRef.current = false;
      }
    }

    const unsubscribe = store.subscribe((next, prev) => {
      // Only act on dirty transitions and on mutations while already dirty
      // (e.g. consecutive drags that arrive after a previous flush queued).
      if (!next.dirty) return;
      if (next.panels === prev.panels && next.dashboard === prev.dashboard) return;
      if (timerRef.current !== null) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        void flush();
      }, AUTOSAVE_DEBOUNCE_MS);
    });
    return () => {
      unsubscribe();
      if (timerRef.current !== null) clearTimeout(timerRef.current);
    };
  }, [store, api]);
}
