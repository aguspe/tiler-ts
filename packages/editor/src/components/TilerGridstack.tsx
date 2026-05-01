import { GridStack } from "gridstack";
import "gridstack/dist/gridstack.min.css";
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

    const grid = GridStack.init(
      { column: 12, cellHeight: 80, margin: 6, float: true },
      gridRef.current,
    );

    grid.on("change", (_event, items) => {
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

    return () => {
      // Pass `false` so gridstack does NOT remove DOM nodes — React's
      // reconciler owns the children and will clean them up itself.
      grid.destroy(false);
    };
  }, []); // mount-once: gridstack reads gs-* attributes from child DOM nodes

  return (
    <div ref={gridRef} className="grid-stack">
      {children}
    </div>
  );
}
