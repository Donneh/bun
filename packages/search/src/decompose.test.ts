import { expect, test } from "bun:test";
import type { SearchNode } from "./ast.ts";
import { decompose } from "./decompose.ts";
import type { Filter } from "./filter.ts";

interface FilterOptions {
  readonly groupDepth?: number;
  readonly negated?: boolean;
}

function filterIn(query: string, expression: string, filter: Filter, options: FilterOptions = {}): SearchNode {
  const start = query.indexOf(expression);
  if (start < 0) throw new Error(`"${expression}" is not in "${query}"`);
  return {
    kind: "filter",
    filter,
    keyword: expression.slice(0, expression.indexOf(":")),
    span: { start, end: start + expression.length },
    groupDepth: options.groupDepth ?? 0,
    negated: options.negated ?? false,
  };
}

const and = (...children: SearchNode[]): SearchNode => ({ kind: "and", children });
const costGreaterThan = (value: number): Filter => ({ field: "cost", comparison: { operator: ">", value } });

test("decomposes a query with free text, filters and a group", () => {
  const query = "vex cost:>3 type:unit (rarity:rare or rarity:epic)";
  const root = and(
    { kind: "text", value: "vex" },
    filterIn(query, "cost:>3", costGreaterThan(3)),
    filterIn(query, "type:unit", { field: "type", value: "unit" }),
    {
      kind: "or",
      children: [
        filterIn(query, "rarity:rare", { field: "rarity", value: "rare" }, { groupDepth: 1 }),
        filterIn(query, "rarity:epic", { field: "rarity", value: "epic" }, { groupDepth: 1 }),
      ],
    },
  );

  const result = decompose(query, root);

  expect(result.query).toBe(query);
  expect(result.hasAdvancedConditions).toBe(true);
  expect(result.filters).toHaveLength(2);
  expect(result.filters[0]).toEqual({
    field: "cost",
    label: "Cost",
    value: { kind: "numeric", operator: ">", value: 3 },
    span: { start: 4, end: 11 },
    expression: "cost:>3",
    editable: true,
  });
  expect(result.filters[1]).toMatchObject({
    field: "type",
    label: "Type",
    value: { kind: "select", value: "unit" },
    expression: "type:unit",
  });
});

test("a lone filter is the whole query and is not advanced", () => {
  const query = "cost:>3";

  const result = decompose(query, filterIn(query, "cost:>3", costGreaterThan(3)));

  expect(result.filters).toHaveLength(1);
  expect(result.hasAdvancedConditions).toBe(false);
});

test("a filter inside a group is not represented", () => {
  const query = "(cost:>3)";

  const result = decompose(query, filterIn(query, "cost:>3", costGreaterThan(3), { groupDepth: 1 }));

  expect(result.filters).toEqual([]);
  expect(result.hasAdvancedConditions).toBe(true);
});

test("a negated filter is not represented", () => {
  const query = "not not cost:3";
  const root = filterIn(query, "cost:3", { field: "cost", comparison: { operator: "=", value: 3 } });

  const negated = decompose(query, { kind: "not", child: { kind: "not", child: root } });
  const prefixed = decompose(
    "-cost:3",
    filterIn("-cost:3", "cost:3", { field: "cost", comparison: { operator: "=", value: 3 } }, { negated: true }),
  );

  expect(negated.filters).toEqual([]);
  expect(negated.hasAdvancedConditions).toBe(true);
  expect(prefixed.filters).toEqual([]);
  expect(prefixed.hasAdvancedConditions).toBe(true);
});

test("a top-level or is not decomposed", () => {
  const query = "cost:3 or cost:4";
  const root: SearchNode = {
    kind: "or",
    children: [
      filterIn(query, "cost:3", { field: "cost", comparison: { operator: "=", value: 3 } }),
      filterIn(query, "cost:4", { field: "cost", comparison: { operator: "=", value: 4 } }),
    ],
  };

  const result = decompose(query, root);

  expect(result.filters).toEqual([]);
  expect(result.hasAdvancedConditions).toBe(true);
});

