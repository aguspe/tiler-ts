import type { Meta, StoryObj } from "@storybook/react";
import { TextWidget } from "./TextWidget";
import { TextExample } from "./example";

const meta: Meta<typeof TextWidget> = {
  title: "Widgets/Text",
  component: TextWidget,
};
export default meta;

type Story = StoryObj<typeof TextWidget>;

const ex = TextExample();

export const Default: Story = {
  args: { panel: ex.panel, data: { resolved: null, empty: false } },
};

export const HeadersAndLists: Story = {
  args: {
    panel: {
      ...ex.panel,
      config: {
        markdown:
          "# Sprint 12\n\n## Goals\n\n- Land tiler-ts core\n- Demo Phase 1\n\n**bold** and _italic_ text. [Docs](https://example.com).",
        align: "left",
      },
    },
    data: { resolved: null, empty: false },
  },
};
