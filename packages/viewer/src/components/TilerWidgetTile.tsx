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
  // Inline the layout-critical styles so the static viewer doesn't
  // depend on editor.css. Without these, the panel collapses to its
  // header height in a static report and Recharts mounts into a
  // zero-height container. Visual styling (tokens, hairlines, etc.)
  // still comes from the host CSS the consumer ships.
  const panelStyle: React.CSSProperties = {
    height: "100%",
    display: "flex",
    flexDirection: "column",
    background: "var(--paper-2)",
    borderRight: "1px solid var(--border)",
    borderBottom: "1px solid var(--border)",
  };
  const headerStyle: React.CSSProperties = {
    padding: "10px 14px",
    borderBottom: "1px solid var(--border)",
    background: "var(--paper-2)",
  };
  const titleStyle: React.CSSProperties = {
    fontFamily: "var(--font-display, system-ui)",
    fontSize: "var(--fs-body-sm, 13px)",
    fontWeight: 600,
    color: "var(--ink, #0e0f14)",
    margin: 0,
  };
  const bodyStyle: React.CSSProperties = {
    flex: 1,
    minHeight: 0,
    overflow: "hidden",
    padding: 14,
  };
  const emptyStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
    color: "var(--ink-3, #5b5e6b)",
    fontSize: "var(--fs-body-sm, 13px)",
  };
  return (
    <section className="tiler-panel" style={panelStyle}>
      <header className="tiler-panel-header" style={headerStyle}>
        <h3 className="tiler-panel-title" style={titleStyle}>
          {panel.title}
        </h3>
      </header>
      <div className="tiler-panel-body" style={bodyStyle}>
        {widget ? (
          (() => {
            const cfg = widget.configSchema.safeParse(panel.config);
            if (!cfg.success) {
              return (
                <div className="tiler-panel-empty" style={emptyStyle}>
                  Invalid config
                </div>
              );
            }
            if (widget.resolve && (data.empty || data.resolved == null)) {
              return (
                <div className="tiler-panel-empty" style={emptyStyle}>
                  No data
                </div>
              );
            }
            return <widget.component panel={panel} data={data} />;
          })()
        ) : (
          <div className="tiler-panel-empty" style={emptyStyle}>
            Unknown widget: {panel.widget_type}
          </div>
        )}
      </div>
    </section>
  );
}
