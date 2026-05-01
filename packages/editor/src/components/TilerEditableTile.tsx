import { type Panel, type WidgetData, getWidget } from "@aguspe/tiler-core";
import { useEffect, useRef, useState } from "react";
import type { StoreApi } from "zustand/vanilla";
import type { TilerApiClient } from "../api/client";
import type { EditorState } from "../state/editor-store";
import { TrashIcon } from "./Icons";

export interface TilerEditableTileProps {
  panel: Panel;
  data: WidgetData;
  store: StoreApi<EditorState>;
  api: TilerApiClient;
}

/**
 * Renders the editor's version of a panel — Rails-style structure:
 *
 *   .tiler-panel
 *     .tiler-panel-header       (drag handle, click target for drawer)
 *       .tiler-panel-title      (double-click → inline rename)
 *       .tiler-panel-actions
 *         × delete button       (hover-revealed)
 *     .tiler-panel-body
 *       <widget.component />    (or "No data" / "Unknown widget")
 *
 * The header is the drag handle and the drawer-open trigger. The body
 * renders the widget directly — we don't go through `TilerWidgetTile` here
 * because the editor wants its own header chrome.
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
  const widget = getWidget(panel.widget_type);

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

  function handleHeaderClick(): void {
    // The header is the drawer-open trigger. Drag interactions cancel the
    // click via gridstack's own event handling, so this only fires on a
    // genuine click.
    if (!editingTitle) store.getState().openDrawer(panel.id);
  }

  return (
    <section className="tiler-panel">
      <header
        className="tiler-panel-header"
        onClick={handleHeaderClick}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !editingTitle) {
            store.getState().openDrawer(panel.id);
          }
        }}
        role="button"
        tabIndex={0}
        aria-label={`Configure panel ${panel.title}`}
      >
        {editingTitle ? (
          <input
            ref={inputRef}
            type="text"
            value={titleDraft}
            onChange={(e) => setTitleDraft(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            onBlur={commitTitle}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === "Enter") commitTitle();
              if (e.key === "Escape") {
                setTitleDraft(panel.title);
                setEditingTitle(false);
              }
            }}
            className="tiler-panel-title-input"
            // biome-ignore lint/a11y/noAutofocus: inline rename
            autoFocus
            aria-label="Panel title"
          />
        ) : (
          <h3
            className="tiler-panel-title"
            onDoubleClick={(e) => {
              e.stopPropagation();
              setEditingTitle(true);
            }}
          >
            {panel.title}
          </h3>
        )}
        <div className="tiler-panel-actions">
          <button
            type="button"
            className="tiler-panel-action"
            onClick={(e) => {
              e.stopPropagation();
              void handleDelete();
            }}
            aria-label={`Delete panel ${panel.title}`}
          >
            <TrashIcon size={14} />
          </button>
        </div>
      </header>
      <div className="tiler-panel-body">
        {widget ? (
          data.empty || data.resolved == null ? (
            <div className="tiler-panel-empty">No data</div>
          ) : (
            <widget.component panel={panel} data={data} />
          )
        ) : (
          <div className="tiler-panel-empty">Unknown widget: {panel.widget_type}</div>
        )}
      </div>
    </section>
  );
}
