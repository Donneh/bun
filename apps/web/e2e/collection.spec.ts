import { readFile } from "node:fs/promises";
import type { APIRequestContext, Page } from "@playwright/test";
import { apiBase, webBase } from "../playwright.config.ts";
import { expect, failedResponse, test } from "./browser-console.ts";

interface ApiPrinting {
  readonly id: string;
  readonly publicCode: string;
}

interface ApiCard {
  readonly id: string;
  readonly name: string;
  readonly printings: readonly ApiPrinting[];
}

const STORAGE_KEY = "riftkeeper-collection";

const addCopy = (page: Page, code: string) => page.getByRole("button", { name: `Add a copy of ${code}` }).click();
const removeCopy = (page: Page, code: string) => page.getByRole("button", { name: `Remove a copy of ${code}` }).click();
const ownedCount = (page: Page, code: string) =>
  page.getByRole("group", { name: `Copies of ${code}` }).getByRole("status");
const wishlistButton = (page: Page, code: string) => page.getByRole("button", { name: `Wishlist ${code}` });
const printingButtons = (page: Page) => page.getByRole("list", { name: "Printings" }).getByRole("button");
const ownedTiles = (page: Page) => page.getByRole("list", { name: "Owned printings" }).getByRole("link");
const wishlistTiles = (page: Page) => page.getByRole("list", { name: "Wishlist" }).getByRole("link");
const importInput = (page: Page) => page.getByLabel("Import", { exact: true });
const storedCollection = (page: Page) => page.evaluate((key) => window.localStorage.getItem(key), STORAGE_KEY);

async function cardWithPrintings(request: APIRequestContext, minimum: number): Promise<ApiCard> {
  const response = await request.get(`${apiBase}/search`, { params: { q: "type:unit" } });
  expect(response.ok()).toBe(true);
  const { data } = (await response.json()) as { data: ApiCard[] };
  const card = data.find((candidate) => candidate.printings.length >= minimum);
  expect(card, `a unit on the first page has ${minimum} printings`).toBeDefined();
  return card as ApiCard;
}

function exportFile(printings: Record<string, { owned: number; wishlist: boolean }>, version = 1) {
  return {
    name: "collection.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify({ format: "riftkeeper-collection", version, printings })),
  };
}

async function seed(page: Page, printings: Record<string, { owned: number; wishlist: boolean }>) {
  await page.addInitScript(
    ([key, value]) => {
      if (window.localStorage.getItem(key) === null) window.localStorage.setItem(key, value);
    },
    [STORAGE_KEY, JSON.stringify({ version: 1, printings })] as const,
  );
}

test("owned counts and the wishlist survive a reload and appear on the collection page", async ({ page, request }) => {
  const card = await cardWithPrintings(request, 2);
  const [first, second] = card.printings as [ApiPrinting, ApiPrinting];

  await page.goto(`/cards/${card.id}`);
  await expect(ownedCount(page, first.publicCode)).toHaveText("0");
  await expect(page.getByText("Not in your collection")).toBeVisible();
  await expect(page.getByText("Saved in this browser only.")).toBeVisible();

  await addCopy(page, first.publicCode);
  await addCopy(page, first.publicCode);
  await addCopy(page, first.publicCode);
  await removeCopy(page, first.publicCode);
  await expect(ownedCount(page, first.publicCode)).toHaveText("2");
  await wishlistButton(page, first.publicCode).click();
  await expect(wishlistButton(page, first.publicCode)).toHaveAttribute("aria-pressed", "true");

  await printingButtons(page).nth(1).click();
  await expect(ownedCount(page, second.publicCode)).toHaveText("0");
  await expect(wishlistButton(page, second.publicCode)).toHaveAttribute("aria-pressed", "false");
  await addCopy(page, second.publicCode);
  const summary = `3 copies in 2 of ${card.printings.length} printings`;
  await expect(page.getByText(summary)).toBeVisible();

  await page.reload();

  await expect(ownedCount(page, second.publicCode)).toHaveText("1");
  await expect(page.getByText(summary)).toBeVisible();
  await printingButtons(page).first().click();
  await expect(ownedCount(page, first.publicCode)).toHaveText("2");
  await expect(wishlistButton(page, first.publicCode)).toHaveAttribute("aria-pressed", "true");

  await page.getByRole("navigation", { name: "Site" }).getByRole("link", { name: "Collection" }).click();

  await expect(page).toHaveURL(/\/collection$/);
  await expect(page.getByRole("heading", { level: 1, name: "Collection" })).toBeVisible();
  await expect(page).toHaveTitle("Collection · Riftkeeper");
  await expect(page.getByText("3 copies of 2 printings · 1 printing on the wishlist")).toBeVisible();
  await expect(ownedTiles(page)).toHaveCount(2);
  await expect(ownedTiles(page).first()).toHaveAccessibleName(/, 2 copies$/);
  await expect(ownedTiles(page).nth(1)).toHaveAccessibleName(/, 1 copy$/);
  await expect(wishlistTiles(page)).toHaveCount(1);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);

  await ownedTiles(page).first().click();

  await expect.poll(() => new URL(page.url()).searchParams.get("printing")).toBe(first.id);
  await expect(ownedCount(page, first.publicCode)).toHaveText("2");
});

