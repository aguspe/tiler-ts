import type { Panel, WidgetData } from "@aguspe/tiler-core";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartFrame } from "../../lib/ChartFrame";
import { chartColors } from "../../lib/chart-colors";
import type { BarChartResolved } from "./resolve";
import { BarChartConfig } from "./schema";

const TOOLTIP_STYLE = {
  background: "var(--tiler-color-tile)",
  border: "1px solid rgba(255,255,255,0.15)",
  color: "var(--tiler-color-text)",
  fontSize: 12,
};

export function BarChartWidget({
  panel,
  data,
}: {
  panel: Panel;
  data: WidgetData<BarChartResolved>;
}): JSX.Element {
  const cfg = BarChartConfig.parse(panel.config);
  const colors = chartColors(panel);
  const horizontal = cfg.orientation === "horizontal";

  return (
    <ChartFrame empty={data.empty}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data.resolved.bars} layout={horizontal ? "vertical" : "horizontal"}>
          <CartesianGrid strokeOpacity={0.1} />
          {horizontal ? (
            <>
              <XAxis type="number" tick={{ fontSize: 10, fill: "currentColor" }} />
              <YAxis
                dataKey="name"
                type="category"
                tick={{ fontSize: 10, fill: "currentColor" }}
                width={100}
              />
            </>
          ) : (
            <>
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: "currentColor" }} />
              <YAxis tick={{ fontSize: 10, fill: "currentColor" }} />
            </>
          )}
          <Tooltip contentStyle={TOOLTIP_STYLE} />
          <Bar dataKey="v" fill={colors[0]} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}
