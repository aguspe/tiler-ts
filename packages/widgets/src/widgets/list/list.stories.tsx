import type { Meta, StoryObj } from "@storybook/react";
import { ListExample } from "./example";
import { ListWidget } from "./ListWidget";
import { resolveList } from "./resolve";

const meta: Meta<typeof ListWidget> = {
  title: "Widgets/List",
  component: ListWidget,
};
export default meta;

type Story = StoryObj<typeof ListWidget>;

const ex = ListExample();
const data = resolveList({ panel: ex.panel, records: ex.records, now: new Date(ex.panel.created_at) });

export const Default: Story = {
  args: { panel: ex.panel, data },
};

export const Empty: Story = {
  args: { panel: ex.panel, data: { resolved: [], empty: true } },
};