test("removing the last copy takes a printing out of the collection", async ({ page, request }) => {
  const card = await cardWithPrintings(request, 1);
  const [first] = card.printings as [ApiPrinting];
  await seed(page, { [first.publicCode]: { owned: 1, wishlist: false } });

  await page.goto(`/cards/${card.id}`);
  await removeCopy(page, first.publicCode);

  await expect(ownedCount(page, first.publicCode)).toHaveText("0");
  await expect(page.getByRole("button", { name: `Remove a copy of ${first.publicCode}` })).toBeDisabled();
  expect(JSON.parse((await storedCollection(page)) ?? "null")).toEqual({ version: 1, printings: {} });

  await page.goto("/collection");
  await expect(page.getByText("Your collection is empty")).toBeVisible();
  await expect(page.getByRole("button", { name: "Export" })).toBeDisabled();
});

test("an exported collection imported in another browser profile restores the same collection", async ({
  page,
  browser,
  request,
}) => {
  const card = await cardWithPrintings(request, 2);
  const [first, second] = card.printings as [ApiPrinting, ApiPrinting];
  await page.goto(`/cards/${card.id}`);
  await addCopy(page, first.publicCode);
  await addCopy(page, first.publicCode);
  await printingButtons(page).nth(1).click();
  await wishlistButton(page, second.publicCode).click();
  await expect(wishlistButton(page, second.publicCode)).toHaveAttribute("aria-pressed", "true");

  await page.goto("/collection");
  await expect(ownedTiles(page)).toHaveCount(1);
  const downloading = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export" }).click();
  const download = await downloading;
  expect(download.suggestedFilename()).toMatch(/^riftkeeper-collection-\d{4}-\d{2}-\d{2}\.json$/);
  const exported = JSON.parse(await readFile(await download.path(), "utf8")) as Record<string, unknown>;
  expect(exported).toMatchObject({
    format: "riftkeeper-collection",
    version: 1,
    printings: {
      [first.publicCode]: { owned: 2, wishlist: false },
      [second.publicCode]: { owned: 0, wishlist: true },
    },
  });

  const otherProfile = await browser.newContext({ baseURL: webBase });
  const browserMessages: string[] = [];
  try {
    const other = await otherProfile.newPage();
    other.on("console", (message) => {
      if (["error", "warning"].includes(message.type())) browserMessages.push(message.text());
    });
    other.on("pageerror", (error) => browserMessages.push(error.message));
    await other.goto("/collection");
    await expect(other.getByText("Your collection is empty")).toBeVisible();

    await importInput(other).setInputFiles({
      name: download.suggestedFilename(),
      mimeType: "application/json",
      buffer: await readFile(await download.path()),
    });

    const preview = other.getByRole("region", { name: `Import ${download.suggestedFilename()} (2 printings)` });
    await expect(preview).toBeVisible();
    await expect(preview.getByRole("listitem")).toHaveCount(2);
    await expect(preview.getByRole("listitem").nth(1)).toContainText("2 added · 0 changed · 0 removed");
    await preview.getByRole("button", { name: "Replace", exact: true }).click();

    await expect(other.getByRole("status").filter({ hasText: "Replaced the collection with" })).toBeVisible();
    await expect(preview).toHaveCount(0);
    await expect(ownedTiles(other)).toHaveCount(1);
    await expect(wishlistTiles(other)).toHaveCount(1);
    await other.reload();
    await expect(ownedTiles(other)).toHaveCount(1);
    expect(JSON.parse((await storedCollection(other)) ?? "null")).toEqual(
      JSON.parse((await storedCollection(page)) ?? "null"),
    );
  } finally {
    await otherProfile.close();
  }
  expect(browserMessages).toEqual([]);
});

