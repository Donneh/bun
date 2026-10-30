import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { type ExpectedMessage, expect, test } from "./browser-console.ts";

const fixtureWarning: ExpectedMessage = {
  description: "the fixture's warning",
  kind: "console warning",
  pattern: /^fixture warning$/,
};

const FIXTURE_URL = "http://fixture.invalid/";

const refusedConnectionLog: ExpectedMessage = {
  description: "the browser logs the refused connection",
  kind: "console error",
  pattern: /^Failed to load resource: net::ERR_CONNECTION_REFUSED/,
};

const refusedConnection: ExpectedMessage = {
  description: "the refused request",
  kind: "failed request",
  pattern: /^net::ERR_CONNECTION_REFUSED GET http:\/\/fixture\.invalid\/$/,
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

  test("fails a test on a request that fails", async ({ page, browserConsole }) => {
    test.fail();
    browserConsole.expect(refusedConnectionLog);
    await page.route(FIXTURE_URL, (route) => route.abort("connectionrefused"));
    await page.evaluate((url) => fetch(url).catch(() => null), FIXTURE_URL);
  });

  test("passes a test whose only failed request is the one it expects", async ({ page, browserConsole }) => {
    browserConsole.expect(refusedConnectionLog, refusedConnection);
    await page.route(FIXTURE_URL, (route) => route.abort("connectionrefused"));
    await page.evaluate((url) => fetch(url).catch(() => null), FIXTURE_URL);
  });

  test("ignores a request the browser aborts", async ({ page }) => {
    let requestArrived: () => void = () => undefined;
    const arrived = new Promise<void>((resolve) => {
      requestArrived = resolve;
    });
    const server = createServer((request, response) => {
      if (request.url === "/slow") {
        requestArrived();
        return;
      }
      response.writeHead(200, { "content-type": "text/html" });
      response.end('<!doctype html><link rel="icon" href="data:,"><p>Fixture</p>');
    });
    await new Promise<void>((listening) => server.listen(0, "127.0.0.1", listening));
    const origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    try {
      await page.goto(`${origin}/`);
      const aborted = page.waitForEvent("requestfailed", (request) => request.url() === `${origin}/slow`);
      await page.evaluate(() => {
        const controller = new AbortController();
        Object.assign(window, { abortSlowRequest: () => controller.abort() });
        void fetch("/slow", { signal: controller.signal }).catch(() => null);
      });
      await arrived;

      await page.evaluate(() => (window as unknown as { abortSlowRequest: () => void }).abortSlowRequest());

      expect((await aborted).failure()?.errorText).toBe("net::ERR_ABORTED");
    } finally {
      server.closeAllConnections();
      server.close();
    }
  });

  test("fails a test whose expected message does not appear", async ({ page, browserConsole }) => {
    test.fail();
    browserConsole.expect(fixtureWarning);
    await expect(page).toHaveURL("about:blank");
  });
});
