import { describe, expect, test } from "bun:test";
import { makeCard } from "@riftkeeper/cards/testing";
import { createApp } from "./app.ts";

describe("GET /health", () => {
  test("reports ok with the number of loaded cards", async () => {
    const app = createApp({ cards: [makeCard({ id: "abandon" }), makeCard({ id: "jinx-loose-cannon" })] });

    const response = await app.request("/health");

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ data: { status: "ok", cards: 2 } });
  });
});
