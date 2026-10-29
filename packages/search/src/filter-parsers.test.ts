import { describe, expect, test } from "bun:test";
import { parseQuery } from "./parser.ts";

const filterOf = (query: string): unknown => {
  const { root, warnings } = parseQuery(query);

  expect(warnings).toEqual([]);
  if (root?.kind !== "filter") {
    throw new Error(`Expected a filter node for ${query}, got ${JSON.stringify(root)}`);
  }
  return root.filter;
};

const rejection = (query: string) => {
  const { root, warnings } = parseQuery(query);

  expect(root).toBeNull();
  return warnings.map((warning) => warning.message);
};

describe("numeric filters", () => {
  test.each([
    ["5", "=", 5],
    ["=5", "=", 5],
    [">=3", ">=", 3],
    ["<=3", "<=", 3],
    ["!=3", "!=", 3],
    [">3", ">", 3],
    ["<3", "<", 3],
    ["-1", "=", -1],
    ['" >= 3 "', ">=", 3],
  ])("cost:%s compares with %s %d", (value, operator, number) => {
    expect(filterOf(`cost:${value}`)).toEqual({ field: "cost", comparison: { operator, value: number } });
  });

  test.each(["abc", ">=", ">nope", "3.7", "1e1", ""])("rejects %p as not a whole number", (value) => {
    expect(rejection(`cost:${value}`)).toEqual([`Invalid value for "cost": "${value}" is not a whole number.`]);
  });

  test.each(["9".repeat(400), "9007199254740993", "-9007199254740993"])("rejects %p as not a safe integer", (value) => {
    expect(rejection(`cost:${value}`)).toEqual([`Invalid value for "cost": "${value}" is not a whole number.`]);
  });

  test("reads -0 as 0", () => {
    const filter = filterOf("cost:-0") as { comparison: { value: number } };

    expect(Object.is(filter.comparison.value, 0)).toBe(true);
  });

  test.each([
    ["cost", "cost"],
    ["might", "might"],
    ["m", "might"],
    ["power", "power"],
    ["p", "power"],
  ])("%s:5 filters %s", (keyword, field) => {
    expect(filterOf(`${keyword}:5`)).toMatchObject({ field });
  });

  test("cost does not claim the c alias", () => {
    expect(filterOf("c:fury")).toMatchObject({ field: "domain" });
  });
});

describe("domain filter", () => {
  test.each(["c", "color", "d", "domain"])("%s is a domain alias", (keyword) => {
    expect(filterOf(`${keyword}:fury`)).toEqual({ field: "domain", anyOf: ["fury"], allOf: [], noneOf: [] });
  });

  test.each([
    ["red", "fury"],
    ["green", "calm"],
    ["blue", "mind"],
    ["orange", "body"],
    ["purple", "chaos"],
    ["yellow", "order"],
    ["colorless", "colorless"],
    ["FURY", "fury"],
  ])("reads %s as %s", (name, domain) => {
    expect(filterOf(`c:${name}`)).toEqual({ field: "domain", anyOf: [domain], allOf: [], noneOf: [] });
  });

  test("reads a comma list as any of", () => {
    expect(filterOf("c:fury,calm")).toEqual({ field: "domain", anyOf: ["fury", "calm"], allOf: [], noneOf: [] });
  });

  test("reads a plus list as all of", () => {
    expect(filterOf("c:fury+calm")).toEqual({ field: "domain", anyOf: [], allOf: ["fury", "calm"], noneOf: [] });
  });

  test("reads a dash as none of", () => {
    expect(filterOf("c:-fury")).toEqual({ field: "domain", anyOf: [], allOf: [], noneOf: ["fury"] });
  });

  test("combines all three lists", () => {
    expect(filterOf("c:fury,calm+mind,-chaos")).toEqual({
      field: "domain",
      anyOf: ["fury"],
      allOf: ["calm", "mind"],
      noneOf: ["chaos"],
    });
  });

  test("skips empty segments and trims names", () => {
    expect(filterOf('c:" red , ,blue "')).toEqual({ field: "domain", anyOf: ["fury", "mind"], allOf: [], noneOf: [] });
  });

  test("rejects an empty domain", () => {
    expect(rejection("c:")).toEqual(['Invalid value for "c": "" is not a valid domain.']);
    expect(rejection("c:,")).toEqual(['Invalid value for "c": "," is not a valid domain.']);
  });

  test("rejects an unknown domain name", () => {
    expect(rejection("color:fury+Pink")).toEqual([
      'Invalid value for "color": "Pink" is not a domain. Use one of: fury, calm, mind, body, chaos, order, colorless.',
    ]);
  });
});

