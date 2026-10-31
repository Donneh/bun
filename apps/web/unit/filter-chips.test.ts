import { describe, expect, test } from "bun:test";
import { decompose, parseQuery } from "@riftkeeper/search";
import { removeSpan, toChipSummary } from "../app/utils/filter-chips.ts";

function chipsOf(query: string) {
  return decompose(query, parseQuery(query).root).filters;
}

function removeChip(query: string, label: string) {
  const chip = chipsOf(query).find((candidate) => candidate.label === label);
  if (!chip) throw new Error(`no ${label} chip in ${query}`);
  return removeSpan(query, chip.span);
}

describe("removeSpan", () => {
  test("removes a filter from the middle and keeps one space between its neighbours", () => {
    expect(removeChip("c:fury   cost:<=2  type:unit", "Cost")).toBe("c:fury type:unit");
  });

  test("removes the first and the last filter without leftover spaces", () => {
    expect(removeChip("c:fury cost:<=2", "Domain")).toBe("cost:<=2");
    expect(removeChip("c:fury cost:<=2", "Cost")).toBe("c:fury");
  });

  test("leaves an empty query when the only filter goes", () => {
    expect(removeChip("cost:3", "Cost")).toBe("");
  });

  test("uses UTF-16 offsets, so a non-BMP character before the filter keeps the cut exact", () => {
    const query = "𝔍inx 🔥 cost:2 type:unit";

    expect(removeChip(query, "Cost")).toBe("𝔍inx 🔥 type:unit");
    expect(removeChip(query, "Type")).toBe("𝔍inx 🔥 cost:2");
  });

  test("keeps quoted values of other filters intact", () => {
    expect(removeChip('ability:"draw 1" cost:2', "Cost")).toBe('ability:"draw 1"');
  });

  test("removes the explicit and that joined the filter", () => {
    expect(removeChip("c:fury and cost:2 and type:unit", "Cost")).toBe("c:fury and type:unit");
    expect(removeChip("c:fury AND cost:2", "Cost")).toBe("c:fury");
    expect(removeChip("cost:2 and c:fury", "Cost")).toBe("c:fury");
  });

  test("leaves a query that still parses to the remaining filters", () => {
    const query = "(c:fury or c:chaos) cost:<=3 type:unit";
    const remaining = removeChip(query, "Cost");

    expect(remaining).toBe("(c:fury or c:chaos) type:unit");
    expect(parseQuery(remaining).warnings).toEqual([]);
    expect(chipsOf(remaining).map((chip) => chip.label)).toEqual(["Type"]);
  });
});

describe("toChipSummary", () => {
  test("shows comparisons with their operator", () => {
    expect(chipsOf("cost:<=2 m:>3 p:!=1 cost:4").map((chip) => toChipSummary(chip).value)).toEqual([
      "≤ 2",
      "> 3",
      "≠ 1",
      "4",
    ]);
  });

  test("names the domains", () => {
    expect(chipsOf("c:fury,calm").map((chip) => toChipSummary(chip).value)).toEqual(["Fury or Calm"]);
    expect(chipsOf("c:fury+calm").map((chip) => toChipSummary(chip).value)).toEqual(["Fury and Calm"]);
  });

  test("draws the rune of each domain, the might glyph and the card type glyph", () => {
    expect(
      chipsOf("c:fury,calm c:colorless m:>=3 type:unit r:epic cost:2").map((chip) => toChipSummary(chip).glyphs),
    ).toEqual([["rune_fury", "rune_calm"], ["colorless"], ["might"], ["card_type_unit"], [], []]);
  });

  test("lets only editable filters be removed", () => {
    const [first, second, type] = chipsOf("cost:2 cost:3 type:unit").map(toChipSummary);

    expect([first?.removable, second?.removable, type?.removable]).toEqual([false, false, true]);
    expect(type).toEqual({ id: "14-23", label: "Type", value: "unit", glyphs: ["card_type_unit"], removable: true });
  });
});
