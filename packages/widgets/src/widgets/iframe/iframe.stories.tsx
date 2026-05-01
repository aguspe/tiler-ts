import type { Meta, StoryObj } from "@storybook/react";
import { IframeExample } from "./example";
import { IframeWidget } from "./IframeWidget";

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
