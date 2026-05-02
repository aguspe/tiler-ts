# `@aguspe/tiler-viewer`

Read-only React renderer for tiler dashboards. Server-side rendered via `renderTilerDashboardHtml()`, client-side hydrated by the bundle in `dist/client/`.

Two consumers:

- **`@aguspe/tiler-server`** uses this to render `/dashboards/:slug` in static-viewer mode.
- **`@aguspe/tiler-playwright`** uses this to bake an HTML report at the end of a test run.

If you're building the live editor, you want **`@aguspe/tiler-editor`** instead.

## Install

```bash
npm i @aguspe/tiler-viewer
```

## SSR API

```ts
import { renderTilerDashboardHtml } from "@aguspe/tiler-viewer";
import "@aguspe/tiler-widgets"; // register widgets first

const html = renderTilerDashboardHtml({
  dashboard,
  panels,
  snapshot,
  clientAssetPath: "/assets/viewer-entry-abc.js",
  cssAssetPath: "/assets/viewer-abc.css",
});
```

## License

MIT — see [`LICENSE`](../../LICENSE).
