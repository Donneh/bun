import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { fetchGalleryHtml } from "./fetch-gallery.ts";

let server: ReturnType<typeof Bun.serve>;
let seenUserAgent: string | null = null;

beforeAll(() => {
  server = Bun.serve({
    port: 0,
    fetch(request) {
      seenUserAgent = request.headers.get("user-agent");
      return new URL(request.url).pathname === "/missing"
        ? new Response("nope", { status: 404 })
        : new Response("<html>gallery</html>");
    },
  });
});

afterAll(() => {
  server.stop(true);
});

describe("fetchGalleryHtml", () => {
  test("returns the body and identifies itself as riftkeeper-scraper", async () => {
    const html = await fetchGalleryHtml(`${server.url}gallery`);
    expect(html).toBe("<html>gallery</html>");
    expect(seenUserAgent).toContain("riftkeeper-scraper");
  });

  test("throws with the status on a non-2xx response", async () => {
    await expect(fetchGalleryHtml(`${server.url}missing`)).rejects.toThrow("404");
  });
});
