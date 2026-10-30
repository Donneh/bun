import { type APIRequestContext, expect, type Page, test } from "@playwright/test";
import { apiBase } from "../playwright.config.ts";

interface ApiPrinting {
  readonly id: string;
  readonly imageUrl: string;
  readonly orientation: "portrait" | "landscape";
}

interface ApiCard {
  readonly id: string;
  readonly name: string;
  readonly printings: readonly ApiPrinting[];
}

interface ApiSearch {
  readonly data: readonly ApiCard[];
  readonly meta: { readonly total: number; readonly pageSize: number };
}

const results = (page: Page) => page.getByRole("list", { name: "Search results" });
const tiles = (page: Page) => results(page).getByRole("link");
const printingButtons = (page: Page) => page.getByRole("list", { name: "Printings" }).getByRole("button");
const cardImage = (page: Page, name: string) => page.getByRole("article").getByRole("img", { name, exact: true });
const isSearchRequest = (url: URL) => url.origin === apiBase && url.pathname === "/search";
const isCardRequest = (url: URL) => url.origin === apiBase && url.pathname.startsWith("/cards/");

async function apiSearch(request: APIRequestContext, query: string): Promise<ApiSearch> {
  const response = await request.get(`${apiBase}/search`, { params: { q: query } });
  expect(response.ok()).toBe(true);
  return (await response.json()) as ApiSearch;
}

async function cardWithPrintings(request: APIRequestContext, minimum: number): Promise<ApiCard> {
  const { data } = await apiSearch(request, "type:unit");
  const card = data.find((candidate) => candidate.printings.length >= minimum);
  expect(card, `a unit on the first page has ${minimum} printings`).toBeDefined();
  return card as ApiCard;
}

function imageFile(url: string) {
  return new URL(url).pathname;
}

const goingBack = {
  "the back link": (page: Page) => page.getByRole("link", { name: "Back to results" }).click(),
  "the browser's back button": (page: Page) => page.goBack(),
};

for (const [way, goBack] of Object.entries(goingBack))
  test(`opening a card and going back with ${way} keeps the loaded results and the scroll position`, async ({
    page,
    request,
  }) => {
    const query = "type:unit";
    const { meta } = await apiSearch(request, query);
    expect(meta.total).toBeGreaterThan(meta.pageSize);

    await page.goto(`/?q=${encodeURIComponent(query)}`);
    await expect(tiles(page)).toHaveCount(meta.pageSize);
    await expect
      .poll(async () => {
        await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
        return tiles(page).count();
      })
      .toBeGreaterThan(meta.pageSize);
    const loaded = await tiles(page).count();
    const target = tiles(page).nth(meta.pageSize + 1);
    await target.scrollIntoViewIfNeeded();
    const scrollBefore = await page.evaluate(() => window.scrollY);
    expect(scrollBefore).toBeGreaterThan(0);
    const href = await target.getAttribute("href");
    const name = await target.getByRole("img").getAttribute("alt");
    expect(href).toMatch(/^\/cards\/[a-z0-9-]+$/);

    const searches: string[] = [];
    page.on("request", (sent) => {
      if (isSearchRequest(new URL(sent.url()))) searches.push(sent.url());
    });
    await target.click();

    await expect.poll(() => new URL(page.url()).pathname).toBe(href);
    await expect(page.getByRole("heading", { level: 1, name: name ?? "" })).toBeVisible();
    await expect(page).toHaveTitle(`${name} · Riftkeeper`);
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);

    await expect(page.getByRole("link", { name: "Back to results" })).toBeVisible();
    await goBack(page);

    await expect.poll(() => new URL(page.url()).searchParams.get("q")).toBe(query);
    await expect(tiles(page)).toHaveCount(loaded);
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeCloseTo(scrollBefore, -1);
    await expect(page).toHaveTitle(`${query} · Riftkeeper`);
    expect(searches).toEqual([]);
  });

test("a card opened from the results shows at once, its image fetched while the pointer rested on it", async ({
  page,
  request,
}) => {
  const query = "type:unit";
  const { data } = await apiSearch(request, query);
  const card = data.find((candidate) => candidate.printings[0]?.orientation === "portrait");
  expect(card, "a portrait unit on the first page").toBeDefined();
  const { id, name, printings } = card as ApiCard;
  const art = printings[0] as ApiPrinting;
  const isDetailImage = (url: string) =>
    imageFile(url) === imageFile(art.imageUrl) && ["360", "720"].includes(new URL(url).searchParams.get("w") ?? "");
  const cardRequests: string[] = [];
  page.on("request", (sent) => {
    if (isCardRequest(new URL(sent.url()))) cardRequests.push(sent.url());
  });

  await page.goto(`/?q=${encodeURIComponent(query)}`);
  const tile = results(page).locator(`a[href="/cards/${id}"]`);
  await expect(tile).toBeVisible();
  const preloaded = page.waitForResponse((response) => isDetailImage(response.url()));
  await tile.hover();
  const preloadedUrl = (await preloaded).url();
  await tile.click();

  await expect(page).toHaveURL(new RegExp(`/cards/${id}$`));
  await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
  const image = cardImage(page, name);
  await expect
    .poll(() => image.evaluate((element: HTMLImageElement) => element.complete && element.naturalWidth > 0), {
      timeout: 1000,
    })
    .toBe(true);
  expect(await image.evaluate((element: HTMLImageElement) => element.currentSrc)).toBe(preloadedUrl);
  expect(cardRequests).toEqual([]);
});

