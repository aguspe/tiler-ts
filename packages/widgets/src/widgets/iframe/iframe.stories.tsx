import type { Meta, StoryObj } from "@storybook/react";
import { IframeWidget } from "./IframeWidget";
import { IframeExample } from "./example";

const meta: Meta<typeof IframeWidget> = {
  title: "Widgets/Iframe",
  component: IframeWidget,
};
export default meta;

type Story = StoryObj<typeof IframeWidget>;

const ex = IframeExample();

export const ExampleCom: Story = {
  args: {
    panel: { ...ex.panel, config: { ...ex.panel.config, url: "https://example.com" } },
    data: { resolved: null, empty: false },
  },
};
