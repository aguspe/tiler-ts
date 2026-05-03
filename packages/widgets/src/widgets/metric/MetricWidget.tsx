import type { Panel, WidgetData } from "@aguspe/tiler-core";
import { MetricConfig } from "./schema";

export function MetricWidget({
  panel,
  data,
}: {
  panel: Panel;
  data: WidgetData<number>;
}): JSX.Element {
  const cfg = MetricConfig.parse(panel.config);
  const value = data.resolved;
  const formatted =
    value == null
      ? "—"
      : value.toLocaleString(undefined, {
          minimumFractionDigits: cfg.decimals,
          maximumFractionDigits: cfg.decimals,
        });
  return (
    <div
      className="tiler-metric"
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        height: "100%",
        padding: 8,
      }}
    >
      <div
        className="tiler-metric__value"
        style={{
          fontSize: "clamp(1.5rem, 6vw, 3rem)",
          fontWeight: 600,
          lineHeight: 1.1,
          color: cfg.color,
        }}
      >
        {cfg.prefix}
        {formatted}
        {cfg.suffix}
      </div>
    </div>
  );
}
