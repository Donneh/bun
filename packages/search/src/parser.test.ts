import { describe, expect, test } from "bun:test";
import { parseQuery } from "./index.ts";

const EMOJI = String.fromCodePoint(0x1f600);
const NBSP = String.fromCharCode(0x00a0);

const text = (value: string) => ({ kind: "text" as const, value });
const and = <T extends object[]>(...children: T) => ({ kind: "and" as const, children });
const or = <T extends object[]>(...children: T) => ({ kind: "or" as const, children });
const not = <T>(child: T) => ({ kind: "not" as const, child });
const cost = (value: number) => ({ kind: "filter", filter: { field: "cost", comparison: { operator: "=", value } } });
const tag = (value: string) => ({ kind: "filter", filter: { field: "tag", text: value } });
const domain = (name: string) => ({ kind: "filter", filter: { field: "domain", anyOf: [name] } });

const messages = (query: string) => parseQuery(query).warnings.map((warning) => warning.message);

describe("parseQuery", () => {
  test("merges bare words into one text node", () => {
    expect(parseQuery("vex mocking")).toEqual({ root: text("vex mocking"), warnings: [] });
  });

  test.each(["Kai'Sa, Survivor", "Super Mega Death Rocket!", "Thousand-Tailed Watcher"])(
    "keeps %p as one phrase",
    (query) => {
      expect(parseQuery(query).root).toEqual(text(query));
    },
  );

  test("negates only the word after the dash", () => {
    expect(parseQuery("-vex mocking").root).toEqual(and(not(text("vex")), text("mocking")));
  });

  test("splits on or", () => {
    expect(parseQuery("vex or mocking").root).toEqual(or(text("vex"), text("mocking")));
  });

  test("treats an explicit and like a space", () => {
    expect(parseQuery("vex and mocking")).toEqual({ root: text("vex mocking"), warnings: [] });
  });

  test("keeps a group apart from the words around it", () => {
    expect(parseQuery("(vex or mocking) storm").root).toEqual(and(or(text("vex"), text("mocking")), text("storm")));
  });

  test("moves the merged words after the filters", () => {
    expect(parseQuery("vex cost:5 mocking").root).toMatchObject(and(cost(5), text("vex mocking")));
  });

  test("binds and tighter than or", () => {
    expect(parseQuery("vex cost:5 mocking or cost:3").root).toMatchObject(
      or(and(cost(5), text("vex mocking")), cost(3)),
    );
  });

  test("negates a group", () => {
    expect(parseQuery("-(c:fury or c:calm)").root).toMatchObject(not(or(domain("fury"), domain("calm"))));
  });

  test("unquotes a filter value with parentheses and colons", () => {
    expect(parseQuery('ability:"Do this twice: Deal 3 to a unit. (You can choose different units.)"')).toMatchObject({
      root: {
        filter: { field: "ability", text: "Do this twice: Deal 3 to a unit. (You can choose different units.)" },
      },
      warnings: [],
    });
  });

  test("drops an unknown keyword", () => {
    expect(parseQuery("domains:fury").root).toBeNull();
    expect(messages("domains:fury")).toEqual(['Unknown keyword "domains" was ignored.']);
  });

  test("drops an invalid filter and keeps the rest", () => {
    expect(parseQuery("cost:notanumber storm").root).toEqual(text("storm"));
    expect(messages("cost:notanumber storm")).toEqual([
      'Invalid value for "cost": "notanumber" is not a whole number.',
    ]);
  });

  test("keeps the contents of an unclosed group", () => {
    expect(parseQuery("(vex or mocking")).toEqual({
      root: or(text("vex"), text("mocking")),
      warnings: [
        {
          message: 'Missing closing ")" for the group starting here; its contents were still used.',
          span: { start: 0, end: 1 },
        },
      ],
    });
  });

  test("ignores a stray closing parenthesis", () => {
    expect(parseQuery(")")).toEqual({
      root: null,
      warnings: [{ message: 'Unexpected ")" was ignored.', span: { start: 0, end: 1 } }],
    });
  });

  test.each(["", "   "])("returns a null root for blank input %p", (query) => {
    expect(parseQuery(query)).toEqual({ root: null, warnings: [] });
  });

  test("warns about a not with nothing to negate before or", () => {
    expect(parseQuery("vex not or mocking").root).toEqual(or(text("vex"), text("mocking")));
    expect(messages("vex not or mocking")).toEqual(['Nothing to negate after "not".']);
  });

  test("warns about a not with nothing to negate before a closing parenthesis", () => {
    expect(parseQuery("(a not) b").root).toEqual(and(text("a"), text("b")));
    expect(messages("(a not) b")).toHaveLength(1);
  });

  test("cancels an even number of negations", () => {
    expect(parseQuery("--vex")).toEqual({ root: text("vex"), warnings: [] });
  });

  test("keeps an odd number of negations", () => {
    expect(parseQuery("not not not vex")).toEqual({ root: not(text("vex")), warnings: [] });
  });

  test.each(["not", "not or vex"])("warns that %p has nothing to negate", (query) => {
    expect(messages(query)[0]).toBe('Nothing to negate after "not".');
  });

  test("warns about an unexpected and after not", () => {
    expect(messages("not and vex")).toEqual(['Unexpected "and" was ignored.', 'Nothing to negate after "not".']);
  });

  test("resumes after a stray closing parenthesis", () => {
    expect(parseQuery("vex) mocking storm").root).toEqual(and(text("vex"), text("mocking storm")));
    expect(messages("vex) mocking storm")).toEqual(['Unexpected ")" was ignored.']);
  });

  test("ands filters of different kinds", () => {
    expect(parseQuery("tag:1 set:2").root).toMatchObject(
      and(tag("1"), { kind: "filter", filter: { field: "set", text: "2" } }),
    );
  });

  test("flattens a chain of ors", () => {
    expect(parseQuery("a or b or c").root).toEqual(or(text("a"), text("b"), text("c")));
  });

  test("does not flatten across groups", () => {
    expect(parseQuery("(a or b) or c").root).toEqual(or(or(text("a"), text("b")), text("c")));
  });

  test("nests groups", () => {
    expect(parseQuery("(a or (t:1 and t:2)) d")).toMatchObject({
      root: and(or(text("a"), and(tag("1"), tag("2"))), text("d")),
      warnings: [],
    });
  });

  test("keeps a trailing backslash", () => {
    expect(parseQuery("t:foo\\").root).toMatchObject(tag("foo\\"));
  });

  test("unescapes quotes inside a quoted value", () => {
    expect(parseQuery('ability:"say \\"hi\\""').root).toMatchObject({ filter: { text: 'say "hi"' } });
  });

  test.each(["and", "or", "not"])("reads tag:%s as a filter value", (value) => {
    expect(parseQuery(`tag:${value}`)).toMatchObject({ root: tag(value), warnings: [] });
  });

  test("collects every warning and keeps the valid parts", () => {
    expect(parseQuery("unknown:1 vex cost:notanumber mocking").root).toEqual(text("vex mocking"));
    expect(messages("unknown:1 vex cost:notanumber mocking")).toEqual([
      'Unknown keyword "unknown" was ignored.',
      'Invalid value for "cost": "notanumber" is not a whole number.',
    ]);
  });

  test("parses a query with every construct", () => {
    expect(parseQuery('vex mocking t:5 (cost:3 or cost:1) -domain:calm ability:"draw a card"')).toMatchObject({
      root: and(
        tag("5"),
        or(cost(3), cost(1)),
        not({ ...domain("calm"), negated: true }),
        { kind: "filter", filter: { field: "ability", text: "draw a card" } },
        text("vex mocking"),
      ),
      warnings: [],
    });
  });
});

