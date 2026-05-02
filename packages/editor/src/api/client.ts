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

  function headers(method: string, hasBody: boolean): Record<string, string> {
    const h: Record<string, string> = {};
    // Only declare a JSON content-type when we actually send a body —
    // Fastify's default body parser otherwise tries (and fails) to parse
    // a zero-length stream as JSON and returns 400 on bodyless requests
    // like DELETE.
    if (hasBody) h["content-type"] = "application/json";
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
    const hasBody = body !== undefined;
    const res = await fetch(`${baseUrl}${path}`, {
      method,
      headers: headers(method, hasBody),
      ...(hasBody && { body: JSON.stringify(body) }),
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
      // Always POST — the server's panel handler is an upsert. Going via
      // PATCH would 404 for client-generated ids that the server hasn't
      // seen yet (e.g. a panel just dropped from the palette and being
      // auto-saved before the round-trip completes).
      return request<Panel>("POST", "/api/panels", panel);
    },
    deletePanel: async (id) => {
      await request("DELETE", `/api/panels/${id}`);
    },
    patchDashboard: (id, updates) => request<Dashboard>("PATCH", `/api/dashboards/${id}`, updates),
  };
}
