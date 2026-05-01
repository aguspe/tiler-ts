import type { TilerSnapshot } from "@aguspe/tiler-core";
import type { CSSProperties } from "react";
import { TilerWidgetTile } from "./TilerWidgetTile";

const ROW_HEIGHT_PX = 80;
const COLUMNS = 12;

export function TilerDashboardViewer({
  snapshot,
}: {
  snapshot: TilerSnapshot;
}): JSX.Element {
  const theme = snapshot.dashboard.settings.theme;
  const themeStyle: CSSProperties = {
    ...(theme?.page && ({ "--tiler-color-page": theme.page } as CSSProperties)),
    ...(theme?.tile && ({ "--tiler-color-tile": theme.tile } as CSSProperties)),
    ...(theme?.tile_header &&
      ({ "--tiler-color-tile-header": theme.tile_header } as CSSProperties)),
    background: "var(--tiler-color-page)",
    color: "var(--tiler-color-text)",
    fontFamily: "var(--tiler-font-sans)",
    minHeight: "100vh",
    padding: 16,
  };

  return (
    <div className="tiler-dashboard" style={themeStyle}>
      <header style={{ marginBottom: 16 }}>
        <h1 style={{ margin: 0, fontSize: "1.5rem" }}>{snapshot.dashboard.name}</h1>
        {snapshot.dashboard.description && (
          <p style={{ margin: "4px 0 0 0", opacity: 0.7, fontSize: "0.9rem" }}>
            {snapshot.dashboard.description}
          </p>
        )}
      </header>
      <div
        className="tiler-grid"
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${COLUMNS}, 1fr)`,
          gridAutoRows: `${ROW_HEIGHT_PX}px`,
          gap: 12,
        }}
      >
        {snapshot.panels.map((panel) => (
          <div
            key={panel.id}
            style={{
              gridColumn: `${panel.x + 1} / span ${panel.width}`,
              gridRow: `${panel.y + 1} / span ${panel.height}`,
            }}
          >
            <TilerWidgetTile
              panel={panel}
              data={snapshot.resolved[panel.id] ?? { resolved: null, empty: true }}
            />
          </div>
        ))}
      </div>
      <footer
        style={{
          marginTop: 16,
          fontSize: "0.7rem",
          opacity: 0.5,
          textAlign: "right",
          fontFamily: "var(--tiler-font-mono)",
        }}
      >
        Generated at {new Date(snapshot.generated_at).toLocaleString()}
      </footer>
    </div>
  );
}
