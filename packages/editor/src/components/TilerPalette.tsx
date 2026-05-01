import { listWidgets, newId, type Panel } from "@aguspe/tiler-core";
import "@aguspe/tiler-widgets"; // side effect: register all widgets

export interface TilerPaletteProps {
  dashboardId: string;
  onAdd: (panel: Panel) => void;
}

const DEFAULT_DATA_SOURCE_ID: string | null = null;
const GRID_COLUMNS = 12;
const GRID_CELL_HEIGHT = 90;

/**
 * Compute the gridstack {x, y} cell that the cursor was over at drop
 * time. We get the grid's bounding rect, divide the X coordinate by
 * (rect.width / column count) and the Y coordinate by the configured
 * `cellHeight`. The values are clamped so a wide widget dropped at the
 * far right doesn't extend past column 12.
 */
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

export function TilerPalette({ dashboardId, onAdd }: TilerPaletteProps): JSX.Element {
  const widgets = listWidgets();
  const now = new Date().toISOString();

  function handleDragEnd(event: React.DragEvent<HTMLLIElement>, widgetType: string): void {
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
