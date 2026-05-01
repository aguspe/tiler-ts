import { type Panel, type WidgetData, getWidget } from "@aguspe/tiler-core";

export function TilerWidgetTile({
  panel,
  data,
}: {
  panel: Panel;
  data: WidgetData;
}): JSX.Element {
  const widget = getWidget(panel.widget_type);
  return (
    <section
      className="tiler-tile"
      style={{
        background: "var(--tiler-color-tile)",
        borderRadius: "var(--tiler-radius)",
        display: "flex",
        flexDirection: "column",
        height: "100%",
      }}
    >
      <header
        className="tiler-tile__header"
        style={{
          background: "var(--tiler-color-tile-header)",
          padding: "8px 12px",
          fontSize: "0.85rem",
          fontWeight: 600,
          borderTopLeftRadius: "var(--tiler-radius)",
          borderTopRightRadius: "var(--tiler-radius)",
        }}
      >
        {panel.title}
      </header>
      <div className="tiler-tile__body" style={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
        {widget ? (
          // Resolvers signal "no data" via `empty: true` and typically hand
          // back `resolved: null`. Render a neutral placeholder here so each
          // widget's render code can assume `resolved` is populated.
          data.empty || data.resolved == null ? (
            <div
              style={{
                padding: 12,
                opacity: 0.5,
                fontSize: "0.85rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                height: "100%",
              }}
            >
              No data
            </div>
          ) : (
            <widget.component panel={panel} data={data} />
          )
        ) : (
          <div style={{ padding: 12, opacity: 0.6, fontSize: "0.85rem" }}>
            Unknown widget: {panel.widget_type}
          </div>
        )}
      </div>
    </section>
  );
}
