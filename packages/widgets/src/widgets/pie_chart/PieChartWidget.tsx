import type { Panel, WidgetData } from "@aguspe/tiler-core";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { ChartFrame } from "../../lib/ChartFrame";
import { chartColors } from "../../lib/chart-colors";
import type { PieChartResolved } from "./resolve";
import { PieChartConfig } from "./schema";

const TOOLTIP_STYLE = {
  background: "var(--tiler-color-tile)",
  border: "1px solid rgba(255,255,255,0.15)",
  color: "var(--tiler-color-text)",
  fontSize: 12,
};

export function PieChartWidget({
  panel,
  data,
}: {
  panel: Panel;
  data: WidgetData<PieChartResolved>;
}): JSX.Element {
  const cfg = PieChartConfig.parse(panel.config);
  const colors = chartColors(panel);
  return (
    <ChartFrame empty={data.empty}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data.resolved.bars}
            dataKey="v"
            nameKey="name"
            outerRadius="80%"
            innerRadius={cfg.donut ? "50%" : 0}
            isAnimationActive={false}
            label={({ name }) => name}
          >
            {data.resolved.bars.map((slice, i) => (
              <Cell key={slice.name} fill={colors[i % colors.length]} />
            ))}
          </Pie>
          <Tooltip contentStyle={TOOLTIP_STYLE} />
        </PieChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}
