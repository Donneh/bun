import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { DEFAULT_LOAD_TIMEOUT_MS } from "../verify-live/arguments.ts";
import { checkPage, checkSite, type PageCheck, problems } from "../verify-live/verify-live.ts";
import { expect, test } from "./browser-console.ts";

const FIXTURE_LOAD_TIMEOUT_MS = 2_000;

const FIXTURE_PAGES: Record<string, string> = {
  "/clean": "<h1>Clean</h1>",
  "/console-error": '<h1>Console error</h1><script>console.error("fixture broke")</script>',
  "/console-warning": '<h1>Console warning</h1><script>console.warn("fixture warned")</script>',
  "/page-error": '<h1>Page error</h1><script>throw new Error("fixture threw")</script>',
  "/missing-image": '<h1>Missing image</h1><img src="/no-such-image.png" alt="">',
  "/too-wide": '<h1>Too wide</h1><div style="width: 3000px; height: 10px"></div>',
  "/still-loading": '<h1>Loading results</h1><ul aria-busy="true"></ul>',
};

let fixtureServer: Server;
let fixtureUrl: string;

test.beforeAll(async () => {
  fixtureServer = createServer((request, response) => {
    const page = FIXTURE_PAGES[request.url ?? ""];
    response.writeHead(page === undefined ? 404 : 200, { "content-type": "text/html" });
    response.end(
      page === undefined ? "" : `<!doctype html><title>Fixture</title><link rel="icon" href="data:,">${page}`,
    );
  });
  await new Promise<void>((listening) => fixtureServer.listen(0, "127.0.0.1", listening));
  fixtureUrl = `http://127.0.0.1:${(fixtureServer.address() as AddressInfo).port}`;
});

test.afterAll(() => new Promise<void>((closed) => fixtureServer.close(() => closed())));

test.describe("verify:live", () => {
  test.skip(({ isMobile }) => isMobile, "verify:live opens its own desktop and phone pages");

  const fixtureCheck = (path: string): PageCheck => ({
    baseUrl: fixtureUrl,
    path,
    viewport: "desktop",
    colorScheme: "light",
    headers: {},
    outDir: test.info().outputPath("verify-live"),
    loadTimeoutMs: FIXTURE_LOAD_TIMEOUT_MS,
  });

  test("passes a clean page and saves its screenshot", async ({ browser }) => {
    const report = await checkPage(browser, fixtureCheck("/clean"));
    expect(problems(report)).toEqual([]);
    expect(report).toMatchObject({ status: 200, heading: "Clean" });
  });

  const failures = {
    "/console-error": "console error: fixture broke",
    "/console-warning": "console warning: fixture warned",
    "/page-error": "page error: fixture threw",
    "/missing-image": "failed request: 404 GET",
    "/too-wide": "the page scrolls sideways",
    "/still-loading": "did not finish loading",
    "/no-such-fixture": "page answered 404",
  };
  for (const [path, problem] of Object.entries(failures))
    test(`fails ${path}`, async ({ browser }) => {
      const report = await checkPage(browser, fixtureCheck(path));
      expect(problems(report).join("\n")).toContain(problem);
    });

  test("passes every default page of the app at every viewport and color scheme", async ({ browser, baseURL }) => {
    test.setTimeout(180_000);
    const reports = await checkSite(
      browser,
      {
        baseUrl: baseURL ?? "",
        paths: [],
        outDir: test.info().outputPath("verify-live"),
        headers: {},
        loadTimeoutMs: DEFAULT_LOAD_TIMEOUT_MS,
      },
      () => undefined,
    );
    expect(reports).toHaveLength(16);
    expect(reports.flatMap((report) => problems(report).map((problem) => `${report.path}: ${problem}`))).toEqual([]);
    expect(new Set(reports.map((report) => report.heading)).size).toBeGreaterThan(2);
  });
});
