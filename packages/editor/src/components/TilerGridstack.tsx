// Note: gridstack is loaded lazily inside `useEffect` so the module never
// evaluates during SSR. Two reasons:
//   1. The package only ships CJS (`main: dist/gridstack.js`, no `exports`
//      map / no ESM build), and Node's ESM loader can't synthesize the
//      `GridStack` named export — `import { GridStack } from "gridstack"`
//      throws `does not provide an export named 'GridStack'` under tsx.
//   2. The library touches `document` at module load, which is undefined
//      in Node anyway.
// The matching stylesheet is imported by `src/client/main.tsx` for the same
// reason (Node can't load `.css` during SSR).
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { Panel } from "@aguspe/tiler-core";
import type { PaletteDragMeta } from "./TilerPalette";

const GRID_COLUMNS = 12;
const GRID_CELL_HEIGHT = 90;

// Augment React's HTML attribute types so JSX accepts `gs-*` attributes that
// gridstack reads directly from the DOM (e.g. gs-id, gs-x, gs-y, gs-w, gs-h).
declare module "react" {
  interface HTMLAttributes<T> {
    "gs-id"?: string;
    "gs-x"?: number | string;
    "gs-y"?: number | string;
    "gs-w"?: number | string;
    "gs-h"?: number | string;
    "gs-min-w"?: number | string;
    "gs-min-h"?: number | string;
    "gs-max-w"?: number | string;
    "gs-max-h"?: number | string;
    "gs-no-resize"?: boolean | string;
    "gs-no-move"?: boolean | string;
    "gs-locked"?: boolean | string;
  }
}

export interface TilerGridstackProps {
  /** The current panel list — drives reconciliation of widgets-with-gridstack. */
  panels: Panel[];
  onPanelLayoutChanged: (
    id: string,
    layout: { x: number; y: number; width: number; height: number },
  ) => void;
  /**
   * Set while a palette item is being dragged. Drives the drop ghost
   * outline that snaps to the cell under the cursor. `null` hides it.
   */
  paletteDrag: PaletteDragMeta | null;
  children: ReactNode;
}

interface GridLike {
  destroy: (removeDOM: boolean) => void;
  makeWidget: (el: HTMLElement) => unknown;
  removeWidget: (el: HTMLElement, removeDOM?: boolean, triggerEvent?: boolean) => unknown;
  on: (event: string, cb: (event: unknown, items: GridStackWidgetLike[]) => void) => void;
}

interface GridStackWidgetLike {
  id?: string;
  x?: number;
  y?: number;
  w?: number;
  h?: number;
}