test("a card link opens in a new tab and works there", async ({ page, context, request, isMobile }) => {
  test.skip(isMobile, "modifier clicks need a keyboard");
  const card = await cardWithPrintings(request, 1);
  await page.goto(`/?q=${encodeURIComponent("type:unit")}`);
  const link = tiles(page)
    .filter({ has: page.getByRole("img", { name: card.name, exact: true }) })
    .first();

  const [opened] = await Promise.all([context.waitForEvent("page"), link.click({ modifiers: ["ControlOrMeta"] })]);

  await expect(page).toHaveURL(/\?q=/);
  await expect(opened.getByRole("heading", { level: 1 })).toBeVisible();
  expect(new URL(opened.url()).pathname).toMatch(/^\/cards\//);
});

test("a card page opens directly, survives a reload and fits a phone", async ({ page, request, isMobile }) => {
  const card = await cardWithPrintings(request, 1);
  const [first] = card.printings;

  await page.goto(`/cards/${card.id}`);

  await expect(page.getByRole("heading", { level: 1, name: card.name, exact: true })).toBeVisible();
  await expect(page).toHaveTitle(`${card.name} · Riftkeeper`);
  await expect(cardImage(page, card.name)).toHaveAttribute("src", first?.imageUrl ?? "");
  await expect(page.getByRole("link", { name: "Back to search" })).toHaveAttribute("href", "/");

  await page.reload();

  await expect(page.getByRole("heading", { level: 1, name: card.name, exact: true })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  if (isMobile) {
    const targets = page.locator("a:visible, button:visible");
    for (const height of await targets.evaluateAll((elements) =>
      elements.map((element) => element.getBoundingClientRect().height),
    ))
      expect(height).toBeGreaterThanOrEqual(44);
  }

  await page.getByRole("link", { name: "Back to search" }).click();

  await expect(page.getByRole("heading", { level: 1, name: "Search the whole set. Instantly." })).toBeAttached();
  expect(new URL(page.url()).pathname).toBe("/");
});

test("choosing a printing swaps the image and is kept in the URL", async ({ page, request }) => {
  const card = await cardWithPrintings(request, 2);
  const [first, second] = card.printings;

  await page.goto(`/cards/${card.id}`);
  await expect(printingButtons(page)).toHaveCount(card.printings.length);
  await expect(printingButtons(page).first()).toHaveAttribute("aria-pressed", "true");

  await printingButtons(page).nth(1).click();

  await expect.poll(() => new URL(page.url()).searchParams.get("printing")).toBe(second?.id);
  await expect(printingButtons(page).nth(1)).toHaveAttribute("aria-pressed", "true");
  await expect(printingButtons(page).first()).toHaveAttribute("aria-pressed", "false");
  const source = await cardImage(page, card.name).getAttribute("src");
  expect(imageFile(source ?? "")).toBe(imageFile(second?.imageUrl ?? ""));
  expect(imageFile(source ?? "")).not.toBe(imageFile(first?.imageUrl ?? ""));

  await page.reload();

  await expect(printingButtons(page).nth(1)).toHaveAttribute("aria-pressed", "true");
  await expect(cardImage(page, card.name)).toHaveAttribute("src", second?.imageUrl ?? "");
});

test("a slow card shows a skeleton of the page", async ({ page, request }) => {
  const card = await cardWithPrintings(request, 1);
  await page.route(isCardRequest, async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 1_500));
    await route.continue();
  });

  await page.goto(`/cards/${card.id}`);

  await expect(page.getByRole("article", { name: "Loading card" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 1, name: card.name, exact: true })).toBeVisible();
  await expect(page.getByRole("article", { name: "Loading card" })).toHaveCount(0);
});

test("a failed card shows the error and can be retried", async ({ page, request }) => {
  const card = await cardWithPrintings(request, 1);
  await page.route(isCardRequest, (route) =>
    route.fulfill({ status: 500, json: { error: { code: "internal_error", message: "Internal server error" } } }),
  );

  await page.goto(`/cards/${card.id}`);

  await expect(page.getByRole("alert")).toContainText("Could not load the card");
  await page.unrouteAll();
  await page.getByRole("button", { name: "Try again" }).click();

  await expect(page.getByRole("heading", { level: 1, name: card.name, exact: true })).toBeVisible();
});

test("an unknown card says so", async ({ page }) => {
  await page.goto("/cards/no-such-card");

  await expect(page.getByRole("heading", { level: 1, name: "Card not found" })).toBeAttached();
  await expect(page.getByText("Card not found", { exact: true }).last()).toBeVisible();
  await expect(page).toHaveTitle("Card not found · Riftkeeper");
  await expect(page.getByRole("link", { name: "Back to search" })).toHaveAttribute("href", "/");
});

test("an unknown path shows the app with a page not found message", async ({ page }) => {
  const response = await page.goto("/no/such/page");

  expect(response?.status()).toBe(200);
  await expect(page.getByRole("heading", { level: 1, name: "Page not found" })).toBeAttached();
  await expect(page.getByText("Page not found", { exact: true }).last()).toBeVisible();
  await expect(page).toHaveTitle("Page not found · Riftkeeper");

  await page.getByRole("link", { name: "Back to search" }).click();

  await expect(page.getByRole("searchbox", { name: "Search cards" })).toBeVisible();
});
