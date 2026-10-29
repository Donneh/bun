import { zValidator } from "@hono/zod-validator";
import { type Card, CardIdSchema } from "@riftkeeper/cards";
import { Hono } from "hono";
import { z } from "zod";
import { errorBody } from "../http/errors.ts";

const CardParamsSchema = z.object({
  id: CardIdSchema,
});

export function createCardsRoutes({ cards }: { cards: readonly Card[] }) {
  const cardsById = new Map(cards.map((card) => [card.id, card]));
  return new Hono()
    .get("/", (c) => c.json({ data: cards }, 200))
    .get(
      "/:id",
      zValidator("param", CardParamsSchema, (result, c) => {
        if (!result.success) {
          return c.json(errorBody({ code: "invalid_request", message: z.prettifyError(result.error) }), 400);
        }
      }),
      (c) => {
        const { id } = c.req.valid("param");
        const card = cardsById.get(id);

        if (!card) {
          return c.json(errorBody({ code: "card_not_found", message: `Card ${id} does not exist` }), 404);
        }

        return c.json({ data: card }, 200);
      },
    );
}
