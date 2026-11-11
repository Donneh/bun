import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { basename, join, relative } from "node:path";
import { type Browser, type BrowserContextOptions, devices, type Page } from "@playwright/test";
import { SEARCH_QUERY, type VerifyOptions } from "./arguments.ts";
import { type RejectedLine, type RequestedPaths, type ScreenshotRequest, samePath } from "./screenshot-request.ts";

export const UNKNOWN_PATH = "/no-such-page";
export const REPORTS_FILE = "reports.json";
export const REQUESTED_PATHS_FILE = "requested-paths.json";
const SCROLL_PAUSE_MS = 150;
const JPEG_QUALITY = 80;
const SLUG_LENGTH = 60;

export const VIEWPORTS = {
  desktop: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 900 } },
  "pixel-7": devices["Pixel 7"],
} satisfies Record<string, BrowserContextOptions>;

export const COLOR_SCHEMES = ["light", "dark"] as const;

export type ViewportName = keyof typeof VIEWPORTS;
export type ColorScheme = (typeof COLOR_SCHEMES)[number];

export interface PageCheck {
  readonly baseUrl: string;
  readonly path: string;
  readonly viewport: ViewportName;
  readonly colorScheme: ColorScheme;
  readonly headers: Readonly<Record<string, string>>;
  readonly outDir: string;
  readonly loadTimeoutMs: number;
}

export interface PageReport {
  readonly path: string;
  readonly viewport: ViewportName;
  readonly colorScheme: ColorScheme;
  readonly status: number | null;
  readonly heading: string | null;
  readonly finishedLoading: boolean;
  readonly loadTimeoutMs: number;
  readonly consoleErrors: readonly string[];
  readonly consoleWarnings: readonly string[];
  readonly pageErrors: readonly string[];
  readonly failedRequests: readonly string[];
  readonly scrollsSideways: boolean;
  readonly screenshot: string;
  readonly firstScreen: string;
  readonly fullPage: string;
}

export interface SavedReport {
  readonly path: string;
  readonly viewport: ViewportName;
  readonly colorScheme: ColorScheme;
  readonly screenshot: string;
  readonly firstScreen: string;
  readonly fullPage: string;
  readonly problems: readonly string[];
}

export function problems(report: PageReport): string[] {
  return [
    ...(report.status === null || report.status >= 400 ? [`page answered ${report.status ?? "nothing"}`] : []),
    ...(report.finishedLoading ? [] : [`did not finish loading within ${report.loadTimeoutMs} ms`]),
    ...report.consoleErrors.map((message) => `console error: ${message}`),
    ...report.consoleWarnings.map((message) => `console warning: ${message}`),
    ...report.pageErrors.map((message) => `page error: ${message}`),
    ...report.failedRequests.map((request) => `failed request: ${request}`),
    ...(report.scrollsSideways ? ["the page scrolls sideways"] : []),
  ];
}

export function formatReport(report: PageReport): string {
  const found = problems(report);
  const line = [
    found.length === 0 ? "PASS" : "FAIL",
    report.viewport.padEnd(7),
    report.colorScheme.padEnd(5),
    String(report.status ?? "---"),
    report.path,
    `h1=${JSON.stringify(report.heading)}`,
    relative(process.cwd(), report.screenshot),
  ].join("  ");
  return [line, ...found.map((problem) => `      ${problem}`)].join("\n");
}

function screenshotStem(path: string, viewport: ViewportName, colorScheme: ColorScheme): string {
  const slug = decodeURIComponent(path)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .slice(0, SLUG_LENGTH)
    .replace(/^-|-$/g, "");
  const hash = createHash("sha256").update(path).digest("hex").slice(0, 8);
  return `${slug || "home"}-${hash}-${viewport}-${colorScheme}`;
}

function searchPath(query: string): string {
  return `/?q=${encodeURIComponent(query)}`;
}

async function firstCardPath(
  browser: Browser,
  baseUrl: string,
  headers: Readonly<Record<string, string>>,
  query: string,
): Promise<string | undefined> {
  const context = await browser.newContext({ baseURL: baseUrl, extraHTTPHeaders: headers });
  try {
    const page = await context.newPage();
    const searchResponse = page.waitForResponse((response) => new URL(response.url()).pathname === "/search");
    await page.goto(searchPath(query));
    const { data } = (await (await searchResponse).json()) as { data?: { id: string }[] };
    const card = data?.[0];
    return card === undefined ? undefined : `/cards/${encodeURIComponent(card.id)}`;
  } finally {
    await context.close();
  }
}

export async function defaultPaths(browser: Browser, baseUrl: string, headers: Readonly<Record<string, string>>) {
  const cardPath = await firstCardPath(browser, baseUrl, headers, SEARCH_QUERY);
  if (cardPath === undefined) throw new Error(`The search ${SEARCH_QUERY} on ${baseUrl} found no card to check`);
  return ["/", searchPath(SEARCH_QUERY), cardPath, UNKNOWN_PATH];
}

export async function resolveRequestedPaths(
  browser: Browser,
  baseUrl: string,
  request: ScreenshotRequest,
  shownPaths: readonly string[],
): Promise<RequestedPaths> {
  const paths: string[] = [];
  const rejected: RejectedLine[] = [...request.rejected];
  for (const page of request.pages) {
    const path =
      "path" in page ? page.path : await firstCardPath(browser, baseUrl, {}, page.cardSearch).catch(() => undefined);
    if (path === undefined) rejected.push({ line: page.line, reason: "no-card" });
    else if ([...shownPaths, ...paths].some((shown) => samePath(shown, path)))
      rejected.push({ line: page.line, reason: "duplicate" });
    else paths.push(path);
  }
  return { paths, rejected };
}

