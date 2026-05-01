import { randomBytes } from "node:crypto";
import type { AuthConfig } from "@aguspe/tiler-core";
import type { FastifyReply, FastifyRequest } from "fastify";

const CSRF_COOKIE = "tiler-csrf";
const CSRF_HEADER = "x-tiler-csrf";

function newToken(): string {
  return randomBytes(24).toString("hex");
}

/**
 * Returns a preHandler hook that:
 *   - Issues a `tiler-csrf` cookie on safe (GET/HEAD) requests if missing.
 *   - Rejects state-changing requests whose `X-Tiler-Csrf` header doesn't match the cookie.
 *
 * When `cfg.basic` is unset, CSRF is a no-op (auth-free server, no session to protect).
 */
export function makeCsrfHook(cfg: AuthConfig) {
  if (!cfg.basic) {
    return async (_req: FastifyRequest, _reply: FastifyReply): Promise<void> => {};
  }
  return async (req: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const isSafe = req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS";
    const cookieHeader = req.headers.cookie ?? "";
    const cookieMatch = cookieHeader.match(new RegExp(`(?:^|; )${CSRF_COOKIE}=([^;]+)`));
    const cookieToken = cookieMatch?.[1];

    if (isSafe) {
      if (!cookieToken) {
        const token = newToken();
        reply.header("Set-Cookie", `${CSRF_COOKIE}=${token}; Path=/; SameSite=Strict; HttpOnly`);
      }
      return;
    }

    const headerToken = req.headers[CSRF_HEADER];
    if (!cookieToken || cookieToken !== headerToken) {
      await reply.code(403).send({ error: "csrf token missing or mismatched" });
    }
  };
}
