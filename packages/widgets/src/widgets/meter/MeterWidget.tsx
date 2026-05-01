import type { Panel, WidgetData } from "@aguspe/tiler-core";
import { MeterConfig } from "./schema";

export function MeterWidget({
  panel,
  data,
}: {
  panel: Panel;
  data: WidgetData<number>;
}): JSX.Element {
  const cfg = MeterConfig.parse(panel.config);
  const v = Math.max(cfg.min, Math.min(cfg.max, data.resolved));
  const pct = (v - cfg.min) / (cfg.max - cfg.min || 1);

  // Semicircle: arc from angle π (left) to 0 (right). Sweep based on pct.
  const r = 80;
  const cx = 100;
  const cy = 95;
  const angle = Math.PI - pct * Math.PI;
  const arcEndX = cx + r * Math.cos(angle);
  const arcEndY = cy - r * Math.sin(angle);
  const largeArc = pct > 0.5 ? 1 : 0;

  const target = cfg.target;
  let targetMarker: JSX.Element | null = null;
  if (target !== undefined) {
    const tPct = (target - cfg.min) / (cfg.max - cfg.min || 1);
    const tAngle = Math.PI - Math.max(0, Math.min(1, tPct)) * Math.PI;
    const x1 = cx + (r - 10) * Math.cos(tAngle);
    const y1 = cy - (r - 10) * Math.sin(tAngle);
    const x2 = cx + (r + 4) * Math.cos(tAngle);
    const y2 = cy - (r + 4) * Math.sin(tAngle);
    targetMarker = (
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--tiler-color-warn)" strokeWidth={2} />
    );
  }

  const fmt = (n: number) =>
    n.toLocaleString(undefined, {
      minimumFractionDigits: cfg.decimals,
      maximumFractionDigits: cfg.decimals,
    });

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", padding: 8 }}>
      <svg
        viewBox="0 0 200 110"
        style={{ width: "100%", flex: 1 }}
        role="img"
        aria-label="Meter gauge"
      >
        <path
          d={`M ${cx - r},${cy} A ${r},${r} 0 0 1 ${cx + r},${cy}`}
          fill="none"
          stroke="var(--tiler-color-muted)"
          strokeWidth={10}
          strokeOpacity={0.25}
        />
        <path
          d={`M ${cx - r},${cy} A ${r},${r} 0 ${largeArc} 1 ${arcEndX.toFixed(1)},${arcEndY.toFixed(1)}`}
          fill="none"
          stroke="var(--tiler-color-accent)"
          strokeWidth={10}
        />
        {targetMarker}
      </svg>
      <div style={{ textAlign: "center", fontSize: "1.1rem", fontWeight: 600 }}>
        {cfg.prefix}
        {fmt(data.resolved)}
        {cfg.suffix}
      </div>
    </div>
  );
}
