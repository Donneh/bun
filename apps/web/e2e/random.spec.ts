import { apiBase } from "../playwright.config.ts";
import { expect, failedResponse, test } from "./browser-console.ts";

test("random opens the chosen card and can choose again from the navbar", async ({ page }) => {
  const randomLink = page.getByRole("link", { name: "Random", exact: true });
  for (const open of [() => page.goto("/random"), () => randomLink.click(), () => randomLink.click()]) {
    const chosen = page.waitForResponse((response) => new URL(response.url()).pathname === "/cards/random");
    await open();
    const { data } = (await (await chosen).json()) as { data: { id: string } };
    await expect(page).toHaveURL(`/cards/${data.id}`);
    await expect(page.getByRole("article")).toBeVisible();
  }
});

test("random forwards the query and opens a matching card", async ({ page }) => {
  const query = "type:legend c:fury";
  const chosen = page.waitForResponse((response) => new URL(response.url()).pathname === "/cards/random");

  await page.goto(`/random?${new URLSearchParams({ q: query })}`);

  const response = await chosen;
  expect(new URL(response.url()).searchParams.get("q")).toBe(query);
  const { data } = (await response.json()) as { data: { id: string; type: string; domains: string[] } };
  expect(data.type).toBe("legend");
  expect(data.domains).toContain("fury");
  await expect(page).toHaveURL(`/cards/${data.id}`);
  await expect(page.getByRole("article")).toBeVisible();
});

test("a random query without matches says so and links back to search", async ({ page }) => {
  await page.goto("/random?q=cost:>999");

  await expect(page.getByRole("status")).toContainText("No cards match “cost:>999”.");
  await expect(page).toHaveTitle("No matching cards · Riftkeeper");
  await page.getByRole("link", { name: "Back to search" }).click();
  await expect(page).toHaveURL("/");
});

test("a failed random request shows an error and can be retried", async ({ page, browserConsole }) => {
  browserConsole.expect(failedResponse(500, "/cards/random"));
  await page.route(`${apiBase}/cards/random*`, (route) =>
    route.fulfill({ status: 500, json: { error: { code: "internal_error", message: "Internal server error" } } }),
  );
  await page.goto("/random");

  await expect(page.getByRole("alert")).toContainText("Could not choose a card");
  await page.unrouteAll();
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(page).toHaveURL(/\/cards\/[a-z0-9-]+$/);
  await expect(page.getByRole("article")).toBeVisible();
});
