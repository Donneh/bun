import { afterEach, describe, expect, spyOn, test } from "bun:test";
import { withPrices } from "@riftkeeper/cards/prices";
import { makeCard, makePriceHistory, makePriceSnapshot, makePrinting } from "@riftkeeper/cards/testing";
import { createApp } from "../app.ts";
import { MAX_QUERY_LENGTH, MAX_WARNINGS } from "../search/search.routes.ts";

const cards = Array.from({ length: 81 }, (_, index) =>
  makeCard({ id: `card-${index}`, name: `Card ${index}`, domains: index === 80 ? ["calm"] : ["fury"] }),
);
const prices = makePriceSnapshot();
const app = createApp({ cards, prices, priceHistory: makePriceHistory() });
let random: ReturnType<typeof spyOn<typeof Math, "random">> | undefined;
afterEach(() => random?.mockRestore());

describe("GET /cards/random", () => {
  test.each([
    [0, 0],
    [0.5, 40],
    [0.999999, 80],
  ])("selects across the whole card snapshot at random value %s", async (value, index) => {
    random = spyOn(Math, "random").mockReturnValue(value);
    const response = await app.request("/cards/random");

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({ data: withPrices(cards, prices)[index], warnings: [] });
  });

  test("uses the full query language to select a matching card beyond the first search page", async () => {
    const response = await app.request(
      `/cards/random?${new URLSearchParams({ q: "(c:calm or cost:>10) -type:spell" })}`,
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ data: { id: "card-80" } });
  });

  test("weights cards equally, not their printings, and returns the full card", async () => {
    const many = makeCard({ id: "many", printings: Array.from({ length: 5 }, () => makePrinting()) });
    const one = makeCard({ id: "one" });
    const weighted = createApp({ cards: [many, one], prices, priceHistory: makePriceHistory() });
    random = spyOn(Math, "random").mockReturnValue(0.5);
    expect(await (await weighted.request("/cards/random")).json()).toMatchObject({ data: { id: "one" } });

    const printings = [makePrinting({ rarity: "common" }), makePrinting({ rarity: "epic" })];
    const full = createApp({ cards: [makeCard({ printings })], prices, priceHistory: makePriceHistory() });
    const response = await full.request("/cards/random?q=r:epic");
    expect(await response.json()).toMatchObject({
      data: { printings: printings.map((p) => ({ ...p, prices: null })) },
    });
    expect(await (await full.request("/cards/random?q=r:epic%20r:common")).json()).toEqual({
      data: null,
      warnings: [],
    });
  });

  test.each([{ snapshot: cards }, { snapshot: [] }])("answers no card when nothing matches", async ({ snapshot }) => {
    const empty = createApp({ cards: snapshot, prices, priceHistory: makePriceHistory() });
    const response = await empty.request("/cards/random?q=cost:>999");

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ data: null, warnings: [] });
  });

  test("reports ignored query terms with the same warning limit as search", async () => {
    const response = await app.request(`/cards/random?${new URLSearchParams({ q: "x:1 ".repeat(30) })}`);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      warnings: Array.from({ length: MAX_WARNINGS }, () => expect.anything()),
    });
  });

  test("rejects an overlong query", async () => {
    const response = await app.request(`/cards/random?q=${"a".repeat(MAX_QUERY_LENGTH + 1)}`);
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: { code: "invalid_request" } });
  });
});
