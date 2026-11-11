import { describe, expect, test } from "bun:test";
import { withPrices } from "@riftkeeper/cards/prices";
import { makeCard, makePriceHistory, makePriceSnapshot } from "@riftkeeper/cards/testing";
import { createApp } from "../app.ts";

const unpricedCards = [
  makeCard({ id: "abandon", name: "Abandon" }),
  makeCard({ id: "jinx-loose-cannon", name: "Jinx", subtitle: "Loose Cannon" }),
];
const prices = makePriceSnapshot();
const priceHistory = makePriceHistory({
  dates: ["2026-10-30", "2026-10-31"],
  printings: {
    "abandon-p1": { normal: [0.1, null], foil: [1, 1.2] },
    "jinx-loose-cannon-p1": { foil: [3, 2.5] },
    "gone-p1": { normal: [5, 5] },
  },
});
const app = createApp({ cards: unpricedCards, prices, priceHistory });
const cards = withPrices(unpricedCards, prices);

describe("GET /cards", () => {
  test("returns every card", async () => {
    const response = await app.request("/cards");

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ data: cards });
  });
});

describe("GET /cards/:id", () => {
  test("returns the card with that id", async () => {
    const response = await app.request("/cards/abandon");

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ data: cards.find((card) => card.id === "abandon") });
  });

  test("responds 404 when no card has that id", async () => {
    const response = await app.request("/cards/does-not-exist");

    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({ error: { code: "card_not_found" } });
  });

  test.each(["Abandon", "abandon_", "-abandon", "aban--don"])("responds 400 for id %p", async (id) => {
    const response = await app.request(`/cards/${id}`);

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: { code: "invalid_request" } });
  });
});

describe("GET /cards/:id/price-history", () => {
  test("returns the daily market prices of the card's printings, with null for a day without one", async () => {
    const response = await app.request("/cards/abandon/price-history");

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      data: {
        currency: "USD",
        source: "TCGplayer via TCGCSV",
        dates: ["2026-10-30", "2026-10-31"],
        printings: { "abandon-p1": { normal: [0.1, null], foil: [1, 1.2] } },
      },
    });
  });

  test("responds 404 when no card has that id", async () => {
    const response = await app.request("/cards/gone/price-history");

    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({ error: { code: "card_not_found" } });
  });

  test("responds 400 for a malformed id", async () => {
    const response = await app.request("/cards/Abandon/price-history");

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: { code: "invalid_request" } });
  });
});

describe("unknown routes", () => {
  test("respond 404 with an error body", async () => {
    const response = await app.request("/nope");

    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({ error: { code: "not_found" } });
  });
});
