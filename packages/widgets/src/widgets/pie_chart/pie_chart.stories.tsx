import type { Meta, StoryObj } from "@storybook/react";
import { PieChartWidget } from "./PieChartWidget";
import { PieChartExample } from "./example";
import { resolvePieChart } from "./resolve";

const meta: Meta<typeof PieChartWidget> = {
  title: "Widgets/Pie Chart",
  component: PieChartWidget,
};
export default meta;

type Story = StoryObj<typeof PieChartWidget>;

const ex = PieChartExample();
const data = resolvePieChart({
  panel: ex.panel,
  records: ex.records,
  now: new Date(ex.panel.created_at),
});

export const Pie: Story = {
  args: { panel: ex.panel, data },
};

export const Donut: Story = {
  args: {
    panel: { ...ex.panel, config: { ...ex.panel.config, donut: true } },
    data,
  },
};

export const Empty: Story = {
  args: { panel: ex.panel, data: { resolved: { bars: [] }, empty: true } },
};
