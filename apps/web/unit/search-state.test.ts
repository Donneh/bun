import { describe, expect, test } from "bun:test";
import { parseSearchState, SORT_OPTIONS, searchStateKey, toRouteQuery } from "../app/utils/search-state.ts";

describe("parseSearchState", () => {
  test("defaults to the set order, ascending", () => {
    expect(parseSearchState({})).toEqual({ query: "", sort: "set", direction: "asc" });
  });

  test("reads the query, sort and direction", () => {
    expect(parseSearchState({ q: " c:fury ", sort: "might", direction: "desc" })).toEqual({
      query: "c:fury",
      sort: "might",
      direction: "desc",
    });
  });

  test("falls back to the defaults for unknown or repeated values", () => {
    expect(parseSearchState({ q: ["a", "b"], sort: "price", direction: ["desc"] })).toEqual({
      query: "",
      sort: "set",
      direction: "asc",
    });
  });

  test("ignores page, so a shared link always opens the first page", () => {
    const withPage = parseSearchState({ q: "c:fury", sort: "name", page: "3" });

    expect(withPage).toEqual(parseSearchState({ q: "c:fury", sort: "name" }));
    expect(toRouteQuery(withPage)).not.toHaveProperty("page");
  });
});

describe("toRouteQuery", () => {
  test("leaves the defaults out of the URL", () => {
    expect(toRouteQuery({ query: "c:fury", sort: "set", direction: "asc" })).toEqual({ q: "c:fury" });
    expect(toRouteQuery({ query: "", sort: "set", direction: "asc" })).toEqual({});
  });

  test("round-trips every sort key and direction", () => {
    for (const { value } of SORT_OPTIONS) {
      for (const direction of ["asc", "desc"] as const) {
        const state = parseSearchState({ q: "type:unit", sort: value, direction });
        expect(parseSearchState(toRouteQuery(state))).toEqual(state);
      }
    }
  });
});

describe("searchStateKey", () => {
  test("changes with the query, the sort and the direction", () => {
    const keys = new Set(
      [
        { query: "a", sort: "set", direction: "asc" },
        { query: "b", sort: "set", direction: "asc" },
        { query: "a", sort: "name", direction: "asc" },
        { query: "a", sort: "set", direction: "desc" },
      ].map((state) => searchStateKey(parseSearchState({ q: state.query, ...state }))),
    );

    expect(keys.size).toBe(4);
  });
});

describe("SORT_OPTIONS", () => {
  test("offers every sort the API accepts", () => {
    expect(SORT_OPTIONS.map((option) => option.label)).toEqual([
      "Set",
      "Collector number",
      "Name",
      "Rarity",
      "Cost",
      "Might",
      "Power",
    ]);
  });
});
