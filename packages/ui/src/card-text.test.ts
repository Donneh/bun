import { describe, expect, test } from "vitest";
import { parseCardText } from "./card-text.ts";

describe("parseCardText", () => {
  test("keeps plain text as one part", () => {
    expect(parseCardText("Draw a card.")).toEqual([{ kind: "text", text: "Draw a card." }]);
  });

  test("marks keywords in brackets", () => {
    expect(parseCardText("[Ganking] (I can move.)")).toEqual([
      { kind: "keyword", text: "Ganking" },
      { kind: "text", text: " (I can move.)" },
    ]);
  });

  test("leaves brackets that do not hold a word as text", () => {
    expect(parseCardText("[>] I have +1.")).toEqual([{ kind: "text", text: "[>] I have +1." }]);
  });

  test("names energy, rune, might and exhaust symbols", () => {
    const symbols = parseCardText(":rb_energy_2::rb_rune_fury: :rb_rune_rainbow: :rb_might: :rb_exhaust:").filter(
      (part) => part.kind === "symbol",
    );

    expect(symbols).toEqual([
      { kind: "symbol", text: "2", label: "2 energy", round: true },
      { kind: "symbol", text: "fury rune", label: "fury rune", round: false },
      { kind: "symbol", text: "any rune", label: "Rune of any domain", round: false },
      { kind: "symbol", text: "might", label: "Might", round: false },
      { kind: "symbol", text: "exhaust", label: "Exhaust", round: false },
    ]);
  });

  test("spells out a symbol it does not know", () => {
    expect(parseCardText(":rb_new_thing:")).toEqual([
      { kind: "symbol", text: "new thing", label: "new thing", round: false },
    ]);
  });
});
