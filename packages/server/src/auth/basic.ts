import type { AuthConfig } from "@aguspe/tiler-core";
import type { FastifyReply, FastifyRequest } from "fastify";

/**
 * Build a preHandler hook that enforces HTTP Basic auth when `cfg.basic` is set.
 * If `cfg.basic` is unset, the hook is a no-op (server runs unauthenticated).
 */
export function makeBasicAuthHook(cfg: AuthConfig) {
  if (!cfg.basic) {
    return async (_req: FastifyRequest, _reply: FastifyReply): Promise<void> => {};
  }
  const expected = `Basic ${Buffer.from(`${cfg.basic.user}:${cfg.basic.pass}`).toString("base64")}`;
  return async (req: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const header = req.headers.authorization;
    if (header !== expected) {
      await reply.code(401).header("WWW-Authenticate", "Basic realm=tiler").send({
        error: "unauthorized",
      });
    }
  };
}
