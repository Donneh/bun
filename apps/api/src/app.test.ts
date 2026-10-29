import { describe, expect, test } from "bun:test";
import { makeCard } from "@riftkeeper/cards/testing";
import { createApp } from "./app.ts";

describe("GET /health", () => {
  test("reports ok with the number of loaded cards", async () => {
    const app = createApp({ cards: [makeCard({ id: "abandon" }), makeCard({ id: "jinx-loose-cannon" })] });

    const response = await app.request("/health");

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ data: { status: "ok", cards: 2, version: null } });
  });

  test("reports the deployed Worker version", async () => {
    const app = createApp({ cards: [makeCard()] });

    const response = await app.request("/health", {}, { CF_VERSION_METADATA: { id: "version-1" } });

    expect(await response.json()).toMatchObject({ data: { version: "version-1" } });
  });
});

describe("CORS", () => {
  const app = createApp({ cards: [makeCard()] });
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
