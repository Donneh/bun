import { zValidator } from "@hono/zod-validator";
import type { Card } from "@riftkeeper/cards";
import { matchesNode, parseQuery } from "@riftkeeper/search";
import { Hono } from "hono";
import { z } from "zod";
import { errorBody } from "../http/errors.ts";
import { MAX_QUERY_LENGTH, MAX_WARNINGS } from "../search/search.routes.ts";

const RandomParamsSchema = z.object({ q: z.string().max(MAX_QUERY_LENGTH).default("") });

export function createRandomRoutes({ cards }: { cards: readonly Card[] }) {
  return new Hono().get(
    "/",
    zValidator("query", RandomParamsSchema, (result, c) => {
      if (!result.success) {
        return c.json(errorBody({ code: "invalid_request", message: z.prettifyError(result.error) }), 400);
      }
    }),
    (c) => {
      c.header("Cache-Control", "no-store");
      const { root, warnings } = parseQuery(c.req.valid("query").q);
      const matches =
        root === null
          ? cards
          : cards.filter((card) => card.printings.some((printing) => matchesNode(root, card, printing)));
      const card = matches[Math.floor(Math.random() * matches.length)];
      if (!card) {
        return c.json(errorBody({ code: "card_not_found", message: "No cards match this query." }), 404);
      }
      return c.json({ data: card, warnings: warnings.slice(0, MAX_WARNINGS) }, 200);
    },
  );
}
