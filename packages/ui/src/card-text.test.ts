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

  test("turns energy, rune, might and exhaust symbols into glyphs", () => {
    const glyphs = parseCardText(":rb_energy_2::rb_rune_fury: :rb_rune_rainbow: :rb_might: :rb_exhaust:").filter(
      (part) => part.kind === "glyph",
    );

    expect(glyphs).toEqual([
      { kind: "glyph", name: "energy_2" },
      { kind: "glyph", name: "rune_fury" },
      { kind: "glyph", name: "rune_rainbow" },
      { kind: "glyph", name: "might" },
      { kind: "glyph", name: "exhaust" },
    ]);
  });

  test("spells out a symbol it has no glyph for", () => {
    expect(parseCardText("Pay :rb_new_thing:.")).toEqual([
      { kind: "text", text: "Pay " },
      { kind: "text", text: "new thing" },
      { kind: "text", text: "." },
    ]);
  });
});
