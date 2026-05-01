import type { Meta, StoryObj } from "@storybook/react";
import { LineChartExample } from "./example";
import { LineChartWidget } from "./LineChartWidget";
import { resolveLineChart } from "./resolve";

const meta: Meta<typeof LineChartWidget> = {
  title: "Widgets/Line Chart",
  component: LineChartWidget,
};
export default meta;

type Story = StoryObj<typeof LineChartWidget>;

const ex = LineChartExample();
const data = resolveLineChart({
  panel: ex.panel,
  records: ex.records,
  now: new Date(ex.panel.created_at),
});

export const MultiSeries: Story = {
  args: { panel: ex.panel, data },
};

export const Empty: Story = {
  args: { panel: ex.panel, data: { resolved: { series: [] }, empty: true } },
};
