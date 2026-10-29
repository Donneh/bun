import { describe, expect, test } from "bun:test";
import { cards } from "./card-snapshot.ts";

describe("card snapshot", () => {
  test("the committed snapshot parses into cards", () => {
    expect(cards.length).toBeGreaterThan(0);
  });
});
