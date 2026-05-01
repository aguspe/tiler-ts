import type { Panel, WidgetData } from "@aguspe/tiler-core";
import { NumberWithDeltaConfig } from "./schema";
import type { NumberWithDeltaResolved } from "./resolve";
import { Sparkline } from "./Sparkline";

export function NumberWithDeltaWidget({
  panel,
  data,
}: {
  panel: Panel;
  data: WidgetData<NumberWithDeltaResolved>;
}): JSX.Element {
  const cfg = NumberWithDeltaConfig.parse(panel.config);
  const { value, delta, delta_pct, spark } = data.resolved;
  const fmt = (n: number) =>
    n.toLocaleString(undefined, {
      minimumFractionDigits: cfg.decimals,
      maximumFractionDigits: cfg.decimals,
    });
  const trend = delta > 0 ? "▲" : delta < 0 ? "▼" : "■";
  const color = cfg.color ?? "currentColor";
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", padding: 8, color }}>
      <div style={{ fontSize: "clamp(1.4rem, 5vw, 2.4rem)", fontWeight: 600, lineHeight: 1.1 }}>
        {cfg.prefix}
        {fmt(value)}
        {cfg.suffix}
      </div>
      <div style={{ fontSize: "0.85rem", opacity: 0.85, marginTop: 4 }}>
        {trend} {fmt(Math.abs(delta))}
        {delta_pct !== null && ` (${delta_pct.toFixed(1)}%)`}
      </div>
      <div style={{ flex: 1, marginTop: 8 }}>
        <Sparkline values={spark} color={color} />
      </div>
    </div>
  );
}
