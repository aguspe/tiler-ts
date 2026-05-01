import type { Meta, StoryObj } from "@storybook/react";
import { CommentsWidget } from "./CommentsWidget";
import { CommentsExample } from "./example";
import { resolveComments } from "./resolve";

const meta: Meta<typeof CommentsWidget> = {
  title: "Widgets/Comments",
  component: CommentsWidget,
};
export default meta;

type Story = StoryObj<typeof CommentsWidget>;

const ex = CommentsExample();
const data = resolveComments({
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
