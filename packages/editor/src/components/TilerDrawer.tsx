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
      {/* Backdrop */}
      <div
        onClick={handleCancel}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.4)",
          zIndex: 100,
        }}
      />

      {/* Slide-over panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-heading"
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: 400,
          zIndex: 101,
          display: "flex",
          flexDirection: "column",
          background: "var(--tiler-color-tile, #131722)",
          color: "var(--tiler-color-text, #e6edf3)",
          boxShadow: "-4px 0 24px rgba(0,0,0,0.4)",
        }}
      >
        <FocusLock>
          {/* Header */}
          <div
            style={{
              padding: "16px 20px",
              borderBottom: "1px solid rgba(255,255,255,0.1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
            }}
          >
            <h2
              id="drawer-heading"
              style={{ margin: 0, fontSize: "1rem", fontWeight: 600 }}
            >
              {widgetLabel}
            </h2>
            <button
              onClick={handleCancel}
              aria-label="Close drawer"
              style={{
                background: "transparent",
                border: "none",
                color: "inherit",
                cursor: "pointer",
                fontSize: "1.25rem",
                lineHeight: 1,
                padding: "2px 6px",
                opacity: 0.7,
              }}
            >
              ✕
            </button>
          </div>

          {/* Body */}
          <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>
            <div style={{ marginBottom: 16 }}>
              <label
                htmlFor="drawer-title"
                style={{ display: "block", fontSize: "0.8rem", marginBottom: 4, opacity: 0.7 }}
              >
                Title
              </label>
              <input
                id="drawer-title"
                type="text"
                value={titleDraft}
                onChange={(e) => {
                  setTitleDraft(e.target.value);
                  setError(null);
                }}
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  padding: "8px 10px",
                  borderRadius: 6,
                  border: "1px solid rgba(255,255,255,0.15)",
                  background: "rgba(255,255,255,0.05)",
                  color: "inherit",
                  fontSize: "0.9rem",
                }}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label
                htmlFor="drawer-config"
                style={{ display: "block", fontSize: "0.8rem", marginBottom: 4, opacity: 0.7 }}
              >
                Config (JSON)
              </label>
              <textarea
                id="drawer-config"
                value={configDraft}
                rows={14}
                onChange={(e) => {
                  setConfigDraft(e.target.value);
                  setError(null);
                }}
                spellCheck={false}
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  padding: "8px 10px",
                  borderRadius: 6,
                  border: "1px solid rgba(255,255,255,0.15)",
                  background: "rgba(255,255,255,0.05)",
                  color: "inherit",
                  fontSize: "0.8rem",
                  fontFamily: "monospace",
                  resize: "vertical",
                }}
              />
            </div>

            {error !== null && (
              <div
                role="alert"
                style={{
                  padding: "8px 12px",
                  borderRadius: 6,
                  background: "rgba(239,68,68,0.15)",
                  border: "1px solid rgba(239,68,68,0.4)",
                  color: "#fca5a5",
                  fontSize: "0.8rem",
                }}
              >
                {error}
              </div>
            )}
          </div>

          {/* Footer */}
          <div
            style={{
              padding: "16px 20px",
              borderTop: "1px solid rgba(255,255,255,0.1)",
              display: "flex",
              gap: 8,
              justifyContent: "flex-end",
            }}
          >
            <button
              onClick={handleCancel}
              disabled={saving}
              style={{
                padding: "8px 16px",
                borderRadius: 6,
                border: "1px solid rgba(255,255,255,0.2)",
                background: "transparent",
                color: "inherit",
                cursor: saving ? "not-allowed" : "pointer",
                fontSize: "0.85rem",
                opacity: saving ? 0.5 : 1,
              }}
            >
              Cancel
            </button>
            <button
              onClick={() => void handleSave()}
              disabled={saving}
              style={{
                padding: "8px 16px",
                borderRadius: 6,
                border: "none",
                background: "var(--tiler-color-accent, #3b82f6)",
                color: "#fff",
                cursor: saving ? "not-allowed" : "pointer",
                fontSize: "0.85rem",
                fontWeight: 600,
                opacity: saving ? 0.7 : 1,
              }}
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </FocusLock>
      </div>
    </>
  );
}
