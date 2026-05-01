# tiler-ts Phase 5 — Editor (Gridstack + Drawer + Palette) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `@aguspe/tiler-editor` — the gridstack-based authoring UX. Replaces the read-only viewer mounted at `/dashboards/:slug` in Phase 4. Users can drag panels around, resize them, drop new widgets from a palette, edit panel config via a slide-over drawer, rename dashboards inline, delete panels with hover-delete, override the dashboard theme tokens, toggle TV mode, and undo/redo any of the above. All edits persist through the existing `/api/*` PATCH endpoints from Phase 4.

**Architecture:** A separate React app, dual-built like `@aguspe/tiler-viewer` (tsup for SSR shell, Vite for hydration bundle). Editor state lives in Zustand: `{ dashboard, panels, dirty, undoStack, redoStack, drawerPanelId, tvMode }`. Gridstack manages the grid imperatively; we sync gridstack events into Zustand and feed Zustand back into gridstack as initial layout. The Phase 4 server's `/dashboards/:slug` route swaps from `renderToHtml(snapshot)` (viewer) to `renderToHtml(editorShell)` (editor).

For v0.0.5, the **drawer's panel config editor is a JSON textarea** with Zod validation on save. Per-widget custom forms (clock UI, line_chart UI, etc.) are deferred to v0.5.x once we know which widgets people configure most.

**Tech Stack:** Same as viewer + `gridstack@11` + `zustand@5`. Charts already lazy-loaded via Recharts code-splitting from Phase 2.

**Spec reference:** `docs/superpowers/specs/2026-04-30-tiler-ts-design.md` — §1 viewer/editor split, §3 widget config editor, §5 keyboard nav + focus trap, §6 visual regression.

**Phase 4 prerequisite:** tag `v0.0.4-phase-4`. Server with full CRUD API + WebSocket is running.

---

## Per-package conventions

`@aguspe/tiler-editor`:
- `src/server/` — SSR shell (consumed by `@aguspe/tiler-server`).
- `src/client/` — Vite-built browser bundle.
- `src/components/` — React components shared by both.
- `src/state/` — Zustand stores.
- `src/api/` — fetch wrappers around server's `/api/*`.
- `src/test/` — vitest setup.

The server's `viewer-pages.ts` from Phase 4 gets replaced (or augmented) to mount the editor when the dashboard is editable. v0.0.5 keeps it simple: always mount the editor; auth gates whether mutations are accepted server-side.

---

## Task 1: Scaffold `@aguspe/tiler-editor`

**Files:**
- Create: `packages/editor/package.json`
- Create: `packages/editor/tsconfig.json`
- Create: `packages/editor/tsup.config.ts`
- Create: `packages/editor/vite.config.ts`
- Create: `packages/editor/vitest.config.ts`
- Create: `packages/editor/src/{server,client,components,state,api,test}/`
- Create: placeholder `src/server/index.ts`, `src/client/main.tsx`, `src/test/setup.ts`

Pattern mirrors `@aguspe/tiler-viewer` exactly. Dual build: tsup for `dist/server/`, vite for `dist/client/viewer-[hash].{js,css}`. Peer dep on `react` + `react-dom`. Direct deps on `gridstack@^11.0.0`, `zustand@^5.0.0`, plus workspace `@aguspe/tiler-{core,widgets,viewer}`.

`package.json` exports:
- `.` → `dist/server/index.{js,cjs,d.ts}`
- `./client/*` → `dist/client/*`

- [ ] **Step 1-9:** Same shape as Phase 3 Task 3 (viewer scaffold). Differences:
  - Add `gridstack` and `zustand` to dependencies.
  - Add `@aguspe/tiler-viewer` as a workspace dep (the editor reuses `<TilerWidgetTile>`).
  - Vite entry: `src/client/main.tsx` (placeholder).
  - tsup entry: `src/server/index.ts` (placeholder).
- [ ] **Step 10: Verify both builds run cleanly. Commit.**

```bash
git commit -m "feat(editor): scaffold @aguspe/tiler-editor (tsup + vite dual build)"
```

---

## Task 2: Zustand state store

**Files:**
- Create: `packages/editor/src/state/editor-store.ts`
- Create: `packages/editor/src/state/editor-store.test.ts`

A single store with the editor's mutable state and reducer-style mutators.

- [ ] **Step 1: Test**