test("merging an import keeps the printings that are only in this browser", async ({ page, request }) => {
  const card = await cardWithPrintings(request, 2);
  const [first, second] = card.printings as [ApiPrinting, ApiPrinting];
  await seed(page, { [first.publicCode]: { owned: 1, wishlist: false } });
  await page.goto("/collection");
  await expect(ownedTiles(page)).toHaveCount(1);

  await importInput(page).setInputFiles(
    exportFile({
      [first.publicCode]: { owned: 3, wishlist: false },
      [second.publicCode]: { owned: 1, wishlist: true },
    }),
  );
  const preview = page.getByRole("region", { name: "Import collection.json (2 printings)" });
  await expect(preview.getByRole("listitem").first()).toContainText("1 added · 1 changed · 0 removed");
  await preview.getByRole("button", { name: "Merge", exact: true }).click();

  await expect(page.getByText("4 copies of 2 printings · 1 printing on the wishlist")).toBeVisible();
  await expect(ownedTiles(page).first()).toHaveAccessibleName(/, 3 copies$/);
});

test("a file that is not a collection export is rejected with a clear message and changes nothing", async ({
  page,
  request,
}) => {
  const card = await cardWithPrintings(request, 1);
  const [first] = card.printings as [ApiPrinting];
  await seed(page, { [first.publicCode]: { owned: 1, wishlist: false } });
  await page.goto("/collection");
  await expect(ownedTiles(page)).toHaveCount(1);
  const before = await storedCollection(page);

  await importInput(page).setInputFiles({ name: "notes.json", mimeType: "application/json", buffer: Buffer.from("[") });
  await expect(page.getByRole("alert")).toHaveText(/not a Riftkeeper collection export.*not valid JSON/);

  await importInput(page).setInputFiles(exportFile({ [first.publicCode]: { owned: -2, wishlist: false } }));
  await expect(page.getByRole("alert")).toContainText("owned: must be a whole number from 0 to 999");

  await importInput(page).setInputFiles(exportFile({}, 2));
  await expect(page.getByRole("alert")).toContainText("format version 2");

  await expect(page.getByRole("region", { name: /^Import / })).toHaveCount(0);
  expect(await storedCollection(page)).toBe(before);
  await expect(ownedTiles(page)).toHaveCount(1);
});

test("the collection works for the visit when the browser blocks storage", async ({ page, request }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "localStorage", {
      get() {
        throw new DOMException("Storage is disabled", "SecurityError");
      },
    });
  });
  const card = await cardWithPrintings(request, 1);
  const [first] = card.printings as [ApiPrinting];

  await page.goto(`/cards/${card.id}`);
  await expect(page.getByText(/This browser blocks storage/)).toBeVisible();
  await addCopy(page, first.publicCode);
  await expect(ownedCount(page, first.publicCode)).toHaveText("1");

  await page.getByRole("navigation", { name: "Site" }).getByRole("link", { name: "Collection" }).click();

  await expect(page.getByText(/This browser blocks storage/)).toBeVisible();
  await expect(ownedTiles(page)).toHaveCount(1);
});

test("a failed card list on the collection page shows the error and can be retried", async ({
  page,
  request,
  browserConsole,
}) => {
  const card = await cardWithPrintings(request, 1);
  const [first] = card.printings as [ApiPrinting];
  await seed(page, { [first.publicCode]: { owned: 1, wishlist: false } });
  const isCardList = (url: URL) => url.origin === apiBase && url.pathname === "/cards";
  browserConsole.expect(failedResponse(500, "/cards"));
  await page.route(isCardList, (route) =>
    route.fulfill({ status: 500, json: { error: { code: "internal_error", message: "Internal server error" } } }),
  );

  await page.goto("/collection");

  await expect(page.getByRole("alert")).toContainText("Could not load the card list");
  await expect(page.getByText("1 copy of 1 printing · 0 printings on the wishlist")).toBeVisible();
  await page.unrouteAll();
  await page.getByRole("button", { name: "Try again" }).click();

  await expect(ownedTiles(page)).toHaveCount(1);
});
