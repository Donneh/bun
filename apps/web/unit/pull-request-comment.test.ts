import { describe, expect, test } from "bun:test";
import { type E2eResult, pullRequestComment } from "../verify-live/pull-request-comment.ts";
import {
  MAX_REQUESTED_PAGES,
  NO_REQUESTED_PATHS,
  type RejectedLine,
  type RequestedPaths,
} from "../verify-live/screenshot-request.ts";
import type { SavedReport } from "../verify-live/verify-live.ts";

const IMAGES = "https://raw.githubusercontent.com/owner/repo/abc123";
const RUN = "https://github.com/owner/repo/actions/runs/1";

function reportsFor(path: string, slug: string, problems: Partial<Record<string, string[]>> = {}): SavedReport[] {
  return (["desktop", "pixel-7"] as const).flatMap((viewport) =>
    (["light", "dark"] as const).map((colorScheme) => ({
      path,
      viewport,
      colorScheme,
      screenshot: `${slug}-${viewport}-${colorScheme}.png`,
      firstScreen: `${slug}-${viewport}-${colorScheme}-first-screen.jpg`,
      fullPage: `${slug}-${viewport}-${colorScheme}-full-page.jpg`,
      problems: problems[`${viewport}-${colorScheme}`] ?? [],
    })),
  );
}

