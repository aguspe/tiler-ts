import { type Panel, type WidgetData, getWidget } from "@aguspe/tiler-core";

/**
 * Read-only panel tile for the viewer (and Storybook). Mirrors the Rails
 * `tiler-panel` markup so the host CSS (paper background, hairline
 * border-right/bottom, header-as-handle) styles it identically to the
 * editor's tile, but without any of the editor-only affordances.
 */
export function TilerWidgetTile({
  panel,
  data,
}: {
  panel: Panel;
  data: WidgetData;
}): JSX.Element {
  const widget = getWidget(panel.widget_type);
  return (
    <section className="tiler-panel">
      <header className="tiler-panel-header">
        <h3 className="tiler-panel-title">{panel.title}</h3>
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
