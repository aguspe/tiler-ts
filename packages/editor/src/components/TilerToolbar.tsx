import { useEffect, useState } from "react";
import type { StoreApi } from "zustand/vanilla";
import type { EditorState } from "../state/editor-store";

export interface TilerToolbarProps {
  store: StoreApi<EditorState>;
  /** Toggle visibility of the palette sidebar (parent owns the layout). */
  paletteOpen: boolean;
  onTogglePalette: () => void;
  /** Toggle visibility of the theme editor pane. */
  themeEditorOpen: boolean;
  onToggleThemeEditor: () => void;
  /** Whether the dark theme is currently active. */
  darkMode: boolean;
  /** Toggle the dark theme independently of TV mode. */
  onToggleDarkMode: () => void;
}

/**
 * Page header — Rails parity. Renders the inline-editable dashboard title,
 * description, and the action row. The "+ Add Panel" button is the
 * primary action and sits leftmost in the actions group.
 *
 * No explicit Save button: TilerDashboardEditor auto-saves on every store
 * change.
 */
export function TilerToolbar({
  store,
  paletteOpen,
  onTogglePalette,
  themeEditorOpen,
  onToggleThemeEditor,
  darkMode,
  onToggleDarkMode,
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

  return (
    <header className="tiler-page-header" data-tick={tick}>
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
          className="tiler-btn tiler-btn-primary"
          onClick={onTogglePalette}
          aria-label="Toggle palette"
          aria-pressed={paletteOpen}
        >
          {paletteOpen ? "Done" : "+ Add Panel"}
        </button>
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
          onClick={onToggleDarkMode}
          aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
          aria-pressed={darkMode}
          title={darkMode ? "Light mode" : "Dark mode"}
        >
          {darkMode ? "☀️" : "🌙"}
        </button>
        <button
          type="button"
          className="tiler-btn"
          onClick={onToggleThemeEditor}
          aria-label="Toggle theme editor"
          aria-pressed={themeEditorOpen}
          title="Custom theme tokens"
        >
          🎨
        </button>
        <button
          type="button"
          className="tiler-btn"
          onClick={() => store.getState().toggleTvMode()}
          aria-label="Toggle TV mode"
          aria-pressed={state.dashboard.settings.tv_mode}
          title="TV / kiosk mode"
        >
          📺 TV
        </button>
      </div>
    </header>
  );
}
