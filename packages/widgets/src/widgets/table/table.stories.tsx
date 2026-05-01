import type { Meta, StoryObj } from "@storybook/react";
import { TableWidget } from "./TableWidget";
import { TableExample } from "./example";
import { resolveTable } from "./resolve";

const meta: Meta<typeof TableWidget> = {
  title: "Widgets/Table",
  component: TableWidget,
};
export default meta;

type Story = StoryObj<typeof TableWidget>;

const ex = TableExample();
const data = resolveTable({
  panel: ex.panel,
  records: ex.records,
  now: new Date(ex.panel.created_at),
});

export const Paginated: Story = {
  args: { panel: ex.panel, data },
};

export const NoPagination: Story = {
  args: {
    panel: { ...ex.panel, config: { ...ex.panel.config, pagination: false } },
    data,
  },
};
