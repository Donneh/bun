import { describe, expect, test } from "bun:test";
import type { PricedCard, PrintingPrices } from "@riftkeeper/cards/prices";
import { makeCard, makePriceSnapshot, makePrinting } from "@riftkeeper/cards/testing";
import { createApp } from "./app.ts";

describe("GET /health", () => {
  test("reports ok with the number of loaded cards", async () => {
    const app = createApp({
      cards: [makeCard({ id: "abandon" }), makeCard({ id: "jinx-loose-cannon" })],
      prices: makePriceSnapshot(),
    });

    const response = await app.request("/health");

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ data: { status: "ok", cards: 2, version: null } });
  });

  test("reports the deployed Worker version", async () => {
    const app = createApp({ cards: [makeCard()], prices: makePriceSnapshot() });

    const response = await app.request("/health", {}, { CF_VERSION_METADATA: { id: "version-1" } });

    expect(await response.json()).toMatchObject({ data: { version: "version-1" } });
  });
});

describe("CORS", () => {
  const app = createApp({ cards: [makeCard()], prices: makePriceSnapshot() });
  const origin = { Origin: "https://riftkeeper.example" };

  test("allows any origin on GET responses without credentials", async () => {
    const response = await app.request("/search?q=c:fury", { headers: origin });

    expect(response.status).toBe(200);
    expect(response.headers.get("access-control-allow-origin")).toBe("*");
    expect(response.headers.get("access-control-allow-credentials")).toBeNull();
  });

  test("allows any origin on error responses", async () => {
    const response = await app.request("/missing", { headers: origin });

    expect(response.status).toBe(404);
    expect(response.headers.get("access-control-allow-origin")).toBe("*");
  });

  test("answers a preflight with GET as the only allowed method", async () => {
    const response = await app.request("/search", {
      method: "OPTIONS",
      headers: { ...origin, "Access-Control-Request-Method": "GET" },
    });

    expect(response.status).toBe(204);
    expect(response.headers.get("access-control-allow-origin")).toBe("*");
    expect(response.headers.get("access-control-allow-methods")).toBe("GET");
  });
});

describe("routing", () => {
  test.each(["/health/", "/cards/", "/search/"])("does not serve %s with a trailing slash", async (path) => {
    const app = createApp({ cards: [makeCard()], prices: makePriceSnapshot() });

    const response = await app.request(path);

    expect(response.status).toBe(404);
  });
});

describe("prices", () => {
  const quote = { market: 0.25, low: 0.1, mid: 0.3, high: 2 };
  const priced = makePrinting({ id: "ogn-001-298", publicCode: "OGN-001/298" });
  const unpriced = makePrinting({ id: "unl-t01", publicCode: "UNL-T01" });
  const prices = makePriceSnapshot({ printings: { [priced.id]: { normal: quote, foil: { ...quote, market: 1 } } } });
  const app = createApp({ cards: [makeCard({ id: "jinx", name: "Jinx", printings: [priced, unpriced] })], prices });
  const expectedPrices: (PrintingPrices | null)[] = [
    {
      normal: quote,
      foil: { ...quote, market: 1 },
      currency: "USD",
      source: "TCGplayer via TCGCSV",
      updatedAt: prices.updatedAt,
    },
    null,
  ];

  async function firstCard(path: string): Promise<PricedCard | undefined> {
    const body = (await (await app.request(path)).json()) as { data: PricedCard | PricedCard[] };
    return [body.data].flat()[0];
  }

  test.each(["/cards/jinx", "/cards", "/search?q=jinx"])("%s gives each printing its prices or null", async (path) => {
    const card = await firstCard(path);

    expect(card?.printings.map((printing) => printing.prices)).toEqual(expectedPrices);
  });
});
