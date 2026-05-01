import type { Meta, StoryObj } from "@storybook/react";
import { StatusGridExample } from "./example";
import { resolveStatusGrid } from "./resolve";
import { StatusGridWidget } from "./StatusGridWidget";

const meta: Meta<typeof StatusGridWidget> = {
  title: "Widgets/Status Grid",
  component: StatusGridWidget,
};
export default meta;

type Story = StoryObj<typeof StatusGridWidget>;

const ex = StatusGridExample();
const data = resolveStatusGrid({
  panel: ex.panel,
  records: ex.records,
  now: new Date(ex.panel.created_at),
});

export const Default: Story = {
  args: { panel: ex.panel, data },
};

export const Empty: Story = {
  args: { panel: ex.panel, data: { resolved: [], empty: true } },
};
