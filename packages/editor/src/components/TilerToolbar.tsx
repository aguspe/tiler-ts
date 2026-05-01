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

/**
 * Page header — Rails parity. Renders the inline-editable dashboard title,
 * description, and the action row (Add Panel / Save / Undo / Redo / TV /
 * Theme). The component name is kept as `TilerToolbar` so the existing
 * test suite continues to drive it; it is conceptually the page-header
 * from the Rails template.
 */
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
      className="tiler-page-header"
      data-tick={tick}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
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
            className="tiler-page-title-input"
            aria-label="Dashboard name"
          />
        ) : (
          <h1
            className="tiler-page-title"
            onDoubleClick={() => setEditingName(true)}
            aria-label="Dashboard name (double-click to edit)"
          >
            {state.dashboard.name}
          </h1>
        )}
        {state.dashboard.description && (
          <p className="tiler-page-description">{state.dashboard.description}</p>
        )}
      </div>
      <div className="tiler-page-actions">
        <button
          type="button"
          className="tiler-btn"
          onClick={() => store.getState().undo()}
          disabled={state.undoStack.length === 0}
          aria-label="Undo (Cmd+Z)"
        >
          ⟲ Undo
        </button>
        <button
          type="button"
          className="tiler-btn"
          onClick={() => store.getState().redo()}
          disabled={state.redoStack.length === 0}
          aria-label="Redo (Cmd+Shift+Z)"
        >
          ⟳ Redo
        </button>
        <button
          type="button"
          className="tiler-btn"
          onClick={() => store.getState().toggleTvMode()}
          aria-label="Toggle TV mode"
          aria-pressed={state.dashboard.settings.tv_mode}
        >
          TV
        </button>
        <button
          type="button"
          className="tiler-btn"
          onClick={onToggleThemeEditor}
          aria-label="Toggle theme editor"
          aria-pressed={themeEditorOpen}
        >
          🎨 Theme
        </button>
        <button
          type="button"
          className="tiler-btn tiler-btn-primary"
          onClick={onTogglePalette}
          aria-label="Toggle palette"
          aria-pressed={paletteOpen}
        >
          {paletteOpen ? "Done" : "+ Add Panel"}
        </button>
        <button
          type="button"
          className="tiler-btn tiler-btn-success"
          onClick={() => void handleSave()}
          disabled={!state.dirty}
          aria-label="Save"
        >
          Save
        </button>
      </div>
    </header>
  );
}
