import type { Panel, WidgetData } from "@aguspe/tiler-core";
import type { SuiteProgressResolved } from "./resolve";
import { SuiteProgressConfig } from "./schema";

function thresholdColor(value: number, good: number, warn: number): string {
  if (value >= good) return "#10b981";
  if (value >= warn) return "#f59e0b";
  return "#ef4444";
}

export function SuiteProgressWidget({
  panel,
  data,
}: {
  panel: Panel;
  data: WidgetData<SuiteProgressResolved>;
}): JSX.Element {
  const cfg = SuiteProgressConfig.parse(panel.config);

  if (data.empty) {
    return (
      <div style={{ padding: 16, color: "var(--ink-3, #64748b)" }}>No suite data.</div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        padding: 8,
        gap: 10,
        overflowY: "auto",
      }}
    >
      {data.resolved.map((row) => {
        const color = thresholdColor(row.pass_rate, cfg.good_threshold, cfg.warn_threshold);
        return (
          <div key={row.suite}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 3,
              }}
            >
              <span style={{ fontSize: "0.8rem" }}>{row.suite}</span>
              <span style={{ fontSize: "0.8rem", color }}>{row.pass_rate.toFixed(0)}%</span>
            </div>
            <div
              style={{
                background: "var(--page-bg, #0f172a)",
                borderRadius: 3,
                height: 8,
              }}
            >
              <div
                style={{
                  width: `${row.pass_rate}%`,
                  height: "100%",
                  background: color,
                  borderRadius: 3,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
