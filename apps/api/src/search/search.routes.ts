import { zValidator } from "@hono/zod-validator";
import {
  type Card,
  CardTypeSchema,
  DomainSchema,
  RaritySchema,
  SupertypeSchema,
  VariantSchema,
} from "@riftkeeper/cards";
import { decompose, parseQuery, SORT_DIRECTIONS, SORT_KEYS, searchCards, setReleaseRank } from "@riftkeeper/search";
import { Hono } from "hono";
import { z } from "zod";
import { errorBody } from "../http/errors.ts";

export const MAX_QUERY_LENGTH = 512;
export const MAX_WARNINGS = 20;

const SearchParamsSchema = z.object({
  q: z.string().max(MAX_QUERY_LENGTH).default(""),
  sort: z.enum(SORT_KEYS).default("set"),
  direction: z.enum(SORT_DIRECTIONS).default("asc"),
  page: z.coerce.number().int().min(1).default(1),
});

function searchOptions(cards: readonly Card[]) {
  const sets = new Map(cards.flatMap((card) => card.printings.map((printing) => [printing.set.code, printing.set])));

  return {
    domains: DomainSchema.options,
    types: CardTypeSchema.options,
    supertypes: SupertypeSchema.options,
    rarities: RaritySchema.options,
    variants: VariantSchema.options,
    sets: [...sets.values()].toSorted((a, b) => setReleaseRank(a.code) - setReleaseRank(b.code)),
  };
}

export function createSearchRoutes({ cards }: { cards: readonly Card[] }) {
  const options = searchOptions(cards);

  return new Hono()
    .get("/options", (c) => c.json({ data: options }, 200))
    .get(
      "/",
      zValidator("query", SearchParamsSchema, (result, c) => {
        if (!result.success) {
          return c.json(errorBody({ code: "invalid_request", message: z.prettifyError(result.error) }), 400);
        }
      }),
      (c) => {
        const { q, sort, direction, page } = c.req.valid("query");
        const { root, warnings } = parseQuery(q);
        const result = searchCards(cards, { root, sort, direction, page });

        return c.json(
          {
            data: result.cards,
            meta: { page: result.page, pageSize: result.pageSize, total: result.total },
            warnings: warnings.slice(0, MAX_WARNINGS),
            parsed: decompose(q, root),
          },
          200,
        );
      },
    );
}
