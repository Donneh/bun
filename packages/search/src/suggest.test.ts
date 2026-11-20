import { describe, expect, test } from "bun:test";
import { parseQuery } from "./parser.ts";
import { suggest } from "./suggest.ts";

const atEnd = (query: string) => suggest(query, query.length);
const labels = (query: string, caret = query.length) => suggest(query, caret).suggestions.map((s) => s.label);

function apply(query: string, caret = query.length, index = 0): string {
  const suggestion = suggest(query, caret).suggestions[index];
  if (suggestion === undefined) throw new Error(`No suggestion ${index} for ${query}`);
  return query.slice(0, suggestion.span.start) + suggestion.text + query.slice(suggestion.span.end);
}

describe("keywords", () => {
  test("an empty query lists every filter once", () => {
    expect(labels("")).toEqual([
      "cost:",
      "might:",
      "power:",
      "price:",
      "domain:",
      "tag:",
      "type:",
      "supertype:",
      "rarity:",
      "variant:",
      "set:",
      "artist:",
      "ability:",
    ]);
  });

  test("an exact alias comes before longer keywords that share its prefix", () => {
    expect(labels("c")).toEqual(["c:", "cost:"]);
  });

  test("completes the word under the caret, not the end of the query", () => {
    expect(apply("ty cost:2", 2)).toBe("type: cost:2");
  });

  test("a bare word that matches no keyword gets no suggestions", () => {
    expect(atEnd("annie fiery")).toEqual({ suggestions: [], hint: null });
  });

  test("an unknown keyword is explained", () => {
    expect(atEnd("foo:1").hint).toBe('"foo" is not a filter. Remove it or pick one of the filters below.');
    expect(atEnd("k:shield").hint).toBe('"k" is not supported yet.');
  });
});

describe("values", () => {
  test("completes either price keyword and explains decimal USD comparisons", () => {
    expect(apply("pr")).toBe("price:");
    expect(apply("us")).toBe("usd:");
    for (const query of ["price:", "usd:", "usd<1", "-USD>=2.50"]) {
      expect(atEnd(query)).toEqual({
        suggestions: [],
        hint: "Price: cheapest normal or foil market price in USD, such as usd<1 or price:<=2.50. Unpriced printings do not match.",
      });
    }
  });

  test("completes an enumerated value and leaves room for the next term", () => {
    expect(apply("type:sp")).toBe("type:spell ");
    expect(apply("-r:e")).toBe("-r:epic ");
    expect(apply("(r:ep)", 5)).toBe("(r:epic)");
  });

  test("completes only the domain segment under the caret", () => {
    expect(apply("c:fury,ca")).toBe("c:fury,calm");
    expect(apply("c:fury+ca,mind", 9)).toBe("c:fury+calm,mind");
    expect(apply("c:-ch")).toBe("c:-chaos");
  });

  test("a complete value needs no suggestion", () => {
    expect(labels("type:spell")).toEqual([]);
    expect(labels("c:fury+calm")).toEqual([]);
  });

  test("an impossible value lists the allowed ones", () => {
    expect(atEnd("r:legendary")).toEqual({
      suggestions: [],
      hint: '"legendary" is not a rarity. Use one of: common, uncommon, rare, epic, showcase.',
    });
  });

  test("a set name that is not a code gets no error, because set names match too", () => {
    expect(atEnd("s:origins").hint).toBe("Set: a set code or part of the set name, such as s:origins.");
  });

  test("free-text filters explain their value instead of suggesting one", () => {
    expect(atEnd('ability:"dr')).toEqual({
      suggestions: [],
      hint: 'Card text: words from the rules text. Quote phrases, such as ability:"draw 1".',
    });
  });
});

describe("t: with a card type", () => {
  test("explains that t: is tag and offers type", () => {
    expect(atEnd("t:spell")).toEqual({
      suggestions: [{ label: "type:spell", detail: "Card type", text: "type:spell ", span: { start: 0, end: 7 } }],
      hint: 't: searches tags, and "spell" is a card type. Use type:spell instead.',
    });
  });

  test("a real tag gets only the tag hint", () => {
    expect(labels("t:ionia")).toEqual([]);
  });
});

test("every suggested completion parses without warnings", () => {
  for (const query of ["", "ty", "type:", "r:", "variant:", "supertype:", "c:fury,", "s:", "t:unit"]) {
    for (const [index] of suggest(query, query.length).suggestions.entries()) {
      const applied = apply(query, query.length, index);
      if (applied.trimEnd().endsWith(":")) continue;
      expect({ applied, warnings: parseQuery(applied).warnings }).toEqual({ applied, warnings: [] });
    }
  }
});
