import { type APIRequestContext, expect, type Page, type Response, test } from "@playwright/test";
import { apiBase } from "../playwright.config.ts";

const searchBox = (page: Page) => page.getByRole("searchbox", { name: "Search cards" });
const results = (page: Page) => page.getByRole("list", { name: "Search results" });
const filters = (page: Page) => page.getByRole("list", { name: "Filters" });
const sortBy = (page: Page) => page.getByRole("combobox", { name: "Sort by" });
const sortDirection = (page: Page) => page.getByRole("button", { name: /^Direction:/ });
const themeButton = (page: Page) => page.getByRole("button", { name: /^Theme: / });
const placeholders = (page: Page) => results(page).locator("li[aria-hidden='true']");
const shownNames = (page: Page) =>
  results(page)
    .getByRole("img")
    .evaluateAll((images) => images.map((image) => image.getAttribute("alt")));

interface ApiSearch {
  readonly data: readonly { readonly name: string }[];
  readonly meta: { readonly total: number; readonly pageSize: number };
}

async function apiSearch(request: APIRequestContext, params: Record<string, string>): Promise<ApiSearch> {
  const response = await request.get(`${apiBase}/search`, { params });
  expect(response.ok()).toBe(true);
  return (await response.json()) as ApiSearch;
}
const MAX_FIRST_SCREEN_IMAGE_BYTES = 1_000_000;
const isSearchRequest = (url: URL) => url.origin === apiBase && url.pathname === "/search";
const isNextPageRequest = (url: URL) => isSearchRequest(url) && Number(url.searchParams.get("page") ?? 1) > 1;

async function scrollToEnd(page: Page) {
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
}

async function expectFirstImageLoaded(page: Page) {
  const image = results(page).getByRole("img").first();
  await image.scrollIntoViewIfNeeded();
  await expect
    .poll(() => image.evaluate((element: HTMLImageElement) => element.complete && element.naturalWidth > 0))
    .toBe(true);
}

async function search(page: Page, query: string) {
  await searchBox(page).fill(query);
  await searchBox(page).press("Enter");
  await expect.poll(() => new URL(page.url()).searchParams.get("q")).toBe(query);
}

test("an empty page invites a search", async ({ page, request }) => {
  const health = await request.get(`${apiBase}/health`);
  const { data } = (await health.json()) as { data: { cards: number } };

  await page.goto("/");

  await expect(page).toHaveTitle("Riftkeeper");
  await expect(page.getByRole("heading", { level: 1, name: "Search the whole set. Instantly." })).toBeVisible();
  await expect(page.getByText(`Riftkeeper · ${data.cards.toLocaleString("en")} cards · updated nightly`)).toBeVisible();
  await expect(searchBox(page)).toHaveValue("");
  await expect(page.getByText("Try a query")).toBeVisible();
  await expect(results(page)).toHaveCount(0);
});

test("the page fits the screen without scrolling sideways", async ({ page }) => {
  await page.goto(`/?q=${encodeURIComponent("c:fury cost:<=2")}`);
  await expect(results(page).getByRole("listitem").first()).toBeVisible();

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});

test("every control is a comfortable tap target on a phone", async ({ page, isMobile }) => {
  test.skip(!isMobile, "tap target size applies to touch screens");
  await page.goto(`/?q=${encodeURIComponent("c:fury cost:<=2 type:unit")}`);
  await expect(results(page).getByRole("listitem").first()).toBeVisible();

  const controls = page.locator("button:visible, select:visible, input:visible");
  const heights = await controls.evaluateAll((elements) =>
    elements.map((element) => ({
      control: element.getAttribute("aria-label") ?? element.textContent?.trim() ?? element.tagName,
      height: element.getBoundingClientRect().height,
    })),
  );
  expect(heights.length).toBeGreaterThan(0);
  for (const { control, height } of heights) expect(height, control).toBeGreaterThanOrEqual(44);
});

