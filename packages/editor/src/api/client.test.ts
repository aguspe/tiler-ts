import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, createApiClient } from "./client";

const mockFetch = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", mockFetch);
  mockFetch.mockReset();
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe("createApiClient — upsertPanel", () => {
  it("POSTs when no id is present", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({ id: "p1", title: "X" }),
    });
    const api = createApiClient();
    await api.upsertPanel({
      dashboard_id: "d1",
      data_source_id: null,
      title: "X",
      widget_type: "clock",
      x: 0,
      y: 0,
      width: 3,
      height: 2,
      config: {},
    });
    const [url, init] = mockFetch.mock.calls[0]!;
    expect(url).toBe("/api/panels");
    expect(init.method).toBe("POST");
  });

  it("POSTs to /api/panels even when an id is supplied (server upserts)", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ id: "p1", title: "Y" }),
    });
    const api = createApiClient();
    await api.upsertPanel({
      id: "p1",
      dashboard_id: "d1",
      data_source_id: null,
      title: "Y",
      widget_type: "clock",
      x: 0,
      y: 0,
      width: 3,
      height: 2,
      config: {},
    });
    const [url, init] = mockFetch.mock.calls[0]!;
    expect(url).toBe("/api/panels");
    expect(init.method).toBe("POST");
  });

  it("attaches CSRF + basic auth headers when configured", async () => {
    mockFetch.mockResolvedValue({ ok: true, status: 200, json: async () => ({}) });
    const api = createApiClient({
      csrfToken: "csrf-xyz",
      basicAuth: { user: "admin", pass: "pw" },
    });
    await api.deletePanel("p1");
    const [, init] = mockFetch.mock.calls[0]!;
    const headers = init.headers as Record<string, string>;
    expect(headers["x-tiler-csrf"]).toBe("csrf-xyz");
    expect(headers.authorization).toMatch(/^Basic /);
  });

  it("throws ApiError on non-2xx", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ error: "unauthorized" }),
    });
    const api = createApiClient();
    await expect(api.deletePanel("p1")).rejects.toBeInstanceOf(ApiError);
  });
});
