import { useEffect, useState } from "react";
import type { StoreApi } from "zustand/vanilla";
import type { EditorState } from "../state/editor-store";
import { RedoIcon, UndoIcon } from "./Icons";

export interface TilerHistoryBarProps {
  store: StoreApi<EditorState>;
}

/**
 * Floating undo/redo dock — bottom-left corner of the editor. Stays out
 * of the page header so the title and primary "+ Add Panel" action have
 * the spotlight. Keyboard shortcuts (Cmd+Z / Cmd+Shift+Z) are wired in
 * `TilerToolbar` and remain active even when this bar is hidden.
 */
export function TilerHistoryBar({ store }: TilerHistoryBarProps): JSX.Element {
  const [, setTick] = useState(0);
  useEffect(() => store.subscribe(() => setTick((t) => t + 1)), [store]);
  const state = store.getState();
  const canUndo = state.undoStack.length > 0;
  const canRedo = state.redoStack.length > 0;

  return (
    <div className="tiler-history-bar" role="group" aria-label="History">
      <button
        type="button"
        className="tiler-history-btn"
        onClick={() => store.getState().undo()}
        disabled={!canUndo}
        aria-label="Undo (Cmd+Z)"
        title="Undo (⌘Z)"
      >
        <UndoIcon />
      </button>
      <button
        type="button"
        className="tiler-history-btn"
        onClick={() => store.getState().redo()}
        disabled={!canRedo}
        aria-label="Redo (Cmd+Shift+Z)"
        title="Redo (⌘⇧Z)"
      >
        <RedoIcon />
      </button>
    </div>
  );
}
