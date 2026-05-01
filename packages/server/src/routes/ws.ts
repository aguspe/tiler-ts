import "@aguspe/tiler-widgets"; // register widgets so resolvers run
import type { ResolvedTilerConfig } from "@aguspe/tiler-core";
import websocketPlugin from "@fastify/websocket";
import type { FastifyPluginAsync } from "fastify";
import { RefreshManager } from "../refresh";

interface ClientMessage {
  type: "subscribe" | "unsubscribe";
  slug?: string;
}

/**
 * Plugin: registers `@fastify/websocket` and exposes a single `/ws` route.
 *
 * Wire protocol (JSON over the socket):
 *   client → { type: "subscribe", slug }
 *   server → { type: "snapshot", snapshot } (initial state)
 *   server → { type: "panel", panelId, data } (per change on each tick)
 *   client → { type: "unsubscribe", slug }
 */
export const wsPlugin: FastifyPluginAsync = async (app) => {
  await app.register(websocketPlugin);
  const cfg = (app as unknown as { tilerConfig: ResolvedTilerConfig }).tilerConfig;
  const manager = new RefreshManager({ store: cfg.store });

  app.addHook("onClose", async () => {
    manager.closeAll();
  });

  app.get("/ws", { websocket: true }, (socket, _req) => {
    const subscribed = new Map<string, (msg: unknown) => void>();

    const send = (data: unknown): void => {
      try {
        socket.send(JSON.stringify(data));
      } catch {
        /* socket may be closed; ignore */
      }
    };

    socket.on("message", (raw: Buffer) => {
      let msg: ClientMessage;
      try {
        msg = JSON.parse(raw.toString("utf8")) as ClientMessage;
      } catch {
        send({ type: "error", error: "invalid json" });
        return;
      }
      if (!msg.slug) {
        send({ type: "error", error: "slug required" });
        return;
      }

      if (msg.type === "subscribe") {
        if (subscribed.has(msg.slug)) return;
        const handler = (m: unknown): void => send(m);
        subscribed.set(msg.slug, handler);
        void manager.subscribe(msg.slug, handler);
      } else if (msg.type === "unsubscribe") {
        const handler = subscribed.get(msg.slug);
        if (handler) {
          manager.unsubscribe(msg.slug, handler);
          subscribed.delete(msg.slug);
        }
      }
    });

    socket.on("close", () => {
      for (const [slug, handler] of subscribed) {
        manager.unsubscribe(slug, handler);
      }
      subscribed.clear();
    });
  });
};
