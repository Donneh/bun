import type { Card } from "@riftkeeper/cards";
import { Hono } from "hono";
import { createCardsRoutes } from "./cards/cards.routes.ts";
import { errorBody } from "./http/errors.ts";

export function createApp({ cards }: { cards: readonly Card[] }) {
  return new Hono()
    .get("/health", (c) => c.json({ data: { status: "ok", cards: cards.length } }, 200))
    .route("/cards", createCardsRoutes({ cards }))
    .notFound((c) =>
      c.json(errorBody({ code: "not_found", message: `No route for ${c.req.method} ${c.req.path}` }), 404),
    )
    .onError((error, c) => {
      console.error({ message: "Unhandled request error", method: c.req.method, path: c.req.path, error });
      return c.json(errorBody({ code: "internal_error", message: "Internal server error" }), 500);
    });
}

export type AppType = ReturnType<typeof createApp>;
