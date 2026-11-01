import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { fetchTcgcsvCatalog } from "./tcgcsv.ts";

const responses: Record<string, unknown> = {
  "/tcgplayer/89/groups": {
    success: true,
    results: [
      { groupId: 10, abbreviation: "OGN" },
      { groupId: 20, abbreviation: "JDG" },
      { groupId: 30, abbreviation: null },
    ],
  },
  "/tcgplayer/89/10/products": {
    success: true,
    results: [{ productId: 1, name: "Jinx", extendedData: [{ name: "Number", value: "001/298" }] }],
  },
  "/tcgplayer/89/10/prices": {
    success: true,
    results: [{ productId: 1, lowPrice: 1, midPrice: 2, highPrice: 3, marketPrice: 2, subTypeName: "Normal" }],
  },
};

let server: ReturnType<typeof Bun.serve>;
let requests: { path: string; userAgent: string | null }[] = [];
let failingPath: string | undefined;

beforeAll(() => {
  server = Bun.serve({
    port: 0,
    fetch(request) {
      const path = new URL(request.url).pathname;
      requests.push({ path, userAgent: request.headers.get("user-agent") });
      if (path === failingPath) return new Response("unavailable", { status: 503 });
      if (path === "/last-updated.txt") return new Response("2026-10-31T20:05:59+0000\n");
      const body = responses[path];
      return body === undefined ? new Response("missing", { status: 404 }) : Response.json(body);
    },
  });
});

afterAll(() => {
  server.stop(true);
});

const baseUrl = () => server.url.origin;

describe("fetchTcgcsvCatalog", () => {
  test("fetches only the groups of our sets, one request after another, as riftkeeper.app, skipping groups without an abbreviation", async () => {
    requests = [];
    failingPath = undefined;

    const catalog = await fetchTcgcsvCatalog({ setCodes: ["OGN", "NEW"], baseUrl: baseUrl() });

    expect(catalog.updatedAt).toBe("2026-10-31T20:05:59.000Z");
    expect(catalog.sets.map((set) => [set.setCode, set.products.length, set.prices.length])).toEqual([["OGN", 1, 1]]);
    expect(requests.map((request) => request.path)).toEqual([
      "/last-updated.txt",
      "/tcgplayer/89/groups",
      "/tcgplayer/89/10/products",
      "/tcgplayer/89/10/prices",
    ]);
    expect(requests.every((request) => request.userAgent?.includes("riftkeeper.app"))).toBe(true);
  });

  test("fails as a whole when one group's prices cannot be fetched", async () => {
    failingPath = "/tcgplayer/89/10/prices";

    await expect(fetchTcgcsvCatalog({ setCodes: ["OGN"], baseUrl: baseUrl() })).rejects.toThrow("HTTP 503");
  });

  test("reads a zero or sub-cent amount as a missing price", async () => {
    failingPath = undefined;
    const original = responses["/tcgplayer/89/10/prices"];
    responses["/tcgplayer/89/10/prices"] = {
      success: true,
      results: [
        { productId: 1, lowPrice: 0, midPrice: 0.004, highPrice: 0.01, marketPrice: null, subTypeName: "Normal" },
      ],
    };

    try {
      const catalog = await fetchTcgcsvCatalog({ setCodes: ["OGN"], baseUrl: baseUrl() });

      expect(catalog.sets[0]?.prices[0]).toMatchObject({
        lowPrice: null,
        midPrice: null,
        highPrice: 0.01,
        marketPrice: null,
      });
    } finally {
      responses["/tcgplayer/89/10/prices"] = original;
    }
  });

  test("fails on a response that is not the TCGCSV envelope", async () => {
    failingPath = undefined;
    const original = responses["/tcgplayer/89/groups"];
    responses["/tcgplayer/89/groups"] = { success: false, errors: ["down"], results: [] };

    try {
      await expect(fetchTcgcsvCatalog({ setCodes: ["OGN"], baseUrl: baseUrl() })).rejects.toThrow("unexpected shape");
    } finally {
      responses["/tcgplayer/89/groups"] = original;
    }
  });
});
