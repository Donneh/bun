import { type ExpectedMessage, expect, test } from "./browser-console.ts";

const fixtureWarning: ExpectedMessage = {
  description: "the fixture's warning",
  kind: "console warning",
  pattern: /^fixture warning$/,
};

test.describe("the browser console check", () => {
  test("passes a test whose expected messages all appear", async ({ page, browserConsole }) => {
    browserConsole.expect(fixtureWarning);
    await page.evaluate(() => console.warn("fixture warning"));
  });

  test("fails a test on a console warning it does not expect", async ({ page }) => {
    test.fail();
    await page.evaluate(() => console.warn("fixture warning"));
  });

  test("fails a test on a console error it does not expect", async ({ page }) => {
    test.fail();
    await page.evaluate(() => console.error("fixture error"));
  });

  test("fails a test on a page error", async ({ page }) => {
    test.fail();
    await page.setContent('<script>throw new Error("fixture threw")</script>');
  });

  test("fails a test on a request that fails", async ({ page }) => {
    test.fail();
    await page.route("http://fixture.invalid/", (route) => route.abort("connectionrefused"));
    await page.evaluate(() => fetch("http://fixture.invalid/").catch(() => null));
  });

  test("fails a test whose expected message does not appear", async ({ page, browserConsole }) => {
    test.fail();
    browserConsole.expect(fixtureWarning);
    await expect(page).toHaveURL("about:blank");
  });
});
