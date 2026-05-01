import type { Panel, WidgetData } from "@aguspe/tiler-core";
import type { StatusGridCell } from "./resolve";

const COLOR: Record<string, string> = {
  pass: "var(--tiler-color-pass)",
  fail: "var(--tiler-color-fail)",
  warn: "var(--tiler-color-warn)",
  skip: "var(--tiler-color-skip)",
};

export function StatusGridWidget({
  data,
}: {
  panel: Panel;
  data: WidgetData<StatusGridCell[]>;
}): JSX.Element {
  if (data.empty) {
    return <div style={{ padding: 12, opacity: 0.6 }}>No groups in window.</div>;
  }
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
        gap: 6,
        padding: 6,
        height: "100%",
        overflow: "auto",
      }}
    >
      {data.resolved.map((cell) => (
        <div
          key={cell.key}
          style={{
            padding: "8px 10px",
            borderRadius: 6,
            background: COLOR[cell.status] ?? "var(--tiler-color-muted)",
            color: "#0b0d12",
            fontWeight: 600,
            fontSize: "0.85rem",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            minHeight: 48,
          }}
          title={`${cell.key}: ${cell.status} (${cell.count})`}
        >
          <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {cell.key}
          </div>
          <div style={{ fontSize: "0.7rem", opacity: 0.7 }}>
            {cell.status} · {cell.count}
          </div>
        </div>
      ))}
    </div>
  );
}
