import { expect, test } from "bun:test";
import { setReleaseRank } from "./set-order.ts";

test("ranks sets in release order", () => {
  const codes = ["RAD", "OGN", "VEN", "OGS", "UNL", "SFD"];

  expect(codes.toSorted((a, b) => setReleaseRank(a) - setReleaseRank(b))).toEqual([
    "OGS",
    "OGN",
    "SFD",
    "UNL",
    "VEN",
    "RAD",
  ]);
});

test("ranks an unknown set after every known set", () => {
  expect(setReleaseRank("NEW")).toBeGreaterThan(setReleaseRank("RAD"));
});