describe("enum filters", () => {
  test.each([
    ["type:Unit", { field: "type", value: "unit" }],
    ['type:" SPELL "', { field: "type", value: "spell" }],
    ["supertype:champion", { field: "supertype", value: "champion" }],
    ["rarity:Rare", { field: "rarity", value: "rare" }],
    ["r:epic", { field: "rarity", value: "epic" }],
    ["variant:standard", { field: "variant", value: "standard" }],
    ["variant:Alt-Art", { field: "variant", value: "alt-art" }],
    ['variant:"alt art"', { field: "variant", value: "alt-art" }],
    ["variant:altart", { field: "variant", value: "alt-art" }],
    ["variant:Signature", { field: "variant", value: "signed" }],
  ])("%s parses to %o", (query, filter) => {
    expect(filterOf(query)).toEqual(filter);
  });

  test.each([
    [
      "type:legendary",
      'Invalid value for "type": "legendary" is not a type. Use one of: legend, unit, spell, gear, rune, battlefield.',
    ],
    [
      "supertype:legendary",
      'Invalid value for "supertype": "legendary" is not a supertype. Use one of: champion, signature, basic, token.',
    ],
    [
      "r:Mythic",
      'Invalid value for "r": "Mythic" is not a rarity. Use one of: common, uncommon, rare, epic, showcase.',
    ],
    [
      "variant:foil",
      'Invalid value for "variant": "foil" is not a variant. Use one of: standard, alt-art, signed, special, token, rune.',
    ],
  ])("rejects %s", (query, message) => {
    expect(rejection(query)).toEqual([message]);
  });

  test.each([
    ["type", "Type"],
    ["supertype", "Supertype"],
    ["rarity", "Rarity"],
    ["variant", "Variant"],
  ])("rejects an empty %s", (keyword, label) => {
    expect(rejection(`${keyword}:" "`)).toEqual([`Invalid value for "${keyword}": ${label} value cannot be empty.`]);
  });
});

describe("text filters", () => {
  test.each([
    ["tag", "tag"],
    ["t", "tag"],
    ["set", "set"],
    ["s", "set"],
    ["artist", "artist"],
    ["a", "artist"],
    ["ability", "ability"],
  ])("%s:legendary filters %s as typed", (keyword, field) => {
    expect(filterOf(`${keyword}:Legendary`)).toEqual({ field, text: "Legendary" });
  });

  test("stores the trimmed value", () => {
    expect(filterOf('tag:" Annie "')).toEqual({ field: "tag", text: "Annie" });
  });

  test.each([
    ["tag", "Tag"],
    ["set", "Set"],
    ["artist", "Artist"],
    ["ability", "Ability"],
  ])("rejects an empty or blank %s", (keyword, label) => {
    const message = `Invalid value for "${keyword}": ${label} value cannot be empty.`;

    expect(rejection(`${keyword}:`)).toEqual([message]);
    expect(rejection(`${keyword}:"  "`)).toEqual([message]);
  });
});

describe("keywords", () => {
  test("matches keywords case-insensitively and trimmed", () => {
    const { root } = parseQuery('" COST ":5');

    expect(root).toMatchObject({ kind: "filter", keyword: "cost", filter: { field: "cost" } });
  });

  test("keeps the alias as typed, lowercased", () => {
    expect(parseQuery("C:fury").root).toMatchObject({ kind: "filter", keyword: "c" });
  });

  test.each(["promo", "owned", "flavor", "legal", "keyword", "k"])("%s is not supported yet", (keyword) => {
    expect(rejection(`${keyword.toUpperCase()}:true`)).toEqual([`"${keyword}" is not supported yet and was ignored.`]);
  });

  test("warns about an unknown keyword", () => {
    expect(rejection("name:annie")).toEqual(['Unknown keyword "name" was ignored.']);
  });

  test("warns about a missing keyword", () => {
    expect(rejection(":fury")).toEqual(['Missing keyword before ":".']);
  });
});