test("a duplicate field makes both chips non-editable", () => {
  const query = "cost:>3 cost:<8";
  const root = and(
    filterIn(query, "cost:>3", costGreaterThan(3)),
    filterIn(query, "cost:<8", { field: "cost", comparison: { operator: "<", value: 8 } }),
  );

  const result = decompose(query, root);

  expect(result.filters.map((chip) => chip.editable)).toEqual([false, false]);
  expect(result.hasAdvancedConditions).toBe(false);
});

test("a domain with excluded domains is not editable", () => {
  const query = "c:red+blue,-purple";
  const root = filterIn(query, query, {
    field: "domain",
    anyOf: [],
    allOf: ["fury", "mind"],
    noneOf: ["chaos"],
  });

  const [chip] = decompose(query, root).filters;

  expect(chip?.value).toEqual({ kind: "domain", anyOf: [], allOf: ["fury", "mind"], noneOf: ["chaos"] });
  expect(chip?.label).toBe("Domain");
  expect(chip?.editable).toBe(false);
});

test("a domain mixing any-of and all-of is not editable", () => {
  const query = "c:red,blue+mind";
  const root = filterIn(query, query, { field: "domain", anyOf: ["fury", "calm"], allOf: ["mind"], noneOf: [] });

  expect(decompose(query, root).filters[0]?.editable).toBe(false);
});

test("a plain domain is editable", () => {
  const anyOfQuery = "c:red,blue";
  const allOfQuery = "c:red+blue";

  const anyOf = decompose(
    anyOfQuery,
    filterIn(anyOfQuery, anyOfQuery, { field: "domain", anyOf: ["fury", "calm"], allOf: [], noneOf: [] }),
  );
  const allOf = decompose(
    allOfQuery,
    filterIn(allOfQuery, allOfQuery, { field: "domain", anyOf: [], allOf: ["fury", "calm"], noneOf: [] }),
  );

  expect(anyOf.filters[0]?.editable).toBe(true);
  expect(allOf.filters[0]?.editable).toBe(true);
});

test("maps each non-numeric field to its label and value kind", () => {
  const query = "supertype:champion variant:alt-art set:OGN tag:Yordle artist:Bob ability:draw";
  const root = and(
    filterIn(query, "supertype:champion", { field: "supertype", value: "champion" }),
    filterIn(query, "variant:alt-art", { field: "variant", value: "alt-art" }),
    filterIn(query, "set:OGN", { field: "set", text: "OGN" }),
    filterIn(query, "tag:Yordle", { field: "tag", text: "Yordle" }),
    filterIn(query, "artist:Bob", { field: "artist", text: "Bob" }),
    filterIn(query, "ability:draw", { field: "ability", text: "draw" }),
  );

  const result = decompose(query, root);

  expect(result.filters.map(({ label, value }) => [label, value])).toEqual([
    ["Supertype", { kind: "select", value: "champion" }],
    ["Variant", { kind: "select", value: "alt-art" }],
    ["Set", { kind: "select", value: "OGN" }],
    ["Tag", { kind: "text", value: "Yordle" }],
    ["Artist", { kind: "text", value: "Bob" }],
    ["Card text", { kind: "text", value: "draw" }],
  ]);
  expect(result.hasAdvancedConditions).toBe(false);
});

test("a null root has no filters", () => {
  expect(decompose("", null)).toEqual({ query: "", filters: [], hasAdvancedConditions: false });
});

test("spans are UTF-16 offsets, so a non-BMP character before a filter keeps the expression correct", () => {
  const query = "😀 cost:>3";
  const root = and({ kind: "text", value: "😀" }, filterIn(query, "cost:>3", costGreaterThan(3)));

  const [chip] = decompose(query, root).filters;

  expect(chip?.span).toEqual({ start: 3, end: 10 });
  expect(chip?.expression).toBe("cost:>3");
});
