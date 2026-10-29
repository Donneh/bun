import { describe, expect, test } from "bun:test";
import { type Card, CardSchema } from "@riftkeeper/cards";
import { z } from "zod";

const baseUrl = process.env.BASE_URL;
if (!baseUrl) {
  throw new Error("BASE_URL is not set. Run these tests with `bun run test:api`.");
}

const SearchResponseSchema = z.object({
  data: z.array(CardSchema),
  meta: z.object({ page: z.int().positive(), pageSize: z.int().positive(), total: z.int().nonnegative() }),
  warnings: z.array(z.object({ message: z.string().min(1), span: z.object({ start: z.int(), end: z.int() }) })),
  parsed: z.object({ query: z.string(), filters: z.array(z.unknown()), hasAdvancedConditions: z.boolean() }),
});
const CardListResponseSchema = z.object({ data: z.array(CardSchema) });
const OptionsResponseSchema = z.object({
  data: z.object({ sets: z.array(z.object({ code: z.string(), name: z.string() })) }),
});

async function get(path: string, params: Record<string, string> = {}) {
  const url = new URL(path, baseUrl);
  url.search = new URLSearchParams(params).toString();
  const response = await fetch(url);
  expect(response.headers.get("content-type")).toStartWith("application/json");
  return { status: response.status, body: await response.json() };
}

async function search(params: Record<string, string>) {
  const { status, body } = await get("/search", params);
  expect(status).toBe(200);
  return SearchResponseSchema.parse(body);
}

async function allCards(): Promise<Card[]> {
  return CardListResponseSchema.parse((await get("/cards")).body).data;
}

describe("GET /search", () => {
  test("an empty query matches every card", async () => {
    const [result, cards] = await Promise.all([search({}), allCards()]);

    expect(result.meta.total).toBe(cards.length);
    expect(result.data).toHaveLength(Math.min(result.meta.pageSize, cards.length));
  });

  test("a domain filter returns exactly the cards with that domain", async () => {
    const [result, cards] = await Promise.all([search({ q: "c:fury" }), allCards()]);

    expect(result.meta.total).toBe(cards.filter((card) => card.domains.includes("fury")).length);
    expect(result.data.every((card) => card.domains.includes("fury"))).toBe(true);
  });

  test("a printing filter keeps only the matching printings", async () => {
    const result = await search({ q: "r:epic" });

    expect(result.meta.total).toBeGreaterThan(0);
    expect(result.data.every((card) => card.printings.every((printing) => printing.rarity === "epic"))).toBe(true);
  });

  test("free text matches the name of the first result", async () => {
    const [first] = (await search({})).data;
    if (!first) throw new Error("The snapshot has no cards");

    const result = await search({ q: `"${first.name}"` });

    expect(result.data.map((card) => card.id)).toContain(first.id);
  });

  test("sorting by cost descending orders cards by cost with unknown costs last", async () => {
    const costs = (await search({ sort: "cost", direction: "desc" })).data.map((card) => card.energyCost);
    const known = costs.filter((cost) => cost !== null);

    expect(known).toEqual(known.toSorted((a, b) => b - a));
    expect(costs.slice(0, known.length)).toEqual(known);
  });

  test("pages do not overlap", async () => {
    const [first, second] = await Promise.all([search({ page: "1" }), search({ page: "2" })]);
    const firstIds = new Set(first.data.map((card) => card.id));

    expect(second.data.some((card) => firstIds.has(card.id))).toBe(false);
  });

  test("ignored parts of the query come back as warnings", async () => {
    const result = await search({ q: "unknown:1" });

    expect(result.warnings.map((warning) => warning.message)).toEqual(['Unknown keyword "unknown" was ignored.']);
  });

  test("responds 400 invalid_request for an unknown sort", async () => {
    const { status, body } = await get("/search", { sort: "price" });

    expect(status).toBe(400);
    expect(body).toMatchObject({ error: { code: "invalid_request" } });
  });
});

describe("GET /search/options", () => {
  test("lists every set that has a printing", async () => {
    const [{ body }, cards] = await Promise.all([get("/search/options"), allCards()]);
    const optionCodes = OptionsResponseSchema.parse(body).data.sets.map((set) => set.code);
    const printedCodes = new Set(cards.flatMap((card) => card.printings.map((printing) => printing.set.code)));

    expect(new Set(optionCodes)).toEqual(printedCodes);
  });
});
