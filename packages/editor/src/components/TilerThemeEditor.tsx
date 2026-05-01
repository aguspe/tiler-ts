import { useEffect, useState } from "react";
import type { StoreApi } from "zustand/vanilla";
import type { TilerApiClient } from "../api/client";
import type { EditorState } from "../state/editor-store";

const TOKEN_LABELS: Array<{ key: "page" | "tile" | "tile_header" | "gutter"; label: string }> = [
  { key: "page", label: "Page background" },
  { key: "tile", label: "Tile background" },
  { key: "tile_header", label: "Tile header" },
  { key: "gutter", label: "Gutter" },
];

export interface TilerThemeEditorProps {
  store: StoreApi<EditorState>;
  api: TilerApiClient;
  onClose?: () => void;
}

export function TilerThemeEditor({ store, api, onClose }: TilerThemeEditorProps): JSX.Element {
  const [tick, setTick] = useState(0);
  useEffect(() => store.subscribe(() => setTick((t) => t + 1)), [store]);

  const state = store.getState();
  const theme = state.dashboard.settings.theme ?? {};

  function handleChange(key: TilerThemeEditorProps extends never ? never : keyof typeof theme, value: string): void {
    store.getState().setThemeToken(
      key as "page" | "tile" | "tile_header" | "gutter",
      value || undefined,
    );
  }

  async function handleSave(): Promise<void> {
    const ds = store.getState().dashboard;
    try {
      await api.patchDashboard(ds.id, { settings: ds.settings });
      store.getState().markClean();
    } catch (err) {
      console.error("[tiler-editor] theme save failed:", err);
    }
  }

  return (
    <div
      className="tiler-theme-editor"
      style={{
        position: "fixed",
        right: 16,
        bottom: 16,
        width: 280,
        background: "var(--tiler-color-tile)",
        color: "var(--tiler-color-text)",
        borderRadius: "var(--tiler-radius)",
        padding: 16,
        boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
        zIndex: 50,
        // tick is read so React subscribes; use it via a CSS custom property to silence "unused"
        "--tiler-theme-editor-tick": String(tick),
      } as React.CSSProperties}
      role="dialog"
      aria-label="Theme editor"
    >
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <h2 style={{ margin: 0, fontSize: "0.85rem", textTransform: "uppercase", opacity: 0.7 }}>
          Theme
        </h2>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close theme editor"
            style={{ background: "transparent", color: "inherit", border: "none", cursor: "pointer", fontSize: "1rem" }}
          >
            ×
          </button>
        ) : null}
      </header>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {TOKEN_LABELS.map(({ key, label }) => (
          <label
            key={key}
            style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.8rem" }}
          >
            <span>{label}</span>
            <input
              type="color"
              value={theme[key] ?? "#000000"}
              onChange={(e) => handleChange(key, e.target.value)}
              aria-label={label}
              style={{ width: 32, height: 24, border: "none", background: "transparent", cursor: "pointer" }}
            />
          </label>
        ))}
      </div>
      <button
        type="button"
        onClick={() => void handleSave()}
        disabled={!state.dirty}
        style={{
          marginTop: 12,
          width: "100%",
          padding: "6px 12px",
          background: state.dirty ? "var(--tiler-color-accent)" : "var(--tiler-color-muted)",
          color: "var(--tiler-color-page, white)",
          border: "none",
          borderRadius: 4,
          cursor: state.dirty ? "pointer" : "not-allowed",
          fontSize: "0.85rem",
        }}
      >
        Save theme
      </button>
    </div>
  );
}
