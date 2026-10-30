import { afterAll, describe, expect, test } from "bun:test";
import { withVersionOverrides } from "./version-overrides.ts";

const server = Bun.serve({ port: 0, fetch: (request) => Response.json(Object.fromEntries(request.headers)) });
afterAll(() => server.stop());

const overrides = 'riftkeeper-api="staged"';
const routedFetch = withVersionOverrides(fetch, overrides);

async function receivedHeaders(response: Promise<Response>) {
  return (await (await response).json()) as Record<string, string>;
}

describe("withVersionOverrides", () => {
  test("adds the override and keeps the headers of init", async () => {
    const headers = await receivedHeaders(routedFetch(server.url, { headers: { origin: "https://example.com" } }));
    expect(headers).toMatchObject({ origin: "https://example.com", "cloudflare-workers-version-overrides": overrides });
  });

  test("adds the override and keeps the headers of a Request", async () => {
    const request = new Request(server.url.href, { headers: { origin: "https://example.com" } });
    const headers = await receivedHeaders(routedFetch(request));
    expect(headers).toMatchObject({ origin: "https://example.com", "cloudflare-workers-version-overrides": overrides });
  });

  test("keeps the method and body", async () => {
    const echo = Bun.serve({
      port: 0,
      fetch: async (request) => new Response(`${request.method} ${await request.text()}`),
    });
    const response = await routedFetch(new Request(echo.url.href, { method: "POST", body: "card" }));
    expect(await response.text()).toBe("POST card");
    echo.stop();
  });
});