describe("filter nodes", () => {
  test("record the token span, group depth and negation", () => {
    expect(parseQuery("((cost:3))").root).toEqual({
      kind: "filter",
      filter: { field: "cost", comparison: { operator: "=", value: 3 } },
      keyword: "cost",
      span: { start: 2, end: 8 },
      groupDepth: 2,
      negated: false,
    });
  });

  test("are marked negated after a dash", () => {
    expect(parseQuery("-c:fury").root).toMatchObject(not({ ...domain("fury"), negated: true }));
  });

  test("stay marked negated when negations cancel", () => {
    expect(parseQuery("not not c:fury").root).toMatchObject({ kind: "filter", negated: true });
  });

  test("are marked negated when a negated group holds only them", () => {
    expect(parseQuery("-(c:fury)").root).toMatchObject(not({ kind: "filter", negated: true, groupDepth: 1 }));
  });

  test("inside a negated group with other terms are not marked negated", () => {
    expect(parseQuery("-(c:fury or c:calm)").root).toMatchObject(
      not(or({ negated: false, groupDepth: 1 }, { negated: false, groupDepth: 1 })),
    );
  });
});

describe("spans", () => {
  test("are UTF-16 offsets into the original query after a non-BMP character", () => {
    const query = `${EMOJI} cost:3 nope:1`;
    const { root, warnings } = parseQuery(query);

    expect(root).toMatchObject(and({ kind: "filter", span: { start: 3, end: 9 } }, text(EMOJI)));
    expect(warnings).toEqual([{ message: 'Unknown keyword "nope" was ignored.', span: { start: 10, end: 16 } }]);
    expect(query.slice(10, 16)).toBe("nope:1");
  });

  test("survive Unicode spaces", () => {
    const query = `c:fury${NBSP}m:3`;
    const { root } = parseQuery(query);

    expect(root).toMatchObject({
      kind: "and",
      children: [{ span: { start: 0, end: 6 } }, { span: { start: 7, end: 10 } }],
    });
  });
});