describe("pullRequestComment", () => {
  const comment = (
    reports: SavedReport[],
    e2eResult: E2eResult = "success",
    requested: RequestedPaths = NO_REQUESTED_PATHS,
  ) =>
    pullRequestComment({
      reports,
      imageBaseUrl: IMAGES,
      commit: "0123456789abcdef",
      runUrl: RUN,
      e2eResult,
      requested,
    });

  test("shows only the first screen of the default pages, and the full page too of the pages the pull request names", () => {
    const text = comment([...reportsFor("/", "home"), ...reportsFor("/cards/x", "cards-x")], "success", {
      paths: ["/cards/x"],
      rejected: [],
    });
    expect(text).toContain("The page named in the pull request's `screenshots` block also shows the full page.");
    expect(text).not.toContain("home-desktop-light-full-page.jpg");
    expect(text).toContain("### `/cards/x`\n\n|  | Desktop light | Desktop dark | Pixel 7 light | Pixel 7 dark |\n");
    expect(text).toContain(`| First screen | <a href="${IMAGES}/cards-x-desktop-light-first-screen.jpg">`);
    expect(text).toContain(`| Full page | <a href="${IMAGES}/cards-x-desktop-light-full-page.jpg">`);
  });

  test("names the lines of the screenshots block that show no page and why, as code", () => {
    const rejected: RejectedLine[] = [
      { line: "open the filter menu", reason: "not-a-path" },
      { line: "https://evil.example/ [x](https://evil.example) <img src=x>", reason: "not-a-path" },
      { line: "/x\u0000‮@owner", reason: "unreadable" },
      { line: `/${"a".repeat(300)}`, reason: "too-long" },
      { line: "/favicon.ico", reason: "file" },
      { line: "/page-7", reason: "over-limit" },
      { line: "/page-8", reason: "over-limit" },
    ];
    const text = comment(reportsFor("/", "home"), "success", { paths: [], rejected });
    expect(text).toContain("- `open the filter menu`: it is not a path on this site starting with `/`.");
    expect(text).toContain("an open filter, a hover, or a loading or error state, cannot be shown yet.");
    expect(text).toContain("- `https://evil.example/ [x](https://evil.example) <img src=x>`: it is not a path");
    expect(text).toContain("- `/x��@owner`: it contains control characters");
    expect(text).toContain(`- \`/${"a".repeat(99)}…\`: it is longer than 200 characters.`);
    expect(text).toContain("- `/favicon.ico`: it names a file, not a page.");
    expect(text).not.toContain("/page-7");
    expect(text).toContain("- 2 more\n");
  });

  test("shows each page in a row of desktop and phone screenshots in light and dark", () => {
    const text = comment([...reportsFor("/", "home"), ...reportsFor("/?q=c%3Afury", "q-c-fury")]);
    expect(text).toContain("### `/`\n");
    expect(text).toContain("### `/?q=c:fury`\n");
    expect(text).toContain("| Desktop light | Desktop dark | Pixel 7 light | Pixel 7 dark |");
    expect(text).toContain(`<img src="${IMAGES}/home-pixel-7-dark-first-screen.jpg"`);
    expect(text).toContain(`<a href="${IMAGES}/q-c-fury-desktop-light-first-screen.jpg">`);
    expect(text).toContain("All 8 pages passed");
    expect(text).toContain("0123456");
    expect(text).toContain(`(${RUN})`);
  });

  test("says whether the E2E tests passed", () => {
    expect(comment(reportsFor("/", "home"), "success")).toContain("The E2E tests passed.");
    const failed = comment(reportsFor("/", "home"), "failure");
    expect(failed).toContain("**The E2E tests failed.**");
    expect(failed).not.toContain("The E2E tests passed.");
  });

  test("lists the problems of failed pages under their screenshots", () => {
    const text = comment(reportsFor("/", "home", { "pixel-7-dark": ["the page scrolls sideways"] }));
    expect(text).toContain("1 of 4 pages failed");
    expect(text).toContain("- Pixel 7 dark: `the page scrolls sideways`");
  });

  test("shows the first line of at most three problems per page", () => {
    const problems = [
      "page error: boom\n    at x (app.js:1)\n# Heading injected",
      "console error: <script>",
      "failed request: 404 GET /a",
      "failed request: 404 GET /b",
      "failed request: 404 GET /c",
    ];
    const text = comment(reportsFor("/", "home", { "desktop-light": problems }));
    expect(text).toContain("- Desktop light: `page error: boom`");
    expect(text).not.toContain("# Heading injected");
    expect(text).toContain("`console error: <script>`");
    expect(text).not.toContain("GET /b");
    expect(text).toContain("- Desktop light: 2 more in the run log");
  });

  test("shows markdown in a problem as code, not as formatting or links", () => {
    const problem = "console error: Failed to load @nuxt/kit __init__ *x* [link](https://evil.example) #1";
    const text = comment(reportsFor("/", "home", { "desktop-light": [problem] }));
    expect(text).toContain(`- Desktop light: \`${problem}\`\n`);
  });

  test("fences a problem that contains backticks with a longer run of backticks", () => {
    const text = comment(reportsFor("/", "home", { "desktop-light": ["`a` and ``b``"] }));
    expect(text).toContain("- Desktop light: ``` `a` and ``b`` ```");
  });

  test("stays under GitHub's comment limit when every page has many problems", () => {
    const problems = Array.from({ length: 200 }, (_, index) => `failed request: ${'`*_[](<>&"'.repeat(60)} ${index}`);
    const reports = ["/", "/a", "/b", "/c"].flatMap((path) =>
      reportsFor(path, path, {
        "desktop-light": problems,
        "desktop-dark": problems,
        "pixel-7-light": problems,
        "pixel-7-dark": problems,
      }),
    );
    expect(comment(reports).length).toBeLessThan(65_536);
  });

  test("stays under GitHub's comment limit with every page the pull request may add, each with many problems, and still counts the problems", () => {
    const problems = Array.from({ length: 200 }, (_, index) => `failed request: ${"x".repeat(400)} ${index}`);
    const requestedPaths = Array.from({ length: MAX_REQUESTED_PAGES }, (_, index) => `/${"p".repeat(199)}${index}`);
    const paths = ["/", "/a", "/b", "/c", ...requestedPaths];
    const reports = paths.flatMap((path) =>
      reportsFor(path, `${"s".repeat(60)}-0123abcd`, {
        "desktop-light": problems,
        "desktop-dark": problems,
        "pixel-7-light": problems,
        "pixel-7-dark": problems,
      }),
    );
    const rejected = Array.from({ length: 1000 }, () => ({ line: "/x".repeat(100), reason: "over-limit" as const }));
    const text = comment(reports, "success", { paths: requestedPaths, rejected });
    expect(text.length).toBeLessThan(65_536);
    expect(text).toContain("- Pixel 7 dark: 200 problems in the run log");
    expect(text).toContain(`${"s".repeat(60)}-0123abcd-pixel-7-dark-full-page.jpg`);
  });
});
