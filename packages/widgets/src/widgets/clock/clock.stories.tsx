import type { Meta, StoryObj } from "@storybook/react";
import { ClockWidget } from "./ClockWidget";
import { ClockExample } from "./example";

const meta: Meta<typeof ClockWidget> = {
  title: "Widgets/Clock",
  component: ClockWidget,
};
export default meta;

type Story = StoryObj<typeof ClockWidget>;

const ex = ClockExample();

export const Default24h: Story = {
  args: { panel: ex.panel, data: { resolved: null, empty: false } },
};

export const Format12h: Story = {
  args: {
    panel: { ...ex.panel, config: { ...ex.panel.config, format: "12h" } },
    data: { resolved: null, empty: false },
  },
};

export const WithSeconds: Story = {
  args: {
    panel: { ...ex.panel, config: { ...ex.panel.config, show_seconds: true } },
    data: { resolved: null, empty: false },
  },
};
