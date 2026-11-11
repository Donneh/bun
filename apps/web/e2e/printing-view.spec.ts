import { expect, test } from "./browser-console.ts";

test("printing view is the default and the view selector survives navigation", async ({ page }) => {
  await page.goto("/?sort=rarity");
  const cardsButton = page.getByRole("button", { name: "Cards", exact: true });
  const printingsButton = page.getByRole("button", { name: "Printings", exact: true });
  const results = page.getByRole("list", { name: "Search results" });
  await expect(printingsButton).toHaveAttribute("aria-pressed", "true");
  const link = results.getByRole("link").first();
  await expect(link).toHaveAttribute("href", /\?printing=/);
  const href = await link.getAttribute("href");
  const printing = new URL(href ?? "", page.url()).searchParams.get("printing");
  await link.click();
  await expect.poll(() => new URL(page.url()).searchParams.get("printing")).toBe(printing);
  await expect(page.getByRole("list", { name: "Printings" }).getByRole("button", { pressed: true })).toHaveCount(1);
  await page.goBack();
  await expect(printingsButton).toHaveAttribute("aria-pressed", "true");
  await cardsButton.click();
  await expect.poll(() => new URL(page.url()).searchParams.get("view")).toBe("cards");
  await expect(results.getByRole("link").first()).toHaveAttribute("href", /^\/cards\/[^?]+$/);
  await page.reload();
  await expect(cardsButton).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("combobox", { name: "Sort by" })).toHaveValue("rarity");
});
