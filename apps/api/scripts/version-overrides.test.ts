import { afterAll, describe, expect, test } from "bun:test";
import { withExpectedVersion, withVersionOverrides } from "./version-overrides.ts";

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

describe("withExpectedVersion", () => {
  function versions(...answers: (string | null)[]) {
    const seen: string[] = [];
    const server = Bun.serve({
      port: 0,
      fetch: async (request) => {
        seen.push(`${request.method} ${request.headers.get("origin")} ${await request.text()}`);
        const version = answers[Math.min(seen.length, answers.length) - 1] ?? null;
        return new Response(version ?? "old", version === null ? {} : { headers: { "x-worker-version": version } });
      },
    });
    return { server, seen };
  }

  test("resends a request another version answered until the expected version answers", async () => {
    const { server, seen } = versions(null, "previous", "staged");
    const send = withExpectedVersion(fetch, "staged", { delayMs: 1 });

    const response = await send(
      new Request(server.url.href, { method: "POST", body: "card", headers: { origin: "https://example.com" } }),
    );

    expect(response.headers.get("x-worker-version")).toBe("staged");
    expect(seen).toEqual(Array(3).fill("POST https://example.com card"));
    server.stop();
  });

  test("returns the last answer when the expected version never answers", async () => {
    const { server, seen } = versions("previous");
    const send = withExpectedVersion(fetch, "staged", { attempts: 3, delayMs: 1 });

    const response = await send(server.url);

    expect(response.headers.get("x-worker-version")).toBe("previous");
    expect(seen).toHaveLength(3);
    server.stop();
  });
});
