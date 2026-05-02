import type { SidebarsConfig } from "@docusaurus/plugin-content-docs";

const sidebars: SidebarsConfig = {
  docs: [
    "intro",
    {
      type: "category",
      label: "Playwright integration",
      collapsed: false,
      items: ["reporter", "live-server", "cli-import"],
    },
    "widgets-tour",
    "going-further",
  ],
};

export default sidebars;
