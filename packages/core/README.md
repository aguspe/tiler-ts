# `@aguspe/tiler-core`

Schemas, types, registry, and helpers shared by every other `@aguspe/tiler-*` package. **You normally don't depend on this directly** — it's pulled in transitively by `tiler-server`, `tiler-editor`, etc.

## What's here

- **Zod schemas** — `Dashboard`, `Panel`, `DataSource`, `DataRecord`, `WidgetData`, `TilerSnapshot`, plus per-domain helpers (`time_window`, `aggregate`, `apply-filter`, `group-bucket`).
- **Registry** — `defineWidget()`, `getWidget()`, `listWidgets()` for third-party widget packs.
- **MemoryStore** — in-process `TilerStore` adapter; what the Playwright reporter and tests use.
- **Snapshot builder** — `buildSnapshot()` runs every panel's resolver and bakes the output into a serializable snapshot for SSR.
- **`defineConfig()`** — typed helper for `tiler.config.ts`.
- **Presets** — `testAutomationPreset()` (the canonical demo dashboard).

## Install

```bash
npm i @aguspe/tiler-core
```

## Defining a custom widget

```ts
import { defineWidget } from "@aguspe/tiler-core";
import { z } from "zod";

const MyConfig = z.object({ label: z.string() });

defineWidget({
  meta: {
    type: "my_widget",
    label: "My widget",
    requires_data_source: false,
    default_size: { w: 3, h: 2 },
    min_size: { w: 1, h: 1 },
    max_size: { w: 12, h: 12 },
  },
  configSchema: MyConfig,
  component: ({ panel }) => <span>{(panel.config as any).label}</span>,
  example: () => ({
    panel: { /* ... */ } as any,
    records: [],
  }),
});
```

## License

MIT — see [`LICENSE`](../../LICENSE).
