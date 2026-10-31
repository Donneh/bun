import { describe, expect, test } from "bun:test";
import { type E2eResult, pullRequestComment } from "../verify-live/pull-request-comment.ts";
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
      problems: problems[`${viewport}-${colorScheme}`] ?? [],
    })),
  );
}

describe("pullRequestComment", () => {
  const comment = (reports: SavedReport[], e2eResult: E2eResult = "success") =>
    pullRequestComment({ reports, imageBaseUrl: IMAGES, commit: "0123456789abcdef", runUrl: RUN, e2eResult });

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
});
