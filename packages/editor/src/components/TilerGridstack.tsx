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
import { useEffect, useRef, type ReactNode } from "react";
import type { Panel } from "@aguspe/tiler-core";

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
  /**
   * The current panel list. Passed in for symmetry with the parent component
   * (TilerDashboardEditor renders children with gs-* attributes derived from
   * this array), but not consumed directly inside this wrapper — gridstack
   * reads layout from the DOM attributes on the child elements.
   */
  panels: Panel[];
  onPanelLayoutChanged: (
    id: string,
    layout: { x: number; y: number; width: number; height: number },
  ) => void;
  children: ReactNode;
}

export function TilerGridstack({
  panels: _panels, // eslint-disable-line @typescript-eslint/no-unused-vars
  onPanelLayoutChanged,
  children,
}: TilerGridstackProps): JSX.Element {
  const gridRef = useRef<HTMLDivElement>(null);

  // Keep a stable ref to the latest callback so the gridstack listener never
  // closes over a stale version without needing to be re-registered.
  const onChangeRef = useRef(onPanelLayoutChanged);
  useEffect(() => {
    onChangeRef.current = onPanelLayoutChanged;
  }, [onPanelLayoutChanged]);

  useEffect(() => {
    if (!gridRef.current) return;

    let grid: { destroy: (removeDOM: boolean) => void } | undefined;
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
          // ledger-paper feel. The grid's own background bleeds through
          // for the missing left/top borders, giving each row/column its
          // single dividing line.
          margin: 0,
          float: true,
          // Only the panel header is the drag handle. The body remains
          // free for clicks (e.g. interactive widgets).
          handle: ".tiler-panel-header",
        },
        gridRef.current,
      );
      grid = g;
      g.on("change", (_event, items) => {
        for (const item of items) {
          // item.id is string | undefined per GridStackWidget; skip items without id.
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
      grid?.destroy(false);
    };
  }, []); // mount-once: gridstack reads gs-* attributes from child DOM nodes

  return (
    <div ref={gridRef} className="grid-stack">
      {children}
    </div>
  );
}
