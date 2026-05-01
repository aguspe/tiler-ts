import type { Meta, StoryObj } from "@storybook/react";
import { MetricWidget } from "./MetricWidget";
import { MetricExample } from "./example";
import { resolveMetric } from "./resolve";

const meta: Meta<typeof MetricWidget> = {
  title: "Widgets/Metric",
  component: MetricWidget,
};
export default meta;

type Story = StoryObj<typeof MetricWidget>;

const ex = MetricExample();
const data = resolveMetric({
  panel: ex.panel,
  records: ex.records,
  now: new Date(ex.panel.created_at),
});

export const Default: Story = {
  args: { panel: ex.panel, data },
};

export const WithPrefixSuffix: Story = {
  args: {
    panel: {
      ...ex.panel,
      title: "Revenue",
      config: {
        ...ex.panel.config,
        prefix: "$",
        suffix: "k",
        decimals: 1,
      },
    },
    data: { resolved: 12.4, empty: false },
  },
};
