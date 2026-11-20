import { expect, test } from "./browser-console.ts";

test("retired login links permanently redirect to the public search", async ({ page, request }) => {
  for (const path of ["/login", "/login/", "/login?next=%2Fcards%2Fold-card"]) {
    const response = await request.get(path, { maxRedirects: 0 });
    expect(response.status(), path).toBe(301);
    const destination = new URL(response.headers().location ?? "", response.url());
    expect(destination.origin).toBe(new URL(response.url()).origin);
    expect(destination.pathname).toBe("/");
  }

  await page.goto("/login");
  await expect(page).toHaveURL("/");
  await expect(page.getByRole("searchbox", { name: "Search cards" })).toBeVisible();
  await expect(page.getByRole("list", { name: "Search results" }).getByRole("listitem").first()).toBeVisible();

  const unknown = await request.get("/login-unrelated", { maxRedirects: 0 });
  expect(unknown.status()).toBe(200);
  expect(unknown.headers().location).toBeUndefined();
});

test("crawler discovery files advertise the current homepage, not the retired login", async ({ request }) => {
  const robots = await request.get("/robots.txt");
  expect(robots.status()).toBe(200);
  expect(robots.headers()["content-type"]).toContain("text/plain");
  const directives = (await robots.text()).split(/\r?\n/).filter((line) => line.trim());
  expect(directives).toEqual(["User-agent: *", "Allow: /", "Sitemap: https://riftkeeper.app/sitemap.xml"]);

  const sitemap = await request.get("/sitemap.xml");
  expect(sitemap.status()).toBe(200);
  expect(sitemap.headers()["content-type"]).toContain("xml");
  const xml = await sitemap.text();
  expect(xml).toContain('xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"');
  expect([...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => match[1])).toEqual(["https://riftkeeper.app/"]);
});