```ts
import { describe, expect, it, beforeEach } from "vitest";
import { createEditorStore } from "./editor-store";

const PANEL_A = { id: "p1", dashboard_id: "d1", data_source_id: null,
  title: "A", widget_type: "clock", x: 0, y: 0, width: 3, height: 2,
  config: {}, created_at: "2026-01-01T00:00:00.000Z", updated_at: "2026-01-01T00:00:00.000Z" };
const DASHBOARD = { id: "d1", name: "QA", slug: "qa", description: null,
  refresh_seconds: 0, settings: { tv_mode: false },
  created_at: "2026-01-01T00:00:00.000Z", updated_at: "2026-01-01T00:00:00.000Z" };

describe("editor store", () => {
  it("hydrates with a dashboard + panels", () => {
    const store = createEditorStore({ dashboard: DASHBOARD, panels: [PANEL_A] });
    expect(store.getState().dashboard.id).toBe("d1");
    expect(store.getState().panels).toHaveLength(1);
    expect(store.getState().dirty).toBe(false);
  });

  it("setPanelLayout marks the store dirty + pushes to undo stack", () => {
    const store = createEditorStore({ dashboard: DASHBOARD, panels: [PANEL_A] });
    store.getState().setPanelLayout("p1", { x: 3, y: 0, width: 6, height: 2 });
    expect(store.getState().panels[0]?.x).toBe(3);
    expect(store.getState().panels[0]?.width).toBe(6);
    expect(store.getState().dirty).toBe(true);
    expect(store.getState().undoStack.length).toBeGreaterThan(0);
  });

  it("undo restores the previous panel layout", () => {
    const store = createEditorStore({ dashboard: DASHBOARD, panels: [PANEL_A] });
    store.getState().setPanelLayout("p1", { x: 6, y: 0, width: 3, height: 2 });
    store.getState().undo();
    expect(store.getState().panels[0]?.x).toBe(0);
  });

  it("redo re-applies the undone change", () => {
    const store = createEditorStore({ dashboard: DASHBOARD, panels: [PANEL_A] });
    store.getState().setPanelLayout("p1", { x: 6, y: 0, width: 3, height: 2 });
    store.getState().undo();
    store.getState().redo();
    expect(store.getState().panels[0]?.x).toBe(6);
  });

  it("toggleTvMode flips the dashboard.settings.tv_mode flag", () => {
    const store = createEditorStore({ dashboard: DASHBOARD, panels: [] });
    store.getState().toggleTvMode();
    expect(store.getState().dashboard.settings.tv_mode).toBe(true);
  });
});
```

- [ ] **Step 2-3: Implement `createEditorStore`**

Use Zustand's vanilla `createStore` (not `create` — we want explicit subscriptions). State shape:

```ts
interface EditorState {
  dashboard: Dashboard;
  panels: Panel[];
  dirty: boolean;
  drawerPanelId: string | null;
  // Undo/redo: snapshots of { dashboard, panels }
  undoStack: Array<{ dashboard: Dashboard; panels: Panel[] }>;
  redoStack: Array<{ dashboard: Dashboard; panels: Panel[] }>;

  // Actions:
  setPanelLayout(id: string, layout: { x: number; y: number; width: number; height: number }): void;
  setPanelConfig(id: string, config: Record<string, unknown>): void;
  setPanelTitle(id: string, title: string): void;
  addPanel(panel: Panel): void;
  removePanel(id: string): void;
  setDashboardName(name: string): void;
  setThemeToken(key: "page" | "tile" | "tile_header" | "gutter", value: string | null): void;
  toggleTvMode(): void;
  openDrawer(panelId: string): void;
  closeDrawer(): void;
  undo(): void;
  redo(): void;
  markClean(): void;
}
```

Each mutator: capture pre-mutation snapshot via deep-clone, push onto `undoStack`, clear `redoStack`, apply mutation, set `dirty: true`.

Cap `undoStack` at 50 entries (drop oldest).

- [ ] **Step 4: Run + commit**

```bash
git commit -m "feat(editor): add Zustand store with panels + dashboard + undo stack"
```

---

## Task 3: API client

**Files:**
- Create: `packages/editor/src/api/client.ts`
- Create: `packages/editor/src/api/client.test.ts`

Thin fetch wrapper around the Phase 4 routes. Handles CSRF token + basic auth headers transparently. Returns parsed JSON or throws on non-2xx.

- [ ] **Step 1-3: Implement + test**

```ts
export interface TilerApiClient {
  upsertPanel(panel: PanelInput): Promise<Panel>;
  deletePanel(id: string): Promise<void>;
  patchDashboard(id: string, updates: Partial<Dashboard>): Promise<Dashboard>;
}

export function createApiClient(opts: { baseUrl?: string; csrfToken?: string }): TilerApiClient {
  // ...
}
```

