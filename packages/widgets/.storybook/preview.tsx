import type { Preview } from "@storybook/react";
import "../src/styles/tokens.css";

const preview: Preview = {
  parameters: {
    backgrounds: {
      default: "tiler-page",
      values: [
        { name: "tiler-page", value: "#0b0d12" },
        { name: "light", value: "#ffffff" },
      ],
    },
    layout: "centered",
  },
  decorators: [
    (Story) => (
      <div
        style={{
          width: "min(720px, 90vw)",
          minHeight: 200,
          padding: 24,
          background: "var(--tiler-color-tile)",
          color: "var(--tiler-color-text)",
          borderRadius: "var(--tiler-radius)",
          fontFamily: "var(--tiler-font-sans)",
        }}
      >
        <Story />
      </div>
    ),
  ],
};
export default preview;
