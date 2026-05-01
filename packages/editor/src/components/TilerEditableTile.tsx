import { TilerWidgetTile } from "@aguspe/tiler-viewer";
import type { Panel, WidgetData } from "@aguspe/tiler-core";
import { useEffect, useRef, useState } from "react";
import type { StoreApi } from "zustand/vanilla";
import type { TilerApiClient } from "../api/client";
import type { EditorState } from "../state/editor-store";

export interface TilerEditableTileProps {
  panel: Panel;
  data: WidgetData;
  store: StoreApi<EditorState>;
  api: TilerApiClient;
}

/**
 * Wraps `TilerWidgetTile` with editor-only affordances:
 *   - Double-click the title to rename inline.
 *   - Click the panel body (anywhere outside the title) to open the config drawer.
 *   - Hover-reveal `×` button in the corner to delete the panel (with confirm).
 */
export function TilerEditableTile({
  panel,
  data,
  store,
  api,
}: TilerEditableTileProps): JSX.Element {
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(panel.title);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingTitle) inputRef.current?.select();
  }, [editingTitle]);

  function commitTitle(): void {
    const next = titleDraft.trim();
    if (next.length === 0 || next === panel.title) {
      setTitleDraft(panel.title);
      setEditingTitle(false);
      return;
    }
    store.getState().setPanelTitle(panel.id, next);
    setEditingTitle(false);
  }

  async function handleDelete(): Promise<void> {
    if (!window.confirm(`Delete "${panel.title}"?`)) return;
    store.getState().removePanel(panel.id);
    try {
      await api.deletePanel(panel.id);
    } catch (err) {
      console.error("[tiler-editor] delete failed:", err);
    }
  }

  function openDrawer(event: React.MouseEvent<HTMLDivElement>): void {
    // Don't open the drawer when clicking on the title or the delete button.
    const target = event.target as HTMLElement;
    if (target.closest(".tiler-tile__title-edit") || target.closest(".tiler-tile__delete")) return;
    store.getState().openDrawer(panel.id);
  }

  return (
    <div
      className="tiler-editable-tile"
      style={{ position: "relative", height: "100%" }}
      onClick={openDrawer}
      onKeyDown={(e) => {
        if (e.key === "Enter") store.getState().openDrawer(panel.id);
      }}
      role="button"
      tabIndex={0}
    >
      {editingTitle ? (
        <div
          className="tiler-tile__title-edit"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            zIndex: 5,
            padding: "8px 12px",
            background: "var(--tiler-color-tile-header)",
          }}
        >
          <input
            ref={inputRef}
            type="text"
            value={titleDraft}
            onChange={(e) => setTitleDraft(e.target.value)}
            onBlur={commitTitle}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitTitle();
              if (e.key === "Escape") {
                setTitleDraft(panel.title);
                setEditingTitle(false);
              }
            }}
            style={{
              width: "100%",
              fontSize: "0.85rem",
              fontWeight: 600,
              padding: "2px 4px",
              background: "var(--tiler-color-tile)",
              color: "var(--tiler-color-text)",
              border: "1px solid var(--tiler-color-accent)",
              borderRadius: 4,
            }}
            // biome-ignore lint/a11y/noAutofocus: fine for an inline title edit
            autoFocus
          />
        </div>
      ) : null}
      <div
        onDoubleClick={(e) => {
          e.stopPropagation();
          setEditingTitle(true);
        }}
        style={{ height: "100%" }}
      >
        <TilerWidgetTile panel={panel} data={data} />
      </div>
      <button
        type="button"
        className="tiler-tile__delete"
        onClick={(e) => {
          e.stopPropagation();
          void handleDelete();
        }}
        aria-label={`Delete panel ${panel.title}`}
        style={{
          position: "absolute",
          top: 6,
          right: 6,
          width: 22,
          height: 22,
          borderRadius: "50%",
          border: "none",
          background: "rgba(239, 68, 68, 0.85)",
          color: "white",
          fontSize: "0.85rem",
          lineHeight: "20px",
          cursor: "pointer",
          opacity: 0,
          transition: "opacity 120ms",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.opacity = "1";
        }}
        onFocus={(e) => {
          e.currentTarget.style.opacity = "1";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.opacity = "0";
        }}
        onBlur={(e) => {
          e.currentTarget.style.opacity = "0";
        }}
      >
        ×
      </button>
    </div>
  );
}
