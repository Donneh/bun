import { describe, expect, test } from "bun:test";
import { type Card, CardIdSchema, PrintingIdSchema } from "@riftkeeper/cards";
import { withPrices } from "@riftkeeper/cards/prices";
import { makeCard, makePriceSnapshot, makePrinting } from "@riftkeeper/cards/testing";
import { createApp } from "../app.ts";
import { MAX_QUERY_LENGTH, MAX_WARNINGS } from "./search.routes.ts";

const annie = makeCard({
  id: CardIdSchema.parse("annie-fiery"),
  name: "Annie",
  subtitle: "Fiery",
  energyCost: 5,
  domains: ["fury"],
  printings: [
    makePrinting({ id: PrintingIdSchema.parse("ogn-001"), set: { code: "OGN", name: "Origins" }, collectorNumber: 1 }),
  ],
});
const ashe = makeCard({
  id: CardIdSchema.parse("ashe-frost"),
  name: "Ashe",
  subtitle: "Frost",
  energyCost: 3,
  domains: ["calm"],
  printings: [
    makePrinting({
      id: PrintingIdSchema.parse("ogs-002"),
      set: { code: "OGS", name: "Proving Grounds" },
      collectorNumber: 2,
    }),
  ],
});
const prices = makePriceSnapshot();
const app = createApp({ cards: [annie, ashe], prices });

interface SearchBody {
  readonly data: readonly Card[];
  readonly meta: unknown;
  readonly warnings: readonly unknown[];
  readonly parsed: unknown;
}

async function search(params: Record<string, string>) {
  const response = await app.request(`/search?${new URLSearchParams(params)}`);
  return { status: response.status, body: (await response.json()) as SearchBody };
}

describe("GET /search", () => {
  test("returns the cards that match the query with page metadata", async () => {
    const { status, body } = await search({ q: "annie" });

    expect(status).toBe(200);
    expect(body.data).toEqual(withPrices([annie], prices));
    expect(body.meta).toEqual({ page: 1, pageSize: 40, total: 1 });
    expect(body.warnings).toEqual([]);
  });

  test("returns every card in set release order without a query", async () => {
    const { body } = await search({});

    expect(body.data.map((card) => card.id)).toEqual([ashe.id, annie.id]);
  });

  test("applies filters and reports them as editable chips", async () => {
    const { body } = await search({ q: "cost:>=4" });

    expect(body.data).toEqual(withPrices([annie], prices));
    expect(body.parsed).toMatchObject({
      query: "cost:>=4",
      hasAdvancedConditions: false,
      filters: [{ field: "cost", value: { kind: "numeric", operator: ">=", value: 4 }, editable: true }],
    });
  });

  test("sorts by the requested key and direction", async () => {
    const { body } = await search({ sort: "cost", direction: "desc" });

    expect(body.data.map((card) => card.id)).toEqual([annie.id, ashe.id]);
  });

  test("returns warnings with their position for parts of the query it ignored", async () => {
    const { status, body } = await search({ q: "flavor:calm annie" });

    expect(status).toBe(200);
    expect(body.data).toEqual(withPrices([annie], prices));
    expect(body.warnings).toEqual([
      { message: '"flavor" is not supported yet and was ignored.', span: { start: 0, end: 11 } },
    ]);
  });

  test(`returns at most ${MAX_WARNINGS} warnings`, async () => {
    const { body } = await search({ q: "x:1 ".repeat(30) });

    expect(body.warnings).toHaveLength(MAX_WARNINGS);
  });

  test.each([
    ["sort", { sort: "price" }],
    ["direction", { direction: "sideways" }],
    ["page", { page: "0" }],
    ["q", { q: "a".repeat(MAX_QUERY_LENGTH + 1) }],
  ])("responds 400 invalid_request for an invalid %s", async (_name, params) => {
    const { status, body } = await search(params);

    expect(status).toBe(400);
    expect(body).toMatchObject({ error: { code: "invalid_request" } });
  });
});

describe("GET /search/options", () => {
  test("lists filter values and the sets in release order", async () => {
    const response = await app.request("/search/options");

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      data: {
        domains: ["fury", "calm", "mind", "body", "chaos", "order", "colorless"],
        rarities: ["common", "uncommon", "rare", "epic", "showcase"],
        sets: [
          { code: "OGS", name: "Proving Grounds" },
          { code: "OGN", name: "Origins" },
        ],
      },
    });
  });
});
