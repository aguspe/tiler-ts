import { listWidgets, newId, type Panel } from "@aguspe/tiler-core";
import "@aguspe/tiler-widgets"; // side effect: register all widgets

/**
 * Snapshot of the currently-dragging palette item, lifted up to the
 * editor so both the palette (start/end) and the grid (ghost rendering)
 * can react to it.
 */
export interface PaletteDragMeta {
  widgetType: string;
  label: string;
  /** Default size in grid columns/rows. */
  w: number;
  h: number;
}

export interface TilerPaletteProps {
  dashboardId: string;
  onAdd: (panel: Panel) => void;
  onDragStart?: (meta: PaletteDragMeta) => void;
  onDragEnd?: () => void;
}

const DEFAULT_DATA_SOURCE_ID: string | null = null;
const GRID_COLUMNS = 12;
const GRID_CELL_HEIGHT = 90;

function dropCoordsForGrid(
  grid: HTMLElement,
  clientX: number,
  clientY: number,
  width: number,
): { x: number; y: number } {
  const rect = grid.getBoundingClientRect();
  const colWidth = rect.width / GRID_COLUMNS;
  const rawX = Math.floor((clientX - rect.left) / colWidth);
  const rawY = Math.floor((clientY - rect.top) / GRID_CELL_HEIGHT);
  const x = Math.max(0, Math.min(rawX, GRID_COLUMNS - width));
  const y = Math.max(0, rawY);
  return { x, y };
}

export function TilerPalette({
  dashboardId,
  onAdd,
  onDragStart,
  onDragEnd,
}: TilerPaletteProps): JSX.Element {
  const widgets = listWidgets();
  const now = new Date().toISOString();

  function handleDragStart(
    event: React.DragEvent<HTMLLIElement>,
    widgetType: string,
  ): void {
    const widget = widgets.find((w) => w.meta.type === widgetType);
    if (!widget) return;

    // Build a richer cursor image than the default browser-clone of the
    // small palette tile. The element must live in the DOM long enough
    // for the browser to snapshot it, then can be removed.
    const dragImage = document.createElement("div");
    dragImage.className = "tiler-drag-image";
    dragImage.textContent = `+ ${widget.meta.label}`;
    document.body.appendChild(dragImage);
    event.dataTransfer.setDragImage(dragImage, 20, 20);
    event.dataTransfer.effectAllowed = "copy";
    // Stamp our mime type so the grid's ghost handlers can recognize an
    // in-flight palette drag without needing to read the value (browsers
    // hide dataTransfer.getData() during dragover for security).
    event.dataTransfer.setData("application/x-tiler-widget", widgetType);
    setTimeout(() => {
      if (dragImage.parentNode) dragImage.parentNode.removeChild(dragImage);
    }, 0);

    onDragStart?.({
      widgetType,
      label: widget.meta.label,
      w: widget.meta.default_size.w,
      h: widget.meta.default_size.h,
    });
  }

  function handleDragEnd(event: React.DragEvent<HTMLLIElement>, widgetType: string): void {
    onDragEnd?.();
    const target = document.elementFromPoint(event.clientX, event.clientY);
    const grid = target?.closest(".grid-stack");
    if (!(grid instanceof HTMLElement)) return;
    const widget = widgets.find((w) => w.meta.type === widgetType);
    if (!widget) return;
    const { x, y } = dropCoordsForGrid(
      grid,
      event.clientX,
      event.clientY,
      widget.meta.default_size.w,
    );
    const newPanel: Panel = {
      id: newId(),
      dashboard_id: dashboardId,
      data_source_id: widget.meta.requires_data_source ? null : DEFAULT_DATA_SOURCE_ID,
      title: widget.meta.label,
      widget_type: widgetType,
      x,
      y,
      width: widget.meta.default_size.w,
      height: widget.meta.default_size.h,
      config: {},
      created_at: now,
      updated_at: now,
    };
    onAdd(newPanel);
  }

  return (
    <aside className="tiler-widget-palette" aria-label="Widget palette">
      <h2 className="tiler-widget-palette-title">Widgets</h2>
      <ul
        className="tiler-widget-palette-list"
        role="listbox"
        aria-label="Widget palette"
      >
        {widgets.map((w) => (
          <li
            key={w.meta.type}
            className="tiler-widget-palette-item"
            draggable
            data-gs-widget-type={w.meta.type}
            onDragStart={(e) => handleDragStart(e, w.meta.type)}
            onDragEnd={(e) => handleDragEnd(e, w.meta.type)}
            role="option"
            aria-selected={false}
            title={w.meta.description ?? ""}
          >
            {w.meta.label}
          </li>
        ))}
      </ul>
    </aside>
  );
}