For tests, mock `globalThis.fetch` via `vi.stubGlobal("fetch", vi.fn(...))`.

```bash
git commit -m "feat(editor): add API client with CSRF + JSON helpers"
```

---

## Task 4: `<TilerGridstack>` React wrapper

**Files:**
- Create: `packages/editor/src/components/TilerGridstack.tsx`
- Create: `packages/editor/src/components/TilerGridstack.test.tsx`

Imperative gridstack lifecycle inside a React component. Critical: gridstack mounts on `useEffect`, reads child DOM nodes by their `data-gs-*` attributes, and emits events on drag/resize. Sync those events back into the Zustand store.

```tsx
import { GridStack } from "gridstack";
import "gridstack/dist/gridstack.min.css";
import { useEffect, useRef } from "react";

export function TilerGridstack({
  panels, onPanelLayoutChanged, children,
}: {
  panels: Panel[];
  onPanelLayoutChanged: (id: string, layout: { x: number; y: number; width: number; height: number }) => void;
  children: ReactNode;
}): JSX.Element {
  const gridRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!gridRef.current) return;
    const grid = GridStack.init({ column: 12, cellHeight: 80, margin: 6, float: true }, gridRef.current);
    grid.on("change", (_e, items) => {
      for (const item of items) {
        if (typeof item.id !== "string") continue;
        onPanelLayoutChanged(item.id, {
          x: item.x ?? 0, y: item.y ?? 0,
          width: item.w ?? 1, height: item.h ?? 1,
        });
      }
    });
    return () => grid.destroy(false);  // false = keep DOM, React unmounts it
  }, [onPanelLayoutChanged]);

  return (
    <div ref={gridRef} className="grid-stack">
      {children}
    </div>
  );
}
```

Children must be rendered with `gs-id`, `gs-x`, `gs-y`, `gs-w`, `gs-h` attributes — these become the gridstack item's identity.

- [ ] **Step 1-3: Implement + test**

Tests use jsdom; gridstack will throw on missing layout features. Wrap in `try` and assert that the wrapper renders without crashing. The real interaction tests come in Task 16 (visual regression).

```bash
git commit -m "feat(editor): add TilerGridstack React wrapper"
```

---

## Task 5: Palette component

**Files:**
- Create: `packages/editor/src/components/TilerPalette.tsx`
- Create: `packages/editor/src/components/TilerPalette.test.tsx`

A vertical sidebar listing all registered widgets via `listWidgets()` from core. Each entry is draggable into the grid. On drop, the editor adds a new panel via `addPanel(...)`.

Gridstack supports external drag-in via the `dragIn` config option. The trick is binding the drag source to `[data-gs-widget-type="..."]` selectors and reading the type back in the `dropped` event.

- [ ] **Step 1-3: Implement + test**

```tsx
export function TilerPalette({ onAdd }: { onAdd: (widgetType: string) => void }): JSX.Element {
  const widgets = listWidgets();
  return (
    <aside className="tiler-palette">
      <h2>Widgets</h2>
      <ul>
        {widgets.map((w) => (
          <li key={w.meta.type}
              draggable
              data-gs-widget-type={w.meta.type}
              onDragEnd={(e) => {
                // Optional: detect if dropped onto the grid
                const target = document.elementFromPoint(e.clientX, e.clientY);
                if (target?.closest(".grid-stack")) onAdd(w.meta.type);
              }}>
            {w.meta.label}
          </li>
        ))}
      </ul>
    </aside>
  );
}
```

For v0.0.5 we bypass gridstack's `dragIn` and use plain HTML5 drag + a manual `addPanel` call — simpler and good-enough.

```bash
git commit -m "feat(editor): add palette sidebar with drag-to-add"
```

---

## Task 6: Drawer component (panel config editor)

**Files:**
- Create: `packages/editor/src/components/TilerDrawer.tsx`
- Create: `packages/editor/src/components/TilerDrawer.test.tsx`

