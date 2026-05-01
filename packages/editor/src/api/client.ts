import type { Dashboard, DashboardInput, Panel, PanelInput } from "@aguspe/tiler-core";

export interface TilerApiClientOptions {
  baseUrl?: string;
  csrfToken?: string;
  basicAuth?: { user: string; pass: string };
}

export interface TilerApiClient {
  upsertPanel(panel: PanelInput): Promise<Panel>;
  deletePanel(id: string): Promise<void>;
  patchDashboard(id: string, updates: Partial<DashboardInput>): Promise<Dashboard>;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: unknown,
  ) {
    super(`tiler-api: HTTP ${status}`);
  }
}

export function createApiClient(opts: TilerApiClientOptions = {}): TilerApiClient {
  const baseUrl = opts.baseUrl ?? "";

  function headers(method: string): Record<string, string> {
    const h: Record<string, string> = { "content-type": "application/json" };
    if (opts.csrfToken && method !== "GET" && method !== "HEAD") {
      h["x-tiler-csrf"] = opts.csrfToken;
    }
    if (opts.basicAuth) {
      const encoded = btoa(`${opts.basicAuth.user}:${opts.basicAuth.pass}`);
      h.authorization = `Basic ${encoded}`;
    }
    return h;
  }

  async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const res = await fetch(`${baseUrl}${path}`, {
      method,
      headers: headers(method),
      ...(body !== undefined && { body: JSON.stringify(body) }),
      credentials: "include",
    });
    if (!res.ok) {
      let payload: unknown = undefined;
      try {
        payload = await res.json();
      } catch {
        /* body may be empty */
      }
      throw new ApiError(res.status, payload);
    }
    if (res.status === 204) return undefined as unknown as T;
    return (await res.json()) as T;
  }

  return {
    upsertPanel: (panel) => {
      if (panel.id) {
        return request<Panel>("PATCH", `/api/panels/${panel.id}`, panel);
      }
      return request<Panel>("POST", "/api/panels", panel);
    },
    deletePanel: async (id) => {
      await request("DELETE", `/api/panels/${id}`);
    },
    patchDashboard: (id, updates) =>
      request<Dashboard>("PATCH", `/api/dashboards/${id}`, updates),
  };
}
