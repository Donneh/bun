import { expect, type Page, type Response, test } from "@playwright/test";
import { apiBase } from "../playwright.config.ts";

const searchBox = (page: Page) => page.getByRole("searchbox", { name: "Search cards" });
const results = (page: Page) => page.getByRole("list", { name: "Search results" });
const MAX_FIRST_SCREEN_IMAGE_BYTES = 1_000_000;
const isSearchRequest = (url: URL) => url.origin === apiBase && url.pathname === "/search";

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

test("an empty page invites a search", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { level: 1, name: "Riftkeeper" })).toBeVisible();
  await expect(searchBox(page)).toHaveValue("");
  await expect(page.getByText("Search the Riftbound card list")).toBeVisible();
  await expect(results(page)).toHaveCount(0);
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
