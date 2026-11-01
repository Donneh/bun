import type { Page } from "@playwright/test";
import { expect, failedResponse, test, unknownCardResponse } from "../e2e/browser-console.ts";
import { apiBase } from "../playwright.config.ts";

const searchBox = (page: Page) => page.getByRole("searchbox", { name: "Search cards" });
const results = (page: Page) => page.getByRole("list", { name: "Search results" });
const tiles = (page: Page) => results(page).getByRole("link");
const themeButton = (page: Page) => page.getByRole("button", { name: /^Theme: / });
const isSearchRequest = (url: URL) => url.origin === apiBase && url.pathname === "/search";
const isNextPageRequest = (url: URL) => isSearchRequest(url) && Number(url.searchParams.get("page") ?? 1) > 1;
const isCardRequest = (url: URL) => url.origin === apiBase && /^\/cards\/[^/]+$/.test(url.pathname);

async function search(page: Page, query: string) {
  await searchBox(page).fill(query);
  await searchBox(page).press("Enter");
  await expect.poll(() => new URL(page.url()).searchParams.get("q")).toBe(query);
}

async function scrollToEnd(page: Page) {
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
}

test.describe.configure({ timeout: 120_000 });

test("the search page stays quiet through every state", async ({ page }) => {
  await page.goto("/");
  await expect(tiles(page).first()).toBeVisible();
  const firstPage = await tiles(page).count();
  await scrollToEnd(page);
  await expect.poll(() => tiles(page).count()).toBeGreaterThan(firstPage);

  await page.getByRole("button", { name: "Search ability:draw" }).click();
  await expect(searchBox(page)).toHaveValue("ability:draw");
  await expect(tiles(page).first()).toBeVisible();

  await search(page, "c:fury cost:<=2");
  await page.getByRole("combobox", { name: "Sort by" }).selectOption({ label: "Name" });
  await expect.poll(() => new URL(page.url()).searchParams.get("sort")).toBe("name");
  await page.getByRole("button", { name: /^Direction:/ }).click();
  await expect.poll(() => new URL(page.url()).searchParams.get("direction")).toBe("desc");
  await page.getByRole("list", { name: "Filters" }).getByRole("button", { name: "Remove Cost ≤ 2" }).click();
  await expect.poll(() => new URL(page.url()).searchParams.get("q")).toBe("c:fury");

  await search(page, "zzzzzzzz");
  await expect(page.getByText("No cards found")).toBeVisible();
  await search(page, "foo:bar c:calm");
  await expect(tiles(page).first()).toBeVisible();

  for (const theme of ["light", "dark", "system"]) {
    await themeButton(page).click();
    await expect(themeButton(page)).toHaveAccessibleName(new RegExp(theme, "i"));
  }
});

test("card pages stay quiet through every state", async ({ page, browserConsole }) => {
  browserConsole.expect(unknownCardResponse("no-such-card"));

  await page.goto(`/?q=${encodeURIComponent("type:battlefield")}`);
  await tiles(page).first().click();
  await expect(page.getByRole("article").getByRole("img").first()).toBeVisible();
  await page.goBack();
  await expect(tiles(page).first()).toBeVisible();

  await search(page, "type:unit");
  await tiles(page).first().click();
  const printings = page.getByRole("list", { name: "Printings" }).getByRole("button");
  await expect(printings.first()).toBeVisible();
  if ((await printings.count()) > 1) {
    await printings.nth(1).click();
    await expect(printings.nth(1)).toHaveAttribute("aria-pressed", "true");
  }
  await page.getByRole("link", { name: "Back to results" }).click();
  await expect(tiles(page).first()).toBeVisible();

  await page.goto("/cards/no-such-card");
  await expect(page.getByText("Card not found", { exact: true }).last()).toBeVisible();
  await page.goto("/no/such/page");
  await expect(page.getByText("Page not found", { exact: true }).last()).toBeVisible();
  await page.getByRole("link", { name: "Back to search" }).click();
  await expect(searchBox(page)).toBeVisible();
});

test("loading and failed states stay quiet apart from the failed requests", async ({ page, browserConsole }) => {
  browserConsole.expect(failedResponse(500, "/search"), failedResponse(500, /https?:\/\/[^/]+\/cards\/[^)]+/));

  await page.goto("/");
  await expect(tiles(page).first()).toBeVisible();
  await page.route(isSearchRequest, (route) => route.fulfill({ status: 500, json: { error: { message: "Down" } } }));
  await search(page, "c:mind");
  await expect(page.getByRole("alert")).toContainText("Search failed");
  await page.unrouteAll();
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(tiles(page).first()).toBeVisible();

  await page.route(isNextPageRequest, (route) => route.fulfill({ status: 500, json: { error: { message: "Down" } } }));
  await search(page, "type:unit");
  await expect(tiles(page).first()).toBeVisible();
  await scrollToEnd(page);
  await expect(page.getByRole("alert")).toContainText("Could not load more cards");
  await page.unrouteAll();

  const cardHref = await tiles(page).first().getAttribute("href");
  await page.route(isCardRequest, async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 1_000));
    await route.continue();
  });
  await page.goto(cardHref ?? "/");
  await expect(page.getByRole("article", { name: "Loading card" })).toBeVisible();
  await expect(page.getByRole("article", { name: "Loading card" })).toHaveCount(0);
  await page.unrouteAll();

  await page.route(isCardRequest, (route) => route.fulfill({ status: 500, json: { error: { message: "Down" } } }));
  await page.reload();
  await expect(page.getByRole("alert")).toContainText("Could not load the card");
  await page.unrouteAll();
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(page.getByRole("alert")).toHaveCount(0);
});
