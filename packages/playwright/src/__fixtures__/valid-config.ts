import { definePlaywrightConfig } from "../define-config";

export default definePlaywrightConfig({
  excludePanels: ["Pass Rate"],
  panels: [
    {
      widget_type: "metric",
      title: "From File",
      x: 0,
      width: 3,
      height: 2,
      config: {},
    },
  ],
});