Slide-over panel from the right. Renders when `editorStore.drawerPanelId` is set. Form fields:
- `title` (text input → `setPanelTitle`)
- `data_source_id` (select from `listDataSources()` results) — for v0.0.5, leave non-editable; users wire panels at create time
- `config` (JSON textarea, validated on save against the widget's `configSchema`)

Save = call `setPanelConfig` + `setPanelTitle`, then trigger `apiClient.upsertPanel(updatedPanel)`.

Cancel = close drawer without saving.

Focus trap via `react-focus-lock` (add as dep). Keyboard: Esc to close.

- [ ] **Step 1-3: Implement + test**

```bash
pnpm --filter @aguspe/tiler-editor add react-focus-lock
git commit -m "feat(editor): add slide-over drawer with JSON-textarea config editor"
```

---

## Task 7: Inline title rename + hover-delete

**Files:**
- Modify: `packages/editor/src/components/TilerWidgetTile.tsx` (a thin wrapper around `@aguspe/tiler-viewer`'s tile)

Two interactions on every tile:
1. Double-click the title → contenteditable, Enter saves, Esc cancels.
2. Hover the tile → show a small `×` in the corner, click → confirm modal → delete.

Use the editor's Zustand store for both: `setPanelTitle(id, title)` and `removePanel(id)`. Save propagates via `apiClient.upsertPanel` / `apiClient.deletePanel`.

- [ ] **Step 1-3: Implement + test**

```bash
git commit -m "feat(editor): inline title rename + hover-delete on tiles"
```

---

## Task 8: Theme token editor

**Files:**
- Create: `packages/editor/src/components/TilerThemeEditor.tsx`

Four `<input type="color">` fields bound to the dashboard's `settings.theme.{page,tile,tile_header,gutter}`. Live preview via CSS custom properties — no re-render, just `setProperty` on the dashboard root. Save persists via `apiClient.patchDashboard`.

- [ ] **Step 1-3: Implement + test + commit**

```bash
git commit -m "feat(editor): add theme-token editor (4 color inputs, live preview)"
```

---

## Task 9: TV mode toggle + Save bar

**Files:**
- Create: `packages/editor/src/components/TilerToolbar.tsx`

Top bar with:
- Dashboard name (inline-renameable)
- Save button (disabled when not dirty, calls API client to persist all changes)
- TV mode toggle (icon button)
- Undo / Redo buttons (Cmd+Z / Cmd+Shift+Z)
- "Add panel" button (toggles palette visibility on small screens)

Save logic: walk `editorStore.panels`, diff against the snapshot at last save, send PATCH for changed and POST for new and DELETE for removed. Naïve "save everything" works for v0.0.5.

- [ ] **Step 1-3: Implement + test + commit**

```bash
git commit -m "feat(editor): add toolbar with save / undo / TV mode / palette toggle"
```

---

## Task 10: `<TilerDashboardEditor>` shell

**Files:**
- Create: `packages/editor/src/components/TilerDashboardEditor.tsx`
- Create: `packages/editor/src/components/TilerDashboardEditor.test.tsx`

The top-level editor component. Composes `<TilerToolbar>` + `<TilerPalette>` + `<TilerGridstack>` + `<TilerDrawer>` + `<TilerThemeEditor>`. Owns the Zustand store and the API client.

```tsx
export function TilerDashboardEditor({
  dashboard, panels, dataSources, apiBaseUrl,
}: {
  dashboard: Dashboard;
  panels: Panel[];
  dataSources: DataSource[];
  apiBaseUrl: string;
}): JSX.Element {
  const store = useMemo(() => createEditorStore({ dashboard, panels }), [dashboard.id]);
  const api = useMemo(() => createApiClient({ baseUrl: apiBaseUrl }), [apiBaseUrl]);
  const state = useStore(store);

  return (
    <div className="tiler-dashboard-editor">
      <TilerToolbar store={store} api={api} />
      <div className="tiler-editor-body">
        <TilerPalette onAdd={(type) => store.getState().addPanel(makePanel(type))} />
        <TilerGridstack
          panels={state.panels}
          onPanelLayoutChanged={(id, layout) => store.getState().setPanelLayout(id, layout)}
        >
          {state.panels.map((p) => (
            <div key={p.id} gs-id={p.id} gs-x={p.x} gs-y={p.y} gs-w={p.width} gs-h={p.height}>
              <TilerWidgetTile panel={p} data={{ resolved: null, empty: false }} />
            </div>
          ))}
        </TilerGridstack>
      </div>
      {state.drawerPanelId && <TilerDrawer store={store} api={api} />}
      {state.tvMode && <TilerThemeEditor store={store} api={api} />}
    </div>
  );
}
```

- [ ] **Step 1-3: Implement + test + commit**

```bash
git commit -m "feat(editor): add TilerDashboardEditor top-level shell"
```

---

## Task 11: Server-side editor mount

**Files:**
- Modify: `packages/server/src/routes/viewer-pages.ts`
- Modify: `packages/server/src/server.ts`

Switch `/dashboards/:slug` from rendering the viewer to rendering the editor's SSR shell. The editor's client bundle hydrates over it.

- [ ] **Step 1: Update viewer-pages.ts to use editor's renderToHtml**

```ts
import { renderToHtml as renderEditorHtml } from "@aguspe/tiler-editor";
// ...
const html = renderEditorHtml({ dashboard, panels, dataSources, snapshot });
```

The editor exports its own `renderToHtml(input)` that takes the same shape as the viewer's plus `dataSources` (so the drawer's source dropdown works without a network round-trip).

- [ ] **Step 2: Add `@aguspe/tiler-editor` as a server dep**

```bash
pnpm --filter @aguspe/tiler-server add @aguspe/tiler-editor@workspace:*
```

- [ ] **Step 3: Restart the server-live example, verify the editor loads**

```bash
cd examples/server-live && pnpm start &
open http://localhost:4567/dashboards/test_automation
```

You should see the dashboard with a palette sidebar, gridstack edges on tiles, and the toolbar. Drag a tile, resize one, double-click a title to rename — all should persist after reload.

- [ ] **Step 4: Commit**

```bash
git commit -m "feat(server): mount editor at /dashboards/:slug (replaces read-only viewer)"
```

---

## Task 12: Visual regression tests (deferred from Phase 2)

**Files:**
- Create: `packages/widgets/test/visual.spec.ts`
- Create: `packages/editor/test/visual.spec.ts` (if applicable)

Playwright tests that take screenshots of every Storybook story and assert against committed baselines.

- [ ] **Step 1: Add `@playwright/test` to widgets devDeps + Playwright config**

```ts
// packages/widgets/playwright.config.ts
import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./test",
  webServer: {
    command: "pnpm build-storybook && pnpm dlx http-server .storybook-static -p 6006",
    url: "http://localhost:6006",
    reuseExistingServer: !process.env.CI,
  },
  use: { baseURL: "http://localhost:6006" },
  expect: { toHaveScreenshot: { maxDiffPixels: 100 } },
});
```

- [ ] **Step 2: Generate baseline screenshots**

For each widget × example fixture, render the Storybook URL `/?path=/story/widgets-{name}--{story}` and capture. Three viewports: 360×640, 768×1024, 1280×800.

- [ ] **Step 3: Commit baselines + run on CI**

```bash
git commit -m "test(widgets): add visual regression baselines via Playwright"
```

---

## Task 13: Examples + smoke run + tag

**Files:**
- Modify: `examples/server-live/README.md` (add note that the dashboard is now editable)
- Modify: `README.md` (Phase 5 status, packages table)

- [ ] **Step 1: Smoke run**

```bash
pnpm install
pnpm build
cd examples/server-live && pnpm seed && pnpm start &
sleep 2
open http://localhost:4567/dashboards/test_automation
# Drag a panel, resize, rename title, save → verify persistence on reload
```

- [ ] **Step 2: Update README**

```markdown
## Status: Phase 5 — Editor (`v0.0.5-phase-5`)

The full authoring UX. Drag panels around, resize them, drop new widgets
from the palette, edit panel config in a slide-over drawer, override the
dashboard theme, toggle TV mode, and undo/redo any of it.
```

Add `@aguspe/tiler-editor` → "✅ gridstack + drawer + palette + theme + undo".

- [ ] **Step 3: Run full pipeline + commit + tag**

```bash
pnpm install
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm size
pnpm deps
git commit -m "docs: update README for Phase 5 (editor)"
git tag -a v0.0.5-phase-5 -m "Phase 5 — gridstack editor + drawer + palette"
```

---

## Phase 5 → Phase 6 handoff

**What's working at end of Phase 5:**
- Full editor mounted at `/dashboards/:slug`. Drag/resize/drop, drawer, palette, theme tokens, TV mode, undo/redo all functional.
- Visual regression tests guard against widget rendering changes.
- `examples/server-live` is now an editable dashboard.

**What Phase 6 adds:**
- `@aguspe/tiler-cli` — the `tiler` binary. Subcommands: `tiler init`, `tiler serve`, `tiler build` (static export), `tiler import-playwright-json`, `tiler doctor`.
- `examples/json-import/` — runnable demo of subsystem C (Playwright JSON → Tiler dashboard).
- Per-widget custom drawer forms for the most common widgets (clock, metric, line_chart, status_grid).

Plan 6 will be drafted once Phase 5 is built and tagged.
