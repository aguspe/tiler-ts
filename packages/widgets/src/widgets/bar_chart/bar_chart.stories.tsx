import type { Meta, StoryObj } from "@storybook/react";
import { BarChartExample } from "./example";
import { BarChartWidget } from "./BarChartWidget";
import { resolveBarChart } from "./resolve";

const meta: Meta<typeof BarChartWidget> = {
  title: "Widgets/Bar Chart",
  component: BarChartWidget,
};
export default meta;

type Story = StoryObj<typeof BarChartWidget>;

const ex = BarChartExample();
const data = resolveBarChart({
  panel: ex.panel,
  records: ex.records,
  now: new Date(ex.panel.created_at),
});

export const Vertical: Story = {
  args: { panel: ex.panel, data },
};

export const Horizontal: Story = {
  args: {
    panel: { ...ex.panel, config: { ...ex.panel.config, orientation: "horizontal" } },
    data,
  },
};
