import type { TilerStore } from "./store";

export interface AuthConfig {
  /** HTTP Basic credentials for the read-write UI. Both required if either is present. */
  basic?: { user: string; pass: string };
  /** Default HMAC secret for `/ingest/*` routes. Per-source tokens override. */
  webhookSecret?: string;
  /** Pluggable callback overriding built-in auth. Called per request. */
  authorize?: (req: unknown) => Promise<{ canView: boolean; canManage: boolean }>;
  /** Maximum allowed clock skew on webhook `recorded_at` fields, in milliseconds. */
  recordedAtSkewMs?: number;
}

export interface TilerConfig {
  /** TilerStore implementation. Required. */
  store: TilerStore;
  /** Port to bind. Default 4567. */
  port?: number;
  /** Bind address. Default "127.0.0.1" (localhost-only). */
  host?: string;
  /** Auth configuration. */
  auth?: AuthConfig;
  /** Widget packages to register at boot, in order. */
  widgets?: string[];
  /** Presets to seed on first boot if their slug doesn't exist yet. */
  presets?: string[];
  /** Path to @aguspe/tiler-viewer's dist/client. Auto-resolved from node_modules if omitted. */
  viewerClientDir?: string;
}

export interface ResolvedTilerConfig {
  store: TilerStore;
  port: number;
  host: string;
  auth: AuthConfig;
  widgets: string[];
  presets: string[];
  viewerClientDir?: string;
}

export function defineConfig(input: TilerConfig): ResolvedTilerConfig {
  const resolved: ResolvedTilerConfig = {
    store: input.store,
    port: input.port ?? 4567,
    host: input.host ?? "127.0.0.1",
    auth: input.auth ?? {},
    widgets: input.widgets ?? [],
    presets: input.presets ?? [],
  };
  if (input.viewerClientDir !== undefined) {
    resolved.viewerClientDir = input.viewerClientDir;
  }
  return resolved;
}
