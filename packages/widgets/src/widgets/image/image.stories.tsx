import type { Meta, StoryObj } from "@storybook/react";
import { ImageWidget } from "./ImageWidget";
import { ImageExample } from "./example";

const meta: Meta<typeof ImageWidget> = {
  title: "Widgets/Image",
  component: ImageWidget,
};
export default meta;

type Story = StoryObj<typeof ImageWidget>;

const ex = ImageExample();

export const Default: Story = {
  args: { panel: ex.panel, data: { resolved: null, empty: false } },
};

export const SVGRelative: Story = {
  args: {
    panel: {
      ...ex.panel,
      config: {
        url: "https://upload.wikimedia.org/wikipedia/commons/9/95/Vue.js_Logo_2.svg",
        alt: "Vue logo (placeholder demo image)",
        fit: "contain",
      },
    },
    data: { resolved: null, empty: false },
  },
};
