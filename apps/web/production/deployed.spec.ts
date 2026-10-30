import { type APIRequestContext, expect, test } from "@playwright/test";
import { expectedApiVersion, expectedBuildId, webUrl, wwwUrl } from "../playwright.production.config.ts";

const READY_TIMEOUT_MS = 180_000;
const query = "c:fury cost:<=2";

async function homePage(request: APIRequestContext) {
  const response = await request.get("/", { headers: { "cache-control": "no-cache" } });
  return { response, html: response.ok() ? await response.text() : "" };
}

function servesTheApp(html: string) {
  if (!html.includes('<div id="__nuxt">')) return false;
  return expectedBuildId === undefined || html.includes(`buildId:"${expectedBuildId}"`);
}

function assetPaths(html: string) {
  return [...new Set([...html.matchAll(/(?:src|href)="(\/_nuxt\/[^"]+\.(?:js|css))"/g)].map(([, path]) => path ?? ""))];
}

test.beforeAll(async ({ request }) => {
  test.setTimeout(READY_TIMEOUT_MS + 10_000);
  await expect
    .poll(async () => servesTheApp((await homePage(request)).html), {
      message: `${webUrl} serves the app${expectedBuildId ? ` at build ${expectedBuildId}` : ""}`,
      timeout: READY_TIMEOUT_MS,
      intervals: [2_000, 5_000],
    })
    .toBe(true);
});

test("the home page and its scripts and styles load", async ({ request }) => {
  const { response, html } = await homePage(request);
  expect(response.headers()["content-type"]).toContain("text/html");

  const paths = assetPaths(html);
  expect(paths.filter((path) => path.endsWith(".js")).length).toBeGreaterThan(0);
  expect(paths.filter((path) => path.endsWith(".css")).length).toBeGreaterThan(0);

  for (const path of paths) {
    const asset = await request.get(path);
    expect(asset.status(), path).toBe(200);
    expect(asset.headers()["content-type"], path).toMatch(path.endsWith(".css") ? /text\/css/ : /javascript/);
  }
});

test("a shared search link shows its cards", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));

  const searchResponse = page.waitForResponse((response) => new URL(response.url()).pathname === "/search");
  await page.goto(`/?q=${encodeURIComponent(query)}`);

  await expect(page.getByRole("searchbox", { name: "Search cards" })).toHaveValue(query);
  await expect(page.getByRole("list", { name: "Search results" }).getByRole("listitem").first()).toBeVisible();
  expect(errors).toEqual([]);

  const apiOrigin = new URL((await searchResponse).url()).origin;
  if (expectedApiVersion) {
    const apiVersion = await page.evaluate(async (healthUrl) => {
      const health = (await (await fetch(healthUrl, { cache: "no-store" })).json()) as { data: { version: unknown } };
      return health.data.version;
    }, `${apiOrigin}/health`);
    expect(apiVersion, `the API the page searched, ${apiOrigin}, runs the new version`).toBe(expectedApiVersion);
  }
});

test("a card link opened directly serves the app and shows the card", async ({ page, request }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const searchResponse = page.waitForResponse((response) => new URL(response.url()).pathname === "/search");
  await page.goto(`/?q=${encodeURIComponent(query)}`);
  const { data } = (await (await searchResponse).json()) as { data: { id: string; name: string }[] };
  const [card] = data;
  if (!card) throw new Error(`${query} finds no card`);
  const path = `/cards/${card.id}`;

  const response = await request.get(path, { headers: { "cache-control": "no-cache" } });
  expect(response.status(), path).toBe(200);
  expect(
    servesTheApp(await response.text()),
    `${path} serves the app${expectedBuildId ? ` at build ${expectedBuildId}` : ""}`,
  ).toBe(true);

  await page.goto(path);

  await expect(page.getByRole("heading", { level: 1, name: card.name, exact: true })).toBeVisible();
  await expect(page.getByRole("article").getByRole("img", { name: card.name, exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

test("an unknown path serves the app, which says the page was not found", async ({ page, request }) => {
  const response = await request.get("/no-such-page", { headers: { "cache-control": "no-cache" } });
  expect(response.status()).toBe(200);
  expect(servesTheApp(await response.text())).toBe(true);

  await page.goto("/no-such-page");

  await expect(page.getByRole("heading", { level: 1, name: "Page not found" })).toBeAttached();
});

test("www redirects to the apex and keeps the path and query", async ({ request }) => {
  test.setTimeout(READY_TIMEOUT_MS + 10_000);
  const target = `${webUrl}/?q=${encodeURIComponent(query)}`;
  await expect
    .poll(
      async () => {
        const response = await request.get(`${wwwUrl}/?q=${encodeURIComponent(query)}`, { maxRedirects: 0 });
        return { status: response.status(), location: response.headers().location };
      },
      { timeout: READY_TIMEOUT_MS, intervals: [2_000, 5_000] },
    )
    .toEqual({ status: 301, location: target });
});
