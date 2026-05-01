import type { Meta, StoryObj } from "@storybook/react";
import { NumberWithDeltaExample } from "./example";
import { NumberWithDeltaWidget } from "./NumberWithDeltaWidget";

const meta: Meta<typeof NumberWithDeltaWidget> = {
  title: "Widgets/Number With Delta",
  component: NumberWithDeltaWidget,
};
export default meta;

type Story = StoryObj<typeof NumberWithDeltaWidget>;

const ex = NumberWithDeltaExample();

export const PositiveDelta: Story = {
  args: {
    panel: ex.panel,
    data: {
      resolved: { value: 142, delta: 18, delta_pct: 14.5, spark: [10, 12, 11, 14, 18, 17, 22, 24] },
      empty: false,
    },
  },
};

export const NegativeDelta: Story = {
  args: {
    panel: ex.panel,
    data: {
      resolved: { value: 12, delta: -3, delta_pct: -20, spark: [4, 5, 4, 3, 2, 3, 2, 1] },
      empty: false,
    },
  },
};

export const ZeroDelta: Story = {
  args: {
    panel: ex.panel,
    data: {
      resolved: { value: 50, delta: 0, delta_pct: 0, spark: [50, 50, 50, 50, 50] },
      empty: false,
    },
  },
};
