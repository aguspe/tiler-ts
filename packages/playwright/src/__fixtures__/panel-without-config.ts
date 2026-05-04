import { definePlaywrightConfig } from "../define-config";

export default definePlaywrightConfig({
  panels: [
    {
      widget_type: "metric",
      title: "No Config Defaulted",
      x: 0,
      y: 10,
      width: 3,
      height: 2,
    } as unknown as never, // intentional — verify resolver fills defaults
  ],
});
