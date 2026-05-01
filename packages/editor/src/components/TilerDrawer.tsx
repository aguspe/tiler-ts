import { getWidget } from "@aguspe/tiler-core";
import FocusLock from "react-focus-lock";
import { useEffect, useState } from "react";
import type { StoreApi } from "zustand/vanilla";
import type { TilerApiClient } from "../api/client";
import type { EditorState } from "../state/editor-store";

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
              ×
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
                <label htmlFor="drawer-config" className="tiler-label">
                  Config (JSON)
                </label>
                <textarea
                  id="drawer-config"
                  className="tiler-textarea"
                  value={configDraft}
                  rows={14}
                  onChange={(e) => {
                    setConfigDraft(e.target.value);
                    setError(null);
                  }}
                  spellCheck={false}
                />
              </div>

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
