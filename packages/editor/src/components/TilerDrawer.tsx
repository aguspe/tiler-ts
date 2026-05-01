import { type Panel, type WidgetData, getWidget } from "@aguspe/tiler-core";
import FocusLock from "react-focus-lock";
import { useEffect, useMemo, useState } from "react";
import type { StoreApi } from "zustand/vanilla";
import type { TilerApiClient } from "../api/client";
import type { EditorState } from "../state/editor-store";
import { XIcon } from "./Icons";

export interface TilerDrawerProps {
  store: StoreApi<EditorState>;
  api: TilerApiClient;
}

export function TilerDrawer({ store, api }: TilerDrawerProps): JSX.Element | null {
  // Re-render when vanilla Zustand store updates.
  const [tick, setTick] = useState(0);
  useEffect(() => store.subscribe(() => setTick((t) => t + 1)), [store]);

  const state = store.getState();
  const panel = state.panels.find((p) => p.id === state.drawerPanelId);
  if (!panel) return null;

  return <DrawerContent key={panel.id} store={store} api={api} panelId={panel.id} _tick={tick} />;
}

// Separate inner component so we can key by panel.id to reset form state.
interface DrawerContentProps {
  store: StoreApi<EditorState>;
  api: TilerApiClient;
  panelId: string;
  _tick: number;
}

