import type { APIRequestContext, Page } from "@playwright/test";
import { apiBase } from "../playwright.config.ts";
import { expect, test } from "./browser-console.ts";

const NOTICE =
  'Riftkeeper was created under Riot Games\' "Legal Jibber Jabber" policy using assets owned by Riot Games. Riot Games does not endorse or sponsor this project.';
const NARROWEST_PHONE = { width: 320, height: 640 };

interface ApiSearch {
  readonly data: readonly { readonly id: string; readonly name: string }[];
}

async function firstCard(request: APIRequestContext) {
  const response = await request.get(`${apiBase}/search`);
  expect(response.ok()).toBe(true);
  const { data } = (await response.json()) as ApiSearch;
  expect(data.length).toBeGreaterThan(0);
  return data[0] as ApiSearch["data"][number];
}

async function expectNoticeFits(page: Page) {
  const footer = page.getByRole("contentinfo");
  await footer.scrollIntoViewIfNeeded();
  await expect(footer).toBeVisible();
  await expect(footer).toHaveText(NOTICE);

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
}

const pages = {
  "the search page": {
    path: async () => "/",
    ready: (page: Page) => page.getByRole("list", { name: "Search results" }).getByRole("link").first(),
  },
  "a card page": {
    path: async (request: APIRequestContext) => `/cards/${(await firstCard(request)).id}`,
    ready: (page: Page) => page.getByRole("article"),
  },
  "an unknown path": {
    path: async () => "/no/such/page",
    ready: (page: Page) => page.getByText("There is nothing at this address."),
  },
};

for (const [name, { path, ready }] of Object.entries(pages)) {
  test(`${name} shows Riot's fan-project notice after the content`, async ({ page, request }) => {
    await page.goto(await path(request));
    await expect(ready(page)).toBeVisible();

    await expectNoticeFits(page);
    const footerFollowsMain = await page
      .getByRole("main")
      .evaluate((main) =>
        Boolean(
          main.compareDocumentPosition(document.querySelector("footer") as Node) & Node.DOCUMENT_POSITION_FOLLOWING,
        ),
      );
    expect(footerFollowsMain).toBe(true);

    await page.setViewportSize(NARROWEST_PHONE);
    await expectNoticeFits(page);
  });
}
