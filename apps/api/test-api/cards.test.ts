import { describe, expect, test } from "bun:test";
import { PricedCardSchema } from "@riftkeeper/cards/prices";
import { z } from "zod";

const baseUrl = process.env.BASE_URL;
if (!baseUrl) {
  throw new Error("BASE_URL is not set. Run these tests with `bun run test:api`.");
}

const CardListResponseSchema = z.object({ data: z.tuple([PricedCardSchema], PricedCardSchema) });
const CardResponseSchema = z.object({ data: PricedCardSchema });
const HealthResponseSchema = z.object({
  data: z.object({
    status: z.literal("ok"),
    cards: z.number().int().positive(),
    version: z.string().min(1).nullable(),
  }),
});
const ErrorResponseSchema = z.object({ error: z.object({ code: z.string(), message: z.string().min(1) }) });

async function get(path: string) {
  const response = await fetch(new URL(path, baseUrl));
  expect(response.headers.get("content-type")).toStartWith("application/json");
  return { status: response.status, body: await response.json() };
}

async function getCardList() {
  const { status, body } = await get("/cards");
  expect(status).toBe(200);
  return CardListResponseSchema.parse(body).data;
}

describe("GET /health", () => {
  test("reports ok with the loaded snapshot", async () => {
    const { status, body } = await get("/health");

    expect(status).toBe(200);
    expect(HealthResponseSchema.parse(body).data.status).toBe("ok");
  });
});

describe("GET /cards", () => {
  test("returns the card snapshot", async () => {
    const cards = await getCardList();

    expect(new Set(cards.map((card) => card.id)).size).toBe(cards.length);
  });
});

describe("GET /cards/:id", () => {
  test("returns the same card as the list", async () => {
    const [card] = await getCardList();

    const { status, body } = await get(`/cards/${card.id}`);

    expect(status).toBe(200);
    expect(CardResponseSchema.parse(body).data).toEqual(card);
  });

  test("responds 404 card_not_found for an unknown id", async () => {
    const { status, body } = await get("/cards/no-such-card");

    expect(status).toBe(404);
    expect(ErrorResponseSchema.parse(body).error.code).toBe("card_not_found");
  });

  test("responds 400 invalid_request for a malformed id", async () => {
    const { status, body } = await get("/cards/Not_A_Slug");

    expect(status).toBe(400);
    expect(ErrorResponseSchema.parse(body).error.code).toBe("invalid_request");
  });
});

describe("printing prices", () => {
  test("come from one source, currency and date, with a normal or foil quote", async () => {
    const prices = (await getCardList()).flatMap((card) => card.printings.flatMap((printing) => printing.prices ?? []));

    expect(prices.length).toBeGreaterThan(0);
    expect(new Set(prices.map(({ currency, source, updatedAt }) => `${currency} ${source} ${updatedAt}`)).size).toBe(1);
    expect(prices.every((price) => price.normal !== undefined || price.foil !== undefined)).toBe(true);
  });

  test("of a priced card are on /cards/:id", async () => {
    const card = (await getCardList()).find((candidate) => candidate.printings.some((printing) => printing.prices));
    if (card === undefined) throw new Error("No card has a priced printing");

    const { status, body } = await get(`/cards/${card.id}`);

    expect(status).toBe(200);
    const printings = CardResponseSchema.parse(body).data.printings;
    expect(printings.map((printing) => printing.prices)).toEqual(card.printings.map((printing) => printing.prices));
    expect(printings.some((printing) => printing.prices !== null)).toBe(true);
  });
});

describe("unknown routes", () => {
  test("respond 404 not_found", async () => {
    const { status, body } = await get("/no-such-route");

    expect(status).toBe(404);
    expect(ErrorResponseSchema.parse(body).error.code).toBe("not_found");
  });
});