test("the corner dither keeps clear of the text and fades out before its edges", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(`/?q=${encodeURIComponent("c:fury cost:<=2")}`);
  await expect(results(page).getByRole("listitem").first()).toBeVisible();
  await expect(page.getByText(/^Riftkeeper · .* cards · /)).toBeVisible();

  const coverage = await page.evaluate(() => {
    const canvas = document.querySelector<HTMLCanvasElement>("section canvas");
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return null;
    const bounds = canvas.getBoundingClientRect();
    const scaleX = canvas.width / bounds.width;
    const scaleY = canvas.height / bounds.height;
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    const lit = (x: number, y: number) => (pixels[(y * canvas.width + x) * 4 + 3] ?? 0) > 0;
    const litInside = (rect: DOMRect) => {
      let count = 0;
      const left = Math.max(0, Math.floor((rect.left - bounds.left) * scaleX));
      const right = Math.min(canvas.width, Math.ceil((rect.right - bounds.left) * scaleX));
      const top = Math.max(0, Math.floor((rect.top - bounds.top) * scaleY));
      const bottom = Math.min(canvas.height, Math.ceil((rect.bottom - bounds.top) * scaleY));
      for (let y = top; y < bottom; y++) for (let x = left; x < right; x++) if (lit(x, y)) count++;
      return count;
    };
    const rectOf = (selector: string) => document.querySelector(selector)?.getBoundingClientRect();
    const eyebrowText = [...document.querySelectorAll("section p span")].find((span) =>
      span.textContent?.startsWith("Riftkeeper"),
    );
    let total = 0;
    let leftColumn = 0;
    let bottomRow = 0;
    for (let y = 0; y < canvas.height; y++)
      for (let x = 0; x < canvas.width; x++)
        if (lit(x, y)) {
          total++;
          if (x === 0) leftColumn++;
          if (y === canvas.height - 1) bottomRow++;
        }
    const behind = [
      eyebrowText?.getBoundingClientRect(),
      rectOf("form[role='search']"),
      rectOf("button[aria-label^='Theme:']"),
    ].map((rect) => (rect ? litInside(rect) : -1));
    return { total, leftColumn, bottomRow, behind, top: bounds.top, right: bounds.right };
  });

  expect(coverage).not.toBeNull();
  expect(coverage?.total).toBeGreaterThan(0);
  expect(coverage?.behind).toEqual([0, 0, 0]);
  expect(coverage?.leftColumn).toBe(0);
  expect(coverage?.bottomRow).toBe(0);
  expect(coverage?.top).toBeLessThanOrEqual(0);
  expect(coverage?.right).toBeGreaterThanOrEqual(await page.evaluate(() => document.documentElement.clientWidth));
});

test("the theme button cycles system, light and dark and remembers the choice", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/");
  const background = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  const light = await background();
  await expect(themeButton(page)).toHaveAccessibleName("Theme: system");
  const eyebrowBox = await page.getByText(/^Riftkeeper/).boundingBox();
  const buttonBox = await themeButton(page).boundingBox();
  const middle = (box: { y: number; height: number } | null) => (box ? box.y + box.height / 2 : Number.NaN);
  expect(Math.abs(middle(eyebrowBox) - middle(buttonBox))).toBeLessThan(4);

  await themeButton(page).click();
  await expect(themeButton(page)).toHaveAccessibleName("Theme: light");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");

  await themeButton(page).click();
  await expect(themeButton(page)).toHaveAccessibleName("Theme: dark");
  await expect(themeButton(page)).toHaveAttribute("title", "Theme: dark");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  expect(await background()).not.toBe(light);

  await page.reload();

  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await themeButton(page).click();
  await expect(themeButton(page)).toHaveAccessibleName("Theme: system");
  await expect(page.locator("html")).not.toHaveAttribute("data-theme", /.*/);
  expect(await background()).toBe(light);
});

test("the page works when the browser blocks storage", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "localStorage", {
      get() {
        throw new DOMException("Storage is disabled", "SecurityError");
      },
    });
  });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");

  await expect(searchBox(page)).toBeVisible();
  await themeButton(page).click();
  await themeButton(page).click();

  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  expect(errors).toEqual([]);
});

test("a query shows its matching cards and survives a reload", async ({ page, request }) => {
  const query = "c:fury cost:<=2";
  const apiResponse = await request.get(`${apiBase}/search`, { params: { q: query } });
  const { meta } = (await apiResponse.json()) as { meta: { total: number; pageSize: number } };
  expect(meta.total).toBeGreaterThan(0);
  const shown = Math.min(meta.total, meta.pageSize);

  await page.goto("/");
  await search(page, query);

  await expect(results(page).getByRole("listitem")).toHaveCount(shown);
  await expect(page.getByText(new RegExp(`${meta.total} cards$`))).toBeVisible();
  await expectFirstImageLoaded(page);

  await page.reload();

  await expect(searchBox(page)).toHaveValue(query);
  await expect(results(page).getByRole("listitem")).toHaveCount(shown);
  await expectFirstImageLoaded(page);
});

test("a query without matches says so", async ({ page }) => {
  await page.goto("/");
  await search(page, "zzqxv");

  await expect(page.getByRole("status").getByText("No cards found")).toBeVisible();
  await expect(results(page)).toHaveCount(0);
});

