import { describe, expect, test } from "bun:test";
import { CardSchema } from "@riftkeeper/cards";
import { z } from "zod";

const baseUrl = process.env.BASE_URL;
if (!baseUrl) {
  throw new Error("BASE_URL is not set. Run these tests with `bun run test:api`.");
}

const CardListResponseSchema = z.object({ data: z.tuple([CardSchema], CardSchema) });
const CardResponseSchema = z.object({ data: CardSchema });
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

describe("unknown routes", () => {
  test("respond 404 not_found", async () => {
    const { status, body } = await get("/no-such-route");

    expect(status).toBe(404);
    expect(ErrorResponseSchema.parse(body).error.code).toBe("not_found");
  });
});
