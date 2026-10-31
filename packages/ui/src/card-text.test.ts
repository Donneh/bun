import { describe, expect, test } from "vitest";
import { parseCardText } from "./card-text.ts";

describe("parseCardText", () => {
  test("keeps plain text as one part", () => {
    expect(parseCardText("Draw a card.")).toEqual([{ kind: "text", text: "Draw a card." }]);
  });

  test("marks keywords in brackets", () => {
    expect(parseCardText("[Ganking] (I can move.)")).toEqual([
      { kind: "keyword", text: "Ganking", tone: "lime", arrow: false, joined: false, cost: [] },
      { kind: "text", text: " (I can move.)" },
    ]);
  });

  test("gives a keyword followed by [>] an arrow end", () => {
    expect(parseCardText("[Hunt 2] (Gain 2 XP.)\n[Level 3][>] I have +1.")).toEqual([
      { kind: "keyword", text: "Hunt 2", tone: "lime", arrow: false, joined: false, cost: [] },
      { kind: "text", text: " (Gain 2 XP.)\n" },
      { kind: "keyword", text: "Level 3", tone: "lime", arrow: true, joined: false, cost: [] },
      { kind: "text", text: " I have +1." },
    ]);
  });

  test("joins a keyword after [>>] to the arrow before it", () => {
    expect(parseCardText("[Empowered][>][>>][Deathknell][>] Channel 2 runes.")).toEqual([
      { kind: "keyword", text: "Empowered", tone: "lime", arrow: true, joined: false, cost: [] },
      { kind: "keyword", text: "Deathknell", tone: "lime", arrow: true, joined: true, cost: [] },
      { kind: "text", text: " Channel 2 runes." },
    ]);
  });

  test("drops the space before [>>] and keeps a cost after an arrow outside it", () => {
    const parts = parseCardText("[Level 6][>] [>>][Reaction][>] :rb_exhaust:: Draw.");

    expect(parts).toEqual([
      { kind: "keyword", text: "Level 6", tone: "lime", arrow: true, joined: false, cost: [] },
      { kind: "keyword", text: "Reaction", tone: "teal", arrow: true, joined: true, cost: [] },
      { kind: "text", text: " " },
      { kind: "glyph", name: "exhaust" },
      { kind: "text", text: ": Draw." },
    ]);
  });

  test("puts the cost of Empower, Equip, Flow and Repeat inside the keyword", () => {
    expect(parseCardText("[Empower] :rb_energy_5:. Then [Equip] :rb_rune_rainbow: (Attach.)")).toEqual([
      { kind: "keyword", text: "Empower", tone: "slate", arrow: false, joined: false, cost: ["energy_5"] },
      { kind: "text", text: ". Then " },
      { kind: "keyword", text: "Equip", tone: "slate", arrow: false, joined: false, cost: ["rune_rainbow"] },
      { kind: "text", text: " (Attach.)" },
    ]);
  });

  test("leaves the resource that Add adds outside the keyword", () => {
    expect(parseCardText("[Add] :rb_energy_1::rb_rune_rainbow:.")).toEqual([
      { kind: "keyword", text: "Add", tone: "slate", arrow: false, joined: false, cost: [] },
      { kind: "text", text: " " },
      { kind: "glyph", name: "energy_1" },
      { kind: "glyph", name: "rune_rainbow" },
      { kind: "text", text: "." },
    ]);
  });

  test("colors keywords by family", () => {
    const tones = parseCardText("[Action] [Deflect] [Assault 2] [Stun] [Something New]").flatMap((part) =>
      part.kind === "keyword" ? [part.tone] : [],
    );

    expect(tones).toEqual(["teal", "lime", "rose", "slate", "slate"]);
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
