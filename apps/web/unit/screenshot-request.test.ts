import { describe, expect, test } from "bun:test";
import { SEARCH_QUERY } from "../verify-live/arguments.ts";
import { MAX_REQUESTED_PAGES, parseScreenshotRequest } from "../verify-live/screenshot-request.ts";

const block = (...lines: string[]) =>
  ["Some description.", "", "```screenshots", ...lines, "```", "", "More text."].join("\n");

describe("parseScreenshotRequest", () => {
  test("asks for no pages when the body has no screenshots block", () => {
    expect(parseScreenshotRequest("")).toEqual({ pages: [], rejected: [] });
    expect(parseScreenshotRequest("```\n/cards/x\n```\n```ts\n/cards/y\n```")).toEqual({ pages: [], rejected: [] });
  });

  test("reads each path of the block, percent-encoded the way a browser requests it", () => {
    const request = parseScreenshotRequest(block("/?q=c:calm cost:<=2", "", "  /cards/some-card  ", "/sets#top"));
    expect(request.pages).toEqual([
      { line: "/?q=c:calm cost:<=2", path: "/?q=c:calm%20cost:%3C=2" },
      { line: "/cards/some-card", path: "/cards/some-card" },
      { line: "/sets#top", path: "/sets#top" },
    ]);
    expect(request.rejected).toEqual([]);
  });

  test("reads a block with Windows line endings and every block of the body", () => {
    const body = `${block("/a")}\r\n\r\n\`\`\`screenshots\r\n/b\r\n\`\`\`\r\n`;
    expect(parseScreenshotRequest(body).pages.map((page) => "path" in page && page.path)).toEqual(["/a", "/b"]);
  });

  test("resolves a card placeholder through a search, the default search when none is given", () => {
    expect(parseScreenshotRequest(block("/cards/{card}", "/cards/{card: c:calm type:unit }")).pages).toEqual([
      { line: "/cards/{card}", cardSearch: SEARCH_QUERY },
      { line: "/cards/{card: c:calm type:unit }", cardSearch: "c:calm type:unit" },
    ]);
  });

  test("rejects anything that could lead to another site", () => {
    const lines = [
      "https://evil.example/",
      "//evil.example/path",
      "/\\evil.example",
      "javascript:alert(1)",
      "evil.example/cards/x",
    ];
    const request = parseScreenshotRequest(block(...lines));
    expect(request.pages).toEqual([]);
    expect(request.rejected).toEqual(lines.map((line) => ({ line, reason: "not-a-path" })));
  });

  test("rejects lines that are not paths, such as states that need interaction", () => {
    expect(parseScreenshotRequest(block("the filter menu, open", "/cards/{card:}")).rejected).toEqual([
      { line: "the filter menu, open", reason: "not-a-path" },
      { line: "/cards/{card:}", reason: "not-a-path" },
    ]);
  });

  test("rejects files, which are not pages of the app", () => {
    expect(parseScreenshotRequest(block("/favicon.ico", "/_nuxt/entry.js", "/200.html")).rejected).toEqual([
      { line: "/favicon.ico", reason: "file" },
      { line: "/_nuxt/entry.js", reason: "file" },
      { line: "/200.html", reason: "file" },
    ]);
  });

  test("rejects control characters and percent-encoding that decodes to them or to nothing", () => {
    const lines = ["/a\tb", "/a​b", "/x%0A%0A<img src=x>", "/x%E0%A4%A", "/x%00"];
    expect(parseScreenshotRequest(block(...lines)).rejected).toEqual(
      lines.map((line) => ({ line, reason: "unreadable" })),
    );
  });

  test("rejects a path or a card search that is too long", () => {
    const long = "a".repeat(300);
    expect(parseScreenshotRequest(block(`/${long}`, `/cards/{card:${long}}`)).rejected).toEqual([
      { line: `/${long}`, reason: "too-long" },
      { line: `/cards/{card:${long}}`, reason: "too-long" },
    ]);
  });

  test("keeps markdown and HTML in a path as percent-encoded text of the path", () => {
    const { pages } = parseScreenshotRequest(block('/?q=<script>alert("x")</script>', "/a`b`**c**"));
    expect(pages.map((page) => "path" in page && page.path)).toEqual([
      "/?q=%3Cscript%3Ealert(%22x%22)%3C/script%3E",
      "/a%60b%60**c**",
    ]);
  });

  test(`takes at most ${MAX_REQUESTED_PAGES} pages and rejects duplicates and the rest`, () => {
    const paths = Array.from({ length: 1000 }, (_, index) => `/page-${index}`);
    const request = parseScreenshotRequest(block("/page-0", "/page-%30", ...paths));
    expect(request.pages.map((page) => "path" in page && page.path)).toEqual(paths.slice(0, MAX_REQUESTED_PAGES));
    expect(request.rejected.slice(0, 2)).toEqual([
      { line: "/page-%30", reason: "duplicate" },
      { line: "/page-0", reason: "duplicate" },
    ]);
    expect(request.rejected.filter((line) => line.reason === "over-limit")).toHaveLength(
      paths.length - MAX_REQUESTED_PAGES,
    );
  });

  test("reads an unclosed block to the end of the body, as Markdown renders it", () => {
    expect(parseScreenshotRequest("```screenshots\n/a\n/b").pages).toHaveLength(2);
  });
});
