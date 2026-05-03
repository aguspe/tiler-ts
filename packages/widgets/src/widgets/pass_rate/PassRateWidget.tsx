import type { Panel, WidgetData } from "@aguspe/tiler-core";
import type { PassRateResolved } from "./resolve";
import { PassRateConfig } from "./schema";

function thresholdColor(value: number, good: number, warn: number): string {
  if (value >= good) return "#10b981";
  if (value >= warn) return "#f59e0b";
  return "#ef4444";
}

export function PassRateWidget({
  panel,
  data,
}: {
  panel: Panel;
  data: WidgetData<PassRateResolved>;
}): JSX.Element {
  const cfg = PassRateConfig.parse(panel.config);

  if (data.empty) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          fontSize: "clamp(1.5rem, 6vw, 3rem)",
          fontWeight: 600,
        }}
      >
        —
      </div>
    );
  }

  const { value, total, passed } = data.resolved;
  const color = thresholdColor(value, cfg.good_threshold, cfg.warn_threshold);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        height: "100%",
        padding: 8,
      }}
    >
      <div
        style={{
          fontSize: "clamp(1.5rem, 6vw, 3rem)",
          fontWeight: 600,
          color,
          lineHeight: 1.1,
        }}
      >
        {value.toFixed(1)}%
      </div>
      <div
        style={{
          fontSize: "0.75rem",
          color: "var(--ink-3, #64748b)",
          marginTop: 4,
        }}
      >
        {passed} / {total} passed
      </div>
    </div>
  );
}
