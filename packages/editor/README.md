# `@aguspe/tiler-editor`

The drag-and-drop dashboard editor. SSR'd by `@aguspe/tiler-server` at `/dashboards/:slug` and hydrated over the prebuilt client bundle.

## Features

- **Drag/drop palette** with cursor-image preview and a dashed drop ghost that snaps to the target cell. Newly dropped widgets pre-fill from `widget.example()` so they render real data immediately.
- **Slide-in palette** that pushes the grid (not an overlay). Closes on outside-click.
- **Drawer with live preview** + `Use example` button.
- **Auto-save** on every store change (600 ms debounce). No save button.
- **Inline title rename** (double-click anywhere a title shows) and a **custom delete confirm modal**.
- **Floating undo/redo bar** + ⌘Z / ⌘⇧Z.
- **TV mode** — kiosk view that hides the chrome.
- **Dark/light toggle**, independent of TV mode.
- **Resize from any edge or corner** — invisible handles, just the cursor change.

## Install

```bash
npm i @aguspe/tiler-editor @aguspe/tiler-server
```

The editor is normally served as part of `@aguspe/tiler-server`; you don't import the React component directly unless you're embedding the editor in a custom Node host.

## Direct SSR API

```ts
import { renderEditorHtml } from "@aguspe/tiler-editor";
import "@aguspe/tiler-widgets";

const html = renderEditorHtml({
  dashboard,
  dataSources,
  panels,
  snapshot,
  clientAssetPath: "/assets/editor-entry-…js",
  cssAssetPath: "/assets/editor-…css",
});
```

## License

MIT — see [`LICENSE`](../../LICENSE).