function DrawerContent({ store, api, panelId }: DrawerContentProps): JSX.Element | null {
  const state = store.getState();
  const panel = state.panels.find((p) => p.id === panelId);

  const [titleDraft, setTitleDraft] = useState(() => panel?.title ?? "");
  const [configDraft, setConfigDraft] = useState(() =>
    JSON.stringify(panel?.config ?? {}, null, 2),
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [previewData, setPreviewData] = useState<WidgetData | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);

  // Esc key → close drawer.
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent): void {
      if (e.key === "Escape") {
        store.getState().closeDrawer();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [store]);

  if (!panel) return null;

  const widget = getWidget(panel.widget_type);
  const widgetLabel = widget?.meta.label ?? panel.widget_type;

  // Sample records for the live preview — every widget definition ships
  // an `example()` factory that produces a self-contained {panel, records}
  // tuple. We only use its `records` here; the panel's title and config
  // come from the drafts so the preview reflects the user's edits.
  const exampleRecords = useMemo(
    () => (widget ? widget.example().records : []),
    [widget],
  );

  // Re-resolve the widget against the current draft config whenever it
  // changes, then re-render the component below the form.
  useEffect(() => {
    if (!widget || !panel) {
      setPreviewData(null);
      return;
    }
    let cancelled = false;
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(configDraft) as Record<string, unknown>;
    } catch {
      setPreviewError("Invalid JSON — fix the config to see a preview.");
      setPreviewData(null);
      return;
    }
    const validation = widget.configSchema.safeParse(parsed);
    if (!validation.success) {
      const first = validation.error.issues[0];
      setPreviewError(first?.message ?? "Config doesn't match the widget schema");
      setPreviewData(null);
      return;
    }
    setPreviewError(null);

    const previewPanel: Panel = {
      ...panel,
      title: titleDraft || panel.title,
      // The Zod parse normalizes/defaults the config, so use that.
      config: validation.data as Record<string, unknown>,
    };

    // Examples bake their records relative to a fixed reference time, so
    // resolving with `new Date()` would put everything outside the
    // configured time_window. Anchor `now` at the most recent record so
    // every record falls inside the window the user expects.
    const now =
      exampleRecords.length > 0
        ? new Date(
            Math.max(...exampleRecords.map((r) => Date.parse(r.recorded_at))) + 1000,
          )
        : new Date();

    void (async () => {
      try {
        const data = widget.resolve
          ? await widget.resolve({
              panel: previewPanel,
              records: exampleRecords,
              now,
            })
          : { resolved: null, empty: false };
        if (!cancelled) setPreviewData(data as WidgetData);
      } catch (err) {
        if (!cancelled) {
          setPreviewError(err instanceof Error ? err.message : "Resolver failed");
          setPreviewData(null);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configDraft, titleDraft, widget, exampleRecords, panel?.id]);

  function handleUseExample(): void {
    if (!widget) return;
    const ex = widget.example();
    setTitleDraft(ex.panel.title);
    setConfigDraft(JSON.stringify(ex.panel.config, null, 2));
    setError(null);
  }

  async function handleSave(): Promise<void> {
    if (!panel) return;

    // 1. Parse JSON.
    let parsedConfig: Record<string, unknown>;
    try {
      parsedConfig = JSON.parse(configDraft) as Record<string, unknown>;
    } catch {
      setError("Config is not valid JSON");
      return;
    }

    // 2. Validate against widget schema if available.
    const widgetDef = getWidget(panel.widget_type);
    if (widgetDef) {
      const result = widgetDef.configSchema.safeParse(parsedConfig);
      if (!result.success) {
        const firstIssue = result.error.issues[0];
        setError(firstIssue?.message ?? "Invalid config");
        return;
      }
    }

    // 3. Write to store.
    store.getState().setPanelTitle(panel.id, titleDraft);
    store.getState().setPanelConfig(panel.id, parsedConfig);

    // 4. Build updated panel from store (after mutations above).
    const updatedPanel = store.getState().panels.find((p) => p.id === panel.id);
    if (!updatedPanel) return;

    // 5. Persist via API.
    setSaving(true);
    try {
      await api.upsertPanel({ ...updatedPanel });
      setSaving(false);
      store.getState().closeDrawer();
    } catch (err) {
      setSaving(false);
      setError(err instanceof Error ? err.message : "Failed to save");
    }
  }

  function handleCancel(): void {
    store.getState().closeDrawer();
  }

  return (
    <>
      <div className="tiler-drawer-backdrop" onClick={handleCancel} />
      <div
        className="tiler-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-heading"
      >
        <FocusLock>
          <header className="tiler-drawer-header">
            <h2 id="drawer-heading" className="tiler-drawer-title">
              {widgetLabel}
            </h2>
            <button
              type="button"
              className="tiler-drawer-close"
              onClick={handleCancel}
              aria-label="Close drawer"
            >
              <XIcon size={18} />
            </button>
          </header>

          <div className="tiler-drawer-body">
            <form className="tiler-form" onSubmit={(e) => e.preventDefault()}>
              <div className="tiler-field">
                <label htmlFor="drawer-title" className="tiler-label">
                  Title
                </label>
                <input
                  id="drawer-title"
                  type="text"
                  className="tiler-input"
                  value={titleDraft}
                  onChange={(e) => {
                    setTitleDraft(e.target.value);
                    setError(null);
                  }}
                />
              </div>

              <div className="tiler-field">
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <label htmlFor="drawer-config" className="tiler-label">
                    Config (JSON)
                  </label>
                  {widget && (
                    <button
                      type="button"
                      className="tiler-btn tiler-btn-sm"
                      onClick={handleUseExample}
                      title="Fill the title and config with this widget's example values"
                    >
                      Use example
                    </button>
                  )}
                </div>
                <textarea
                  id="drawer-config"
                  className="tiler-textarea"
                  value={configDraft}
                  rows={10}
                  onChange={(e) => {
                    setConfigDraft(e.target.value);
                    setError(null);
                  }}
                  spellCheck={false}
                />
              </div>

              {widget && (
                <div className="tiler-field">
                  <span className="tiler-label">Preview</span>
                  <div className="tiler-drawer-preview">
                    {previewError !== null ? (
                      <div className="tiler-drawer-preview-empty">{previewError}</div>
                    ) : previewData ? (
                      previewData.empty || previewData.resolved == null ? (
                        widget.resolve ? (
                          <div className="tiler-drawer-preview-empty">
                            No data — click <em>Use example</em> to load sample records.
                          </div>
                        ) : (
                          <widget.component
                            panel={{
                              ...panel,
                              title: titleDraft || panel.title,
                              config: tryParseConfig(configDraft) ?? panel.config,
                            }}
                            data={previewData}
                          />
                        )
                      ) : (
                        <widget.component
                          panel={{
                            ...panel,
                            title: titleDraft || panel.title,
                            config: tryParseConfig(configDraft) ?? panel.config,
                          }}
                          data={previewData}
                        />
                      )
                    ) : (
                      <div className="tiler-drawer-preview-empty">Loading preview…</div>
                    )}
                  </div>
                </div>
              )}

              {error !== null && (
                <div role="alert" className="tiler-error">
                  {error}
                </div>
              )}

              <div
                style={{
                  display: "flex",
                  gap: 8,
                  justifyContent: "flex-end",
                  marginTop: "var(--s-2)",
                }}
              >
                <button
                  type="button"
                  className="tiler-btn"
                  onClick={handleCancel}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="tiler-btn tiler-btn-primary"
                  onClick={() => void handleSave()}
                  disabled={saving}
                >
                  {saving ? "Saving…" : "Save"}
                </button>
              </div>
            </form>
          </div>
        </FocusLock>
      </div>
    </>
  );
}

function tryParseConfig(json: string): Record<string, unknown> | null {
  try {
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}
