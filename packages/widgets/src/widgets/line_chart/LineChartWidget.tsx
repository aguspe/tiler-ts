import type { Panel, WidgetData } from "@aguspe/tiler-core";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartFrame } from "../../lib/ChartFrame";
import { chartColors } from "../../lib/chart-colors";
import type { LineChartResolved } from "./resolve";

const TOOLTIP_STYLE = {
  background: "var(--tiler-color-tile)",
  border: "1px solid rgba(255,255,255,0.15)",
  color: "var(--tiler-color-text)",
  fontSize: 12,
};

export function LineChartWidget({
  panel,
  data,
}: {
  panel: Panel;
  data: WidgetData<LineChartResolved>;
}): JSX.Element {
  const colors = chartColors(panel);
  // Pivot into wide-format rows: [{ t, [seriesName]: v, ... }]
  const allTimes = Array.from(
    new Set(data.resolved.series.flatMap((s) => s.points.map((p) => p.t))),
  ).sort();
  const rows = allTimes.map((t) => {
    const row: Record<string, unknown> = { t };
    for (const s of data.resolved.series) {
      row[s.name] = s.points.find((p) => p.t === t)?.v ?? 0;
    }
    return row;
  });

  return (
    <ChartFrame empty={data.empty}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={rows}>
          <CartesianGrid strokeOpacity={0.1} />
          <XAxis
            dataKey="t"
            tick={{ fontSize: 10, fill: "currentColor" }}
            tickFormatter={(t: string) =>
              new Date(t).toLocaleDateString(undefined, { month: "short", day: "numeric" })
            }
          />
          <YAxis tick={{ fontSize: 10, fill: "currentColor" }} />
          <Tooltip contentStyle={TOOLTIP_STYLE} />
          {data.resolved.series.map((s, i) => (
            <Line
              key={s.name}
              type="monotone"
              dataKey={s.name}
              stroke={colors[i % colors.length]}
              strokeWidth={1.6}
              dot={false}
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}