test("a query with an unsupported filter shows the warning", async ({ page }) => {
  await page.goto("/");
  await search(page, "flavor:calm");

  await expect(page.getByRole("list", { name: "Search warnings" })).toHaveText(
    '"flavor" is not supported yet and was ignored.',
  );
  await expectFirstImageLoaded(page);
});

test("a slow search shows the loading state", async ({ page }) => {
  await page.route(isSearchRequest, async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 1_500));
    await route.continue();
  });
  await page.goto("/");
  await search(page, "c:calm");

  await expect(page.getByRole("status").getByText("Searching…")).toBeVisible();
  await expect(results(page).getByRole("listitem").first()).toBeVisible();
});

test("a failed search shows the error and can be retried", async ({ page }) => {
  await page.route(isSearchRequest, (route) =>
    route.fulfill({
      status: 500,
      json: { error: { code: "internal_error", message: "Internal server error" } },
    }),
  );
  await page.goto("/");
  await search(page, "c:mind");

  await expect(page.getByRole("alert")).toContainText("Search failed");
  await expect(page.getByRole("alert")).toContainText("Internal server error");

  await page.unrouteAll();
  await page.getByRole("button", { name: "Search" }).click();

  await expect(results(page).getByRole("listitem").first()).toBeVisible();
});

test("the first screen of a query loads resized WebP images", async ({ page }, testInfo) => {
  const imageResponses: Response[] = [];
  page.on("response", (response) => {
    if (response.request().resourceType() === "image") imageResponses.push(response);
  });
  await page.goto("/");
  await search(page, "c:fury");
  await expect(results(page).getByRole("listitem").first()).toBeVisible();
  await page.waitForLoadState("networkidle");

  const transferred = await Promise.all(
    imageResponses.map(async (response) => {
      const sizes = await response.request().sizes();
      return {
        url: response.url(),
        type: await response.headerValue("content-type"),
        bytes: sizes.responseBodySize + sizes.responseHeadersSize,
      };
    }),
  );
  const totalBytes = transferred.reduce((sum, image) => sum + image.bytes, 0);
  await testInfo.attach("image-transfers", {
    body: JSON.stringify({ totalBytes, transferred }, null, 2),
    contentType: "application/json",
  });

  expect(transferred.length).toBeGreaterThan(0);
  for (const image of transferred) expect(image.type).toBe("image/webp");
  expect(totalBytes).toBeLessThan(MAX_FIRST_SCREEN_IMAGE_BYTES);
});

test("landscape cards keep their landscape shape", async ({ page }) => {
  await page.goto("/");
  await search(page, "type:battlefield");

  const image = results(page).getByRole("img").first();
  await expect(image).toBeVisible();
  const box = await image.boundingBox();
  expect(box?.width).toBeGreaterThan(box?.height ?? Number.POSITIVE_INFINITY);
});

test("scrolling loads every result page by page and keeps the URL shareable", async ({ page, request }) => {
  const query = "c:fury cost:<=2";
  const { meta } = await apiSearch(request, { q: query });
  expect(meta.total).toBeGreaterThan(meta.pageSize);
  const pageRequests: number[] = [];
  page.on("request", (request) => {
    if (isNextPageRequest(new URL(request.url()))) pageRequests.push(Date.now());
  });

  await page.goto("/");
  await search(page, query);
  await expect(results(page).getByRole("listitem")).toHaveCount(meta.pageSize);
  await expect(page.getByText(`Showing ${meta.pageSize} of ${meta.total} cards`)).toBeVisible();
  const firstPage = await shownNames(page);

  await expect
    .poll(async () => {
      await scrollToEnd(page);
      return results(page).getByRole("listitem").count();
    })
    .toBe(meta.total);

  await expect(page.getByText(`${meta.total} cards`, { exact: true })).toHaveAttribute("aria-live", "polite");
  expect((await shownNames(page)).slice(0, meta.pageSize)).toEqual(firstPage);
  expect(new URL(page.url()).searchParams.has("page")).toBe(false);
  expect(pageRequests).toHaveLength(Math.ceil(meta.total / meta.pageSize) - 1);
  for (let index = 1; index < pageRequests.length; index++)
    expect((pageRequests[index] ?? 0) - (pageRequests[index - 1] ?? 0)).toBeGreaterThanOrEqual(500);
});

