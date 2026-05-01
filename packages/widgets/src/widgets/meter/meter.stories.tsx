import type { Meta, StoryObj } from "@storybook/react";
import { MeterWidget } from "./MeterWidget";
import { MeterExample } from "./example";

const meta: Meta<typeof MeterWidget> = {
  title: "Widgets/Meter",
  component: MeterWidget,
};
export default meta;

type Story = StoryObj<typeof MeterWidget>;

const ex = MeterExample();

export const Default: Story = {
  args: { panel: ex.panel, data: { resolved: 250, empty: false } },
};

export const AtTarget: Story = {
  args: {
    panel: ex.panel,
    data: { resolved: 200, empty: false },
  },
};

export const OverTarget: Story = {
  args: {
    panel: ex.panel,
    data: { resolved: 850, empty: false },
  },
};
