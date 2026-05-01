import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Sign a request body with HMAC-SHA256, returning the canonical
 * `X-Tiler-Signature` header value: `sha256=<hex>`.
 */
export function signBody(secret: string, body: string): string {
  const hex = createHmac("sha256", secret).update(body).digest("hex");
  return `sha256=${hex}`;
}

/**
 * Verify an `X-Tiler-Signature` header value against a body.
 * Constant-time comparison to prevent timing attacks.
 */
export function verifyHmac(secret: string, body: string, signature: string): boolean {
  const expected = signBody(secret, body);
  if (signature.length !== expected.length) return false;
  try {
    return timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}
