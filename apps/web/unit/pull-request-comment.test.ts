import { describe, expect, test } from "bun:test";
import { pullRequestComment } from "../verify-live/pull-request-comment.ts";
import type { SavedReport } from "../verify-live/verify-live.ts";

const IMAGES = "https://raw.githubusercontent.com/owner/repo/abc123/0123456789abcdef";
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
  const comment = (reports: SavedReport[]) =>
    pullRequestComment({ reports, imageBaseUrl: IMAGES, commit: "0123456789abcdef", runUrl: RUN });

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

  test("lists the problems of failed pages under their screenshots", () => {
    const text = comment(reportsFor("/", "home", { "pixel-7-dark": ["the page scrolls sideways"] }));
    expect(text).toContain("1 of 4 pages failed");
    expect(text).toContain("- Pixel 7 dark: the page scrolls sideways");
  });
});
