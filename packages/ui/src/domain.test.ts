import { describe, expect, test } from "vitest";
import { domainScope } from "./domain.ts";

describe("domainScope", () => {
  test("colors a one-domain card with its domain twice", () => {
    expect(domainScope(["fury"])).toEqual({
      "data-rk-domain": "fury",
      style: {
        "--rk-color-domain": "var(--rk-color-domain-fury)",
        "--rk-color-domain-second": "var(--rk-color-domain-fury)",
      },
    });
  });

  test("gives a two-domain card a second color", () => {
    expect(domainScope(["mind", "order"]).style["--rk-color-domain-second"]).toBe("var(--rk-color-domain-order)");
  });

  test("falls back to the colorless neutral for a card without a domain", () => {
    expect(domainScope([])["data-rk-domain"]).toBe("colorless");
  });
});
