import { describe, expect, test } from "bun:test";
import { makeCard } from "@riftkeeper/cards/testing";
import { createApp } from "../app.ts";

const cards = [
  makeCard({ id: "abandon", name: "Abandon" }),
  makeCard({ id: "jinx-loose-cannon", name: "Jinx", subtitle: "Loose Cannon" }),
];
const app = createApp({ cards });

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

describe("unknown routes", () => {
  test("respond 404 with an error body", async () => {
    const response = await app.request("/nope");

    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({ error: { code: "not_found" } });
  });
});
