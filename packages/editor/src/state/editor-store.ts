import type { Dashboard, Panel } from "@aguspe/tiler-core";
import { createStore, type StoreApi } from "zustand/vanilla";

const UNDO_CAP = 50;

export interface EditorState {
  dashboard: Dashboard;
  panels: Panel[];
  dirty: boolean;
  drawerPanelId: string | null;
  undoStack: Array<{ dashboard: Dashboard; panels: Panel[] }>;
  redoStack: Array<{ dashboard: Dashboard; panels: Panel[] }>;

  setPanelLayout(
    id: string,
    layout: { x: number; y: number; width: number; height: number },
  ): void;
  setPanelConfig(id: string, config: Record<string, unknown>): void;
  setPanelTitle(id: string, title: string): void;
  addPanel(panel: Panel): void;
  removePanel(id: string): void;
  setDashboardName(name: string): void;
  setThemeToken(
    key: "page" | "tile" | "tile_header" | "gutter",
    value: string | undefined,
  ): void;
  toggleTvMode(): void;
  openDrawer(panelId: string): void;
  closeDrawer(): void;
  undo(): void;
  redo(): void;
  markClean(): void;
}

export interface EditorStoreInit {
  dashboard: Dashboard;
  panels: Panel[];
}

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function pushHistory(state: EditorState): {
  undoStack: EditorState["undoStack"];
  redoStack: EditorState["redoStack"];
} {
  const snapshot = {
    dashboard: deepClone(state.dashboard),
    panels: deepClone(state.panels),
  };
  const nextUndo = [...state.undoStack, snapshot].slice(-UNDO_CAP);
  return { undoStack: nextUndo, redoStack: [] };
}

export function createEditorStore(init: EditorStoreInit): StoreApi<EditorState> {
  return createStore<EditorState>((set, get) => ({
    dashboard: init.dashboard,
    panels: init.panels,
    dirty: false,
    drawerPanelId: null,
    undoStack: [],
    redoStack: [],

    setPanelLayout: (id, layout) => {
      const state = get();
      const panel = state.panels.find((p) => p.id === id);
      if (
        !panel ||
        (panel.x === layout.x &&
          panel.y === layout.y &&
          panel.width === layout.width &&
          panel.height === layout.height)
      ) {
        return;
      }
      const history = pushHistory(state);
      const now = new Date().toISOString();
      set({
        ...history,
        panels: state.panels.map((p) => (p.id === id ? { ...p, ...layout, updated_at: now } : p)),
        dirty: true,
      });
    },

    setPanelConfig: (id, config) => {
      const state = get();
      const history = pushHistory(state);
      const now = new Date().toISOString();
      set({
        ...history,
        panels: state.panels.map((p) => (p.id === id ? { ...p, config, updated_at: now } : p)),
        dirty: true,
      });
    },

    setPanelTitle: (id, title) => {
      const state = get();
      const panel = state.panels.find((p) => p.id === id);
      if (!panel || panel.title === title) return;
      const history = pushHistory(state);
      const now = new Date().toISOString();
      set({
        ...history,
        panels: state.panels.map((p) => (p.id === id ? { ...p, title, updated_at: now } : p)),
        dirty: true,
      });
    },

    addPanel: (panel) => {
      const state = get();
      const history = pushHistory(state);
      set({
        ...history,
        panels: [...state.panels, panel],
        dirty: true,
      });
    },

    removePanel: (id) => {
      const state = get();
      if (!state.panels.some((p) => p.id === id)) return;
      const history = pushHistory(state);
      set({
        ...history,
        panels: state.panels.filter((p) => p.id !== id),
        dirty: true,
      });
    },

    setDashboardName: (name) => {
      const state = get();
      if (state.dashboard.name === name) return;
      const history = pushHistory(state);
      set({
        ...history,
        dashboard: { ...state.dashboard, name, updated_at: new Date().toISOString() },
        dirty: true,
      });
    },

    setThemeToken: (key, value) => {
      const state = get();
      const history = pushHistory(state);
      const theme = { ...(state.dashboard.settings.theme ?? {}) };
      if (value === undefined) {
        delete theme[key];
      } else {
        theme[key] = value;
      }
      set({
        ...history,
        dashboard: {
          ...state.dashboard,
          settings: { ...state.dashboard.settings, theme },
          updated_at: new Date().toISOString(),
        },
        dirty: true,
      });
    },

    toggleTvMode: () => {
      const state = get();
      const history = pushHistory(state);
      set({
        ...history,
        dashboard: {
          ...state.dashboard,
          settings: { ...state.dashboard.settings, tv_mode: !state.dashboard.settings.tv_mode },
          updated_at: new Date().toISOString(),
        },
        dirty: true,
      });
    },

    openDrawer: (panelId) => set({ drawerPanelId: panelId }),
    closeDrawer: () => set({ drawerPanelId: null }),

    undo: () => {
      const state = get();
      const last = state.undoStack[state.undoStack.length - 1];
      if (!last) return;
      const currentSnapshot = {
        dashboard: deepClone(state.dashboard),
        panels: deepClone(state.panels),
      };
      set({
        dashboard: last.dashboard,
        panels: last.panels,
        undoStack: state.undoStack.slice(0, -1),
        redoStack: [...state.redoStack, currentSnapshot].slice(-UNDO_CAP),
        dirty: true,
      });
    },

    redo: () => {
      const state = get();
      const next = state.redoStack[state.redoStack.length - 1];
      if (!next) return;
      const currentSnapshot = {
        dashboard: deepClone(state.dashboard),
        panels: deepClone(state.panels),
      };
      set({
        dashboard: next.dashboard,
        panels: next.panels,
        undoStack: [...state.undoStack, currentSnapshot].slice(-UNDO_CAP),
        redoStack: state.redoStack.slice(0, -1),
        dirty: true,
      });
    },

    markClean: () => set({ dirty: false }),
  }));
}
