import { z } from "zod";

const SAFE_URL = z
  .string()
  .refine((v) => v.startsWith("https://") || v.startsWith("/") || v.startsWith("./"), {
    message: "URL must be https or a relative path",
  });

export const SANDBOX_ALLOWLIST = [
  "allow-forms",
  "allow-popups",
  "allow-popups-to-escape-sandbox",
  "allow-same-origin",
  "allow-scripts",
] as const;
export type SandboxToken = (typeof SANDBOX_ALLOWLIST)[number];

const SandboxArray = z
  .array(z.enum(SANDBOX_ALLOWLIST))
  .default([])
  .transform((tokens) => Array.from(new Set([...tokens, "allow-scripts"] as SandboxToken[])));

export const IframeConfig = z.object({
  url: SAFE_URL,
  sandbox: SandboxArray,
  allow: z.array(z.string()).default([]),
});
export type IframeConfig = z.infer<typeof IframeConfig>;