describe("decided changes from the old search", () => {
  test("an unterminated quote drops the opening quote from a filter value", () => {
    expect(parseQuery('ability:"draw a card')).toEqual({
      root: {
        kind: "filter",
        filter: { field: "ability", text: "draw a card" },
        keyword: "ability",
        span: { start: 0, end: 20 },
        groupDepth: 0,
        negated: false,
      },
      warnings: [
        {
          message: "Unterminated quote; the rest of the query was treated as part of this value.",
          span: { start: 0, end: 20 },
        },
      ],
    });
  });

  test("an unterminated quote drops the opening quote from free text", () => {
    expect(parseQuery('vex "draw a card').root).toEqual(text("vex draw a card"));
  });

  test.each([
    ["vex and", "and", { start: 4, end: 7 }],
    ["and vex", "and", { start: 0, end: 3 }],
    ["vex or", "or", { start: 4, end: 6 }],
    ["or vex", "or", { start: 0, end: 2 }],
    ["vex or or mocking", "or", { start: 4, end: 6 }],
    ["vex and and mocking", "and", { start: 4, end: 7 }],
  ])("%p warns about a dangling operator", (query, operator, span) => {
    expect(parseQuery(query).warnings).toEqual([{ message: `Dangling "${operator}" was ignored.`, span }]);
  });

  test("a dangling operator keeps the rest of the query", () => {
    expect(parseQuery("vex or or mocking").root).toEqual(or(text("vex"), text("mocking")));
    expect(parseQuery("vex and").root).toEqual(text("vex"));
  });

  test("an operator next to a dropped filter is not dangling", () => {
    expect(messages("vex or unknown:1")).toEqual(['Unknown keyword "unknown" was ignored.']);
  });

  test("an empty group warns and is ignored", () => {
    expect(parseQuery("vex ()")).toEqual({
      root: text("vex"),
      warnings: [{ message: "Empty group was ignored.", span: { start: 4, end: 6 } }],
    });
  });

  test("a group holding only a dropped filter is not empty", () => {
    expect(messages("(unknown:1)")).toEqual(['Unknown keyword "unknown" was ignored.']);
  });
});
