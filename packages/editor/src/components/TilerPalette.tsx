import { listWidgets, newId, type Panel } from "@aguspe/tiler-core";
import "@aguspe/tiler-widgets"; // side effect: register all widgets

export interface TilerPaletteProps {
  dashboardId: string;
  onAdd: (panel: Panel) => void;
}

const DEFAULT_DATA_SOURCE_ID: string | null = null;

export function TilerPalette({ dashboardId, onAdd }: TilerPaletteProps): JSX.Element {
  const widgets = listWidgets();
  const now = new Date().toISOString();

  function handleDragEnd(event: React.DragEvent<HTMLLIElement>, widgetType: string): void {
    const target = document.elementFromPoint(event.clientX, event.clientY);
    if (!target?.closest(".grid-stack")) return;
    const widget = widgets.find((w) => w.meta.type === widgetType);
    if (!widget) return;
    const newPanel: Panel = {
      id: newId(),
      dashboard_id: dashboardId,
      data_source_id: widget.meta.requires_data_source ? null : DEFAULT_DATA_SOURCE_ID,
      title: widget.meta.label,
      widget_type: widgetType,
      x: 0,
      y: 0,
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