test("the next page shows placeholder tiles while it loads", async ({ page }) => {
  await page.route(isNextPageRequest, async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 2_000));
    await route.continue();
  });
  await page.goto("/");
  await search(page, "type:unit");
  await expect(results(page).getByRole("listitem").first()).toBeVisible();
  const firstPage = await results(page).getByRole("listitem").count();

  await scrollToEnd(page);

  await expect(placeholders(page).first()).toBeVisible();
  await expect(placeholders(page)).toHaveCount(0, { timeout: 10_000 });
  expect(await results(page).getByRole("listitem").count()).toBeGreaterThan(firstPage);
});

test("a failed page shows the error and can be retried", async ({ page }) => {
  await page.route(isNextPageRequest, (route) =>
    route.fulfill({
      status: 500,
      json: { error: { code: "internal_error", message: "Internal server error" } },
    }),
  );
  await page.goto("/");
  await search(page, "type:unit");
  await expect(results(page).getByRole("listitem").first()).toBeVisible();
  const firstPage = await results(page).getByRole("listitem").count();

  await scrollToEnd(page);

  await expect(page.getByRole("alert")).toContainText("Could not load more cards");
  await expect(page.getByRole("alert")).toContainText("Internal server error");
  await expect(results(page).getByRole("listitem")).toHaveCount(firstPage);

  await page.unrouteAll();
  await page.getByRole("button", { name: "Try again" }).click();

  await expect(page.getByRole("alert")).toHaveCount(0);
  await expect.poll(() => results(page).getByRole("listitem").count()).toBeGreaterThan(firstPage);
});

test("sorting reorders the results and is kept in the URL", async ({ page, request }) => {
  const query = "type:unit";
  const [bySet, byMightDescending] = await Promise.all([
    apiSearch(request, { q: query }),
    apiSearch(request, { q: query, sort: "might", direction: "desc" }),
  ]);
  const setOrder = bySet.data.map((card) => card.name);
  const mightOrder = byMightDescending.data.map((card) => card.name);
  expect(mightOrder).not.toEqual(setOrder);

  await page.goto("/");
  await search(page, query);
  await expect(sortBy(page)).toHaveValue("set");
  await expect.poll(() => shownNames(page)).toEqual(setOrder);

  await sortBy(page).selectOption({ label: "Might" });
  await expect.poll(() => new URL(page.url()).searchParams.get("sort")).toBe("might");
  await expect(sortDirection(page)).toHaveAccessibleName("Direction: Ascending");
  await sortDirection(page).click();

  await expect.poll(() => new URL(page.url()).searchParams.get("direction")).toBe("desc");
  expect(new URL(page.url()).searchParams.get("q")).toBe(query);
  await expect.poll(() => shownNames(page)).toEqual(mightOrder);
});

test("removing a filter chip edits the query and searches again", async ({ page, request }) => {
  const { meta } = await apiSearch(request, { q: "c:fury" });

  await page.goto("/");
  await search(page, "c:fury cost:<=2");
  await expect(filters(page).getByRole("listitem")).toHaveText([/Domain\s*Fury/, /Cost\s*≤ 2/]);

  await filters(page).getByRole("button", { name: "Remove Cost ≤ 2" }).click();

  await expect.poll(() => new URL(page.url()).searchParams.get("q")).toBe("c:fury");
  await expect(searchBox(page)).toHaveValue("c:fury");
  await expect(filters(page).getByRole("listitem")).toHaveText([/Domain\s*Fury/]);
  await expect(page.getByText(new RegExp(`${meta.total} cards$`))).toBeVisible();
});

test("a repeated filter is shown as a chip that cannot be removed", async ({ page }) => {
  await page.goto(`/?q=${encodeURIComponent("cost:>=2 cost:<=4 type:unit")}`);

  await expect(filters(page).getByRole("listitem")).toHaveText([/Cost\s*≥ 2/, /Cost\s*≤ 4/, /Type\s*unit/]);
  await expect(filters(page).getByRole("button")).toHaveCount(1);
  await expect(filters(page).getByRole("button", { name: "Remove Type unit" })).toBeVisible();
});

test("a shared URL with a sort opens its first page in that order", async ({ page, request }) => {
  const query = "type:unit";
  const { data, meta } = await apiSearch(request, { q: query, sort: "name", direction: "desc" });

  await page.goto(`/?q=${encodeURIComponent(query)}&sort=name&direction=desc&page=3`);

  await expect(searchBox(page)).toHaveValue(query);
  await expect(sortBy(page)).toHaveValue("name");
  await expect(sortDirection(page)).toHaveAccessibleName("Direction: Descending");
  await expect(results(page).getByRole("listitem")).toHaveCount(Math.min(meta.total, meta.pageSize));
  await expect.poll(() => shownNames(page)).toEqual(data.map((card) => card.name));
});