interface GhostBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function TilerGridstack({
  panels,
  onPanelLayoutChanged,
  paletteDrag,
  children,
}: TilerGridstackProps): JSX.Element {
  const gridRef = useRef<HTMLDivElement>(null);
  const gridApiRef = useRef<GridLike | undefined>(undefined);
  // Map id → DOM element so we can still tell gridstack about a node
  // after React has already detached its DOM. Without this cached
  // reference, deleting a panel would leave gridstack tracking a phantom
  // node and break resizing on the surviving panels.
  const registeredRef = useRef<Map<string, HTMLElement>>(new Map());
  const [ghost, setGhost] = useState<GhostBox | null>(null);

  // Keep a stable ref to the latest callback so the gridstack listener never
  // closes over a stale version without needing to be re-registered.
  const onChangeRef = useRef(onPanelLayoutChanged);
  useEffect(() => {
    onChangeRef.current = onPanelLayoutChanged;
  }, [onPanelLayoutChanged]);

  // Mount-once: bring gridstack up over whatever children React rendered.
  useEffect(() => {
    if (!gridRef.current) return;

    let cancelled = false;

    void import("gridstack").then((mod) => {
      if (cancelled || !gridRef.current) return;
      const GridStack = mod.GridStack;
      const g = GridStack.init(
        {
          column: 12,
          cellHeight: 90,
          // Zero margin between tiles — the panels' right+bottom hairline
          // borders form the grid lines, matching the Rails editor's
          // ledger-paper feel.
          margin: 0,
          float: true,
          // The whole tile body is the drag handle (Rails parity).
          // Clicks that don't move propagate up to the panel header's own
          // onClick, which opens the config drawer.
          handle: ".grid-stack-item-content",
          // Resize from any corner or any edge. Gridstack defaults to
          // 'se' only, which the user can't discover.
          resizable: { handles: "n,e,s,w,ne,se,sw,nw" },
        },
        gridRef.current,
      ) as unknown as GridLike;
      gridApiRef.current = g;

      // Seed the cache with whatever children gridstack just discovered
      // on init — those are the SSR-rendered panels.
      for (const el of gridRef.current.querySelectorAll<HTMLElement>(
        ".grid-stack-item",
      )) {
        const id = el.getAttribute("gs-id");
        if (id) registeredRef.current.set(id, el);
      }

      g.on("change", (_event, items) => {
        for (const item of items) {
          if (typeof item.id !== "string") continue;
          onChangeRef.current(item.id, {
            x: item.x ?? 0,
            y: item.y ?? 0,
            width: item.w ?? 1,
            height: item.h ?? 1,
          });
        }
      });
    });

    return () => {
      cancelled = true;
      // Pass `false` so gridstack does NOT remove DOM nodes — React's
      // reconciler owns the children and will clean them up itself.
      gridApiRef.current?.destroy(false);
      gridApiRef.current = undefined;
      registeredRef.current.clear();
    };
  }, []);

  // Drop ghost — track the cell under the cursor while the user drags a
  // palette item. The dragenter/dragover handlers must call
  // `event.preventDefault()` for the drop event to fire (HTML5 contract).
  useEffect(() => {
    const root = gridRef.current;
    if (!root) return;
    if (!paletteDrag) {
      setGhost(null);
      return;
    }

    function updateFromEvent(e: DragEvent): void {
      if (!root || !paletteDrag) return;
      e.preventDefault();
      const rect = root.getBoundingClientRect();
      const colWidth = rect.width / GRID_COLUMNS;
      const rawX = Math.floor((e.clientX - rect.left) / colWidth);
      const rawY = Math.floor((e.clientY - rect.top) / GRID_CELL_HEIGHT);
      const x = Math.max(0, Math.min(rawX, GRID_COLUMNS - paletteDrag.w));
      const y = Math.max(0, rawY);
      setGhost({ x, y, w: paletteDrag.w, h: paletteDrag.h });
    }

    function clear(): void {
      setGhost(null);
    }

    root.addEventListener("dragenter", updateFromEvent);
    root.addEventListener("dragover", updateFromEvent);
    root.addEventListener("dragleave", (e) => {
      // Only clear if the cursor actually left the grid (not a child).
      if (e.target === root) clear();
    });
    root.addEventListener("drop", clear);
    return () => {
      root.removeEventListener("dragenter", updateFromEvent);
      root.removeEventListener("dragover", updateFromEvent);
      root.removeEventListener("dragleave", clear);
      root.removeEventListener("drop", clear);
    };
  }, [paletteDrag]);

  // Reconcile gridstack with the current panels list. When React mounts a
  // new `.grid-stack-item` (palette drop, undo/redo replay, etc.) gridstack
  // doesn't know about it until we call `makeWidget(el)`. Conversely, when
  // React unmounts a panel we tell gridstack so it stops tracking the node
  // — using a cached DOM reference because the live DOM node is already
  // gone by the time this effect runs.
  useEffect(() => {
    const grid = gridApiRef.current;
    const root = gridRef.current;
    if (!grid || !root) return;

    const currentIds = new Set(panels.map((p) => p.id));

    // Register newly mounted children.
    for (const el of root.querySelectorAll<HTMLElement>(".grid-stack-item")) {
      const id = el.getAttribute("gs-id");
      if (!id) continue;
      if (!registeredRef.current.has(id)) {
        grid.makeWidget(el);
        registeredRef.current.set(id, el);
      }
    }

    // Drop tracking for panels React already unmounted. We use the
    // cached element reference (still valid even after detach) so the
    // engine cleanly drops its node — without this, a stale node breaks
    // collision-detection on resize for the surviving panels.
    for (const [id, el] of registeredRef.current) {
      if (currentIds.has(id)) continue;
      grid.removeWidget(el, false, false);
      registeredRef.current.delete(id);
    }
  }, [panels]);

  // Compute pixel position for the drop ghost from grid measurements.
  // We read width at render time via gridRef.current.clientWidth to get
  // accurate per-column width regardless of the page's flex layout.
  const ghostStyle = ghost
    ? (() => {
        const root = gridRef.current;
        const colWidth = root ? root.clientWidth / GRID_COLUMNS : 0;
        return {
          left: `${ghost.x * colWidth}px`,
          top: `${ghost.y * GRID_CELL_HEIGHT}px`,
          width: `${ghost.w * colWidth}px`,
          height: `${ghost.h * GRID_CELL_HEIGHT}px`,
        };
      })()
    : null;

  return (
    <div ref={gridRef} className="grid-stack">
      {children}
      {ghost && ghostStyle && paletteDrag && (
        <div className="tiler-drop-ghost" style={ghostStyle} aria-hidden="true">
          + {paletteDrag.label}
        </div>
      )}
    </div>
  );
}