export async function checkPage(browser: Browser, check: PageCheck): Promise<PageReport> {
  const context = await browser.newContext({
    ...VIEWPORTS[check.viewport],
    colorScheme: check.colorScheme,
    baseURL: check.baseUrl,
    extraHTTPHeaders: check.headers,
  });
  try {
    const page = await context.newPage();
    const consoleErrors: string[] = [];
    const consoleWarnings: string[] = [];
    const pageErrors: string[] = [];
    const failedRequests: string[] = [];
    page.on("console", (message) => {
      const text = `${message.text()} (${message.location().url})`;
      if (message.type() === "error") consoleErrors.push(text);
      if (message.type() === "warning") consoleWarnings.push(text);
    });
    page.on("pageerror", (error) => pageErrors.push(error.message));
    page.on("requestfailed", (request) =>
      failedRequests.push(`${request.failure()?.errorText ?? "failed"} ${request.method()} ${request.url()}`),
    );
    page.on("response", (response) => {
      if (response.status() >= 400)
        failedRequests.push(`${response.status()} ${response.request().method()} ${response.url()}`);
    });

    const response = await page.goto(check.path);
    const viewportHeight = await page.evaluate(() => window.innerHeight);
    const firstScreenLoaded = await waitUntilLoaded(page, viewportHeight, check.loadTimeoutMs);
    const pageHeight = await page.evaluate(() => document.documentElement.scrollHeight);
    await scrollThrough(page, pageHeight, viewportHeight);
    const finishedLoading = firstScreenLoaded && (await waitUntilLoaded(page, pageHeight, check.loadTimeoutMs));
    await page.evaluate(() => window.scrollTo(0, 0));
    const heading = await page
      .locator("h1")
      .first()
      .textContent({ timeout: 1_000 })
      .catch(() => null);
    const scrollsSideways = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    await mkdir(check.outDir, { recursive: true });
    const stem = join(check.outDir, screenshotStem(check.path, check.viewport, check.colorScheme));
    const screenshot = `${stem}.png`;
    const firstScreen = `${stem}-first-screen.jpg`;
    const fullPage = `${stem}-full-page.jpg`;
    await page.screenshot({ path: firstScreen, type: "jpeg", quality: JPEG_QUALITY, scale: "css" });
    await page.screenshot({ path: fullPage, type: "jpeg", quality: JPEG_QUALITY, scale: "css", fullPage: true });
    await page.screenshot({ path: screenshot, fullPage: true });

    return {
      path: check.path,
      viewport: check.viewport,
      colorScheme: check.colorScheme,
      status: response?.status() ?? null,
      heading: heading?.trim() ?? null,
      finishedLoading,
      loadTimeoutMs: check.loadTimeoutMs,
      consoleErrors,
      consoleWarnings,
      pageErrors,
      failedRequests,
      scrollsSideways,
      screenshot,
      firstScreen,
      fullPage,
    };
  } finally {
    await context.close();
  }
}

export async function checkSite(browser: Browser, options: VerifyOptions, onReport: (report: PageReport) => void) {
  const paths =
    options.paths.length > 0 ? options.paths : await defaultPaths(browser, options.baseUrl, options.headers);
  const reports: PageReport[] = [];
  for (const path of paths)
    for (const viewport of Object.keys(VIEWPORTS) as ViewportName[])
      for (const colorScheme of COLOR_SCHEMES) {
        const report = await checkPage(browser, { ...options, path, viewport, colorScheme });
        reports.push(report);
        onReport(report);
      }
  await writeFile(join(options.outDir, REPORTS_FILE), JSON.stringify(reports.map(savedReport), null, 2));
  return reports;
}

function savedReport(report: PageReport): SavedReport {
  return {
    path: report.path,
    viewport: report.viewport,
    colorScheme: report.colorScheme,
    screenshot: basename(report.screenshot),
    firstScreen: basename(report.firstScreen),
    fullPage: basename(report.fullPage),
    problems: problems(report),
  };
}

async function scrollThrough(page: Page, pageHeight: number, viewportHeight: number) {
  for (let top = viewportHeight; top < pageHeight; top += viewportHeight) {
    await page.evaluate((y) => window.scrollTo(0, y), top);
    await page.waitForTimeout(SCROLL_PAUSE_MS);
  }
}

async function waitUntilLoaded(page: Page, imagesAbove: number, timeoutMs: number): Promise<boolean> {
  return page
    .waitForFunction(
      (imagesAbove) => {
        const isLoadingLabel = (text: string | null | undefined) => /^\s*loading\b/i.test(text ?? "");
        const headings = [...document.querySelectorAll("h1")];
        const imagesToLoad = [...document.images].filter((image) => {
          const box = image.getBoundingClientRect();
          return box.width > 0 && box.top + window.scrollY < imagesAbove;
        });
        return (
          document.readyState === "complete" &&
          document.fonts.status === "loaded" &&
          headings.length > 0 &&
          !headings.some((heading) => isLoadingLabel(heading.textContent)) &&
          !document.querySelector('[aria-busy="true"]') &&
          ![...document.querySelectorAll("[aria-label]")].some((element) =>
            isLoadingLabel(element.getAttribute("aria-label")),
          ) &&
          imagesToLoad.every((image) => image.complete)
        );
      },
      imagesAbove,
      { timeout: timeoutMs, polling: 100 },
    )
    .then(() => true)
    .catch(() => false);
}
