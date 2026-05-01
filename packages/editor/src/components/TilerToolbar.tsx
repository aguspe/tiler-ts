import { useEffect, useState } from "react";
import type { StoreApi } from "zustand/vanilla";
import type { TilerApiClient } from "../api/client";
import type { EditorState } from "../state/editor-store";

export interface TilerToolbarProps {
  store: StoreApi<EditorState>;
  api: TilerApiClient;
  /** Toggle visibility of the palette sidebar (parent owns the layout). */
  paletteOpen: boolean;
  onTogglePalette: () => void;
  /** Toggle visibility of the theme editor pane. */
  themeEditorOpen: boolean;
  onToggleThemeEditor: () => void;
}

export function TilerToolbar({
  store,
  api,
  paletteOpen,
  onTogglePalette,
  themeEditorOpen,
  onToggleThemeEditor,
}: TilerToolbarProps): JSX.Element {
  const [tick, setTick] = useState(0);
  useEffect(() => store.subscribe(() => setTick((t) => t + 1)), [store]);
  const state = store.getState();
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(state.dashboard.name);

  // Cmd/Ctrl+Z and Cmd/Ctrl+Shift+Z keyboard shortcuts.
  useEffect(() => {
    function handler(e: KeyboardEvent): void {
      if (!(e.metaKey || e.ctrlKey)) return;
      if (e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        store.getState().undo();
      } else if (e.key === "z" && e.shiftKey) {
        e.preventDefault();
        store.getState().redo();
      }
    }
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [store]);

  function commitName(): void {
    const next = nameDraft.trim();
    if (next.length === 0 || next === state.dashboard.name) {
      setNameDraft(state.dashboard.name);
      setEditingName(false);
      return;
    }
    store.getState().setDashboardName(next);
    setEditingName(false);
  }

  async function handleSave(): Promise<void> {
    const ds = store.getState().dashboard;
    try {
      await api.patchDashboard(ds.id, { name: ds.name, settings: ds.settings });
      // Walk panels — for v0.0.5 we naively upsert every dirty panel.
      // (Smarter diffing lands in Phase 6.)
      for (const panel of store.getState().panels) {
        await api.upsertPanel(panel);
      }
      store.getState().markClean();
    } catch (err) {
      console.error("[tiler-editor] save failed:", err);
    }
  }

  return (
    <header
      className="tiler-toolbar"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "8px 16px",
        background: "var(--tiler-color-tile-header, #1a1f2c)",
        color: "var(--tiler-color-text, #e6edf3)",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
        // tick is read so the component subscribes to store changes
        "--tiler-toolbar-tick": String(tick),
      } as React.CSSProperties}
    >
      <button
        type="button"
        onClick={onTogglePalette}
        aria-label="Toggle palette"
        aria-pressed={paletteOpen}
        style={toolbarButton(paletteOpen)}
      >
        ☰
      </button>
      {editingName ? (
        <input
          type="text"
          value={nameDraft}
          onChange={(e) => setNameDraft(e.target.value)}
          onBlur={commitName}
          onKeyDown={(e) => {
            if (e.key === "Enter") commitName();
            if (e.key === "Escape") {
              setNameDraft(state.dashboard.name);
              setEditingName(false);
            }
          }}
          // biome-ignore lint/a11y/noAutofocus: inline rename
          autoFocus
          style={{
            fontSize: "1rem",
            fontWeight: 600,
            padding: "4px 8px",
            background: "var(--tiler-color-tile)",
            color: "var(--tiler-color-text)",
            border: "1px solid var(--tiler-color-accent)",
            borderRadius: 4,
            flex: 1,
            maxWidth: 320,
          }}
          aria-label="Dashboard name"
        />
      ) : (
        <button
          type="button"
          onDoubleClick={() => setEditingName(true)}
          style={{
            background: "transparent",
            border: "none",
            color: "inherit",
            fontSize: "1rem",
            fontWeight: 600,
            cursor: "text",
            padding: "4px 8px",
            flex: 1,
            textAlign: "left",
            maxWidth: 320,
          }}
          aria-label="Dashboard name (double-click to edit)"
        >
          {state.dashboard.name}
        </button>
      )}
      <span style={{ flex: 1 }} />
      <button
        type="button"
        onClick={() => store.getState().undo()}
        disabled={state.undoStack.length === 0}
        aria-label="Undo (Cmd+Z)"
        style={toolbarButton(false, state.undoStack.length === 0)}
      >
        ⟲ Undo
      </button>
      <button
        type="button"
        onClick={() => store.getState().redo()}
        disabled={state.redoStack.length === 0}
        aria-label="Redo (Cmd+Shift+Z)"
        style={toolbarButton(false, state.redoStack.length === 0)}
      >
        ⟳ Redo
      </button>
      <button
        type="button"
        onClick={() => store.getState().toggleTvMode()}
        aria-label="Toggle TV mode"
        aria-pressed={state.dashboard.settings.tv_mode}
        style={toolbarButton(state.dashboard.settings.tv_mode)}
      >
        TV
      </button>
      <button
        type="button"
        onClick={onToggleThemeEditor}
        aria-label="Toggle theme editor"
        aria-pressed={themeEditorOpen}
        style={toolbarButton(themeEditorOpen)}
      >
        🎨
      </button>
      <button
        type="button"
        onClick={() => void handleSave()}
        disabled={!state.dirty}
        aria-label="Save"
        style={{
          padding: "6px 16px",
          background: state.dirty ? "var(--tiler-color-accent)" : "var(--tiler-color-muted)",
          color: "white",
          border: "none",
          borderRadius: 4,
          cursor: state.dirty ? "pointer" : "not-allowed",
          fontSize: "0.85rem",
          fontWeight: 600,
        }}
      >
        Save
      </button>
    </header>
  );
}

function toolbarButton(active: boolean, disabled = false): React.CSSProperties {
  return {
    padding: "6px 10px",
    background: active ? "var(--tiler-color-accent)" : "transparent",
    color: "inherit",
    border: "1px solid rgba(255,255,255,0.15)",
    borderRadius: 4,
    cursor: disabled ? "not-allowed" : "pointer",
    fontSize: "0.85rem",
    opacity: disabled ? 0.5 : 1,
  };
}
