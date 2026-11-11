import { zValidator } from "@hono/zod-validator";
import { type Card, CardIdSchema } from "@riftkeeper/cards";
import { historyOf, type PriceHistory } from "@riftkeeper/cards/price-history";
import { Hono } from "hono";
import { z } from "zod";
import { errorBody } from "../http/errors.ts";

const CardParamsSchema = z.object({
  id: CardIdSchema,
});

const cardParams = zValidator("param", CardParamsSchema, (result, c) => {
  if (!result.success) {
    return c.json(errorBody({ code: "invalid_request", message: z.prettifyError(result.error) }), 400);
  }
});

const cardNotFound = (id: string) => errorBody({ code: "card_not_found", message: `Card ${id} does not exist` });

export function createCardsRoutes({ cards, priceHistory }: { cards: readonly Card[]; priceHistory: PriceHistory }) {
  const cardsById = new Map(cards.map((card) => [card.id, card]));
  return new Hono()
    .get("/", (c) => c.json({ data: cards }, 200))
    .get("/:id", cardParams, (c) => {
      const { id } = c.req.valid("param");
      const card = cardsById.get(id);
      if (!card) return c.json(cardNotFound(id), 404);
      return c.json({ data: card }, 200);
    })
    .get("/:id/price-history", cardParams, (c) => {
      const { id } = c.req.valid("param");
      const card = cardsById.get(id);
      if (!card) return c.json(cardNotFound(id), 404);
      const printingIds = card.printings.map((printing) => printing.id);
      return c.json({ data: historyOf(priceHistory, printingIds) }, 200);
    });
}
