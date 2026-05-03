import type { Panel, WidgetData } from "@aguspe/tiler-core";
import type { TestTimelineResolved } from "./resolve";
import { TestTimelineConfig } from "./schema";

const STATUS_COLOR: Record<string, string> = {
  pass: "#10b981",
  fail: "#ef4444",
  skip: "#f59e0b",
};

export function TestTimelineWidget({
  panel,
  data,
}: {
  panel: Panel;
  data: WidgetData<TestTimelineResolved>;
}): JSX.Element {
  TestTimelineConfig.parse(panel.config);

  if (data.empty) {
    return (
      <div style={{ padding: 16, color: "var(--ink-3, #64748b)" }}>No test results.</div>
    );
  }

  const { rows, max_duration_ms } = data.resolved;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        padding: 8,
        overflowY: "auto",
        gap: 3,
      }}
    >
      {rows.map((row, i) => {
        const pct = max_duration_ms > 0 ? (row.duration_ms / max_duration_ms) * 100 : 0;
        const color = STATUS_COLOR[row.status] ?? "#64748b";
        const label =
          row.status === "skip" ? "skip" : `${(row.duration_ms / 1000).toFixed(2)}s`;
        return (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              style={{
                fontSize: "0.7rem",
                color: "var(--ink-3, #64748b)",
                width: 100,
                flexShrink: 0,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                textAlign: "right",
              }}
            >
              {row.test_name}
            </span>
            <div
              style={{
                flex: 1,
                background: "var(--page-bg, #0f172a)",
                borderRadius: 2,
                height: 12,
                position: "relative",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  height: "100%",
                  width: `${pct}%`,
                  background: color,
                  borderRadius: 2,
                }}
              />
            </div>
            <span
              style={{
                fontSize: "0.7rem",
                color: "var(--ink-3, #64748b)",
                width: 36,
                flexShrink: 0,
                textAlign: "right",
              }}
            >
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
