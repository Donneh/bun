import { describe, expect, test } from "bun:test";
import { type SearchResults, searchView } from "../app/utils/search-view.ts";

function results(name: string): SearchResults {
  return {
    kind: "results",
    cards: [
      {
        id: name,
        name,
        subtitle: null,
        imageUrl: `https://example.com/${name}.png`,
        orientation: "portrait",
        href: `/cards/${name}`,
      },
    ],
    page: 1,
    total: 1,
    hasMore: false,
    warnings: [],
    parsed: { query: name, filters: [], hasAdvancedConditions: true },
  };
}

describe("searchView", () => {
  test("shows settled results as current", () => {
    expect(searchView(results("jinx"), results("vi"))).toEqual({ ...results("jinx"), stale: false });
  });

  test("keeps the previous results as stale while a search is pending", () => {
    expect(searchView(null, results("vi"))).toEqual({ ...results("vi"), stale: true });
  });

  test("loads from scratch when there is nothing to keep", () => {
    expect(searchView(null, null)).toEqual({ kind: "loading" });
  });

  test("shows a failed search over the previous results", () => {
    expect(searchView({ kind: "error", message: "Internal server error" }, results("vi"))).toEqual({
      kind: "error",
      message: "Internal server error",
    });
  });
});
