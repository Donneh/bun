import { describe, expect, test } from "bun:test";
import { compareStrings } from "./compare-strings.ts";

describe("compareStrings", () => {
  test("orders by UTF-16 code unit regardless of locale", () => {
    expect(["b", "B", "a", "é", "z"].sort(compareStrings)).toEqual(["B", "a", "b", "z", "é"]);
  });

  test("returns 0 for equal strings", () => {
    expect(compareStrings("ahri", "ahri")).toBe(0);
  });
});
