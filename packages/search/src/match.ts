import type { Card, Printing } from "@riftkeeper/cards";
import type { SearchNode } from "./ast.ts";
import type { ComparisonOperator, Filter, FilterField } from "./filter.ts";

type FilterOf<F extends FilterField> = Filter extends infer Member
  ? Member extends { field: infer Field }
    ? F extends Field
      ? Member
      : never
    : never
  : never;

type FilterMatchers = {
  [F in FilterField]: (filter: FilterOf<F>, card: Card, printing: Printing) => boolean;
};

function compare(actual: number | null, operator: ComparisonOperator, expected: number): boolean {
  if (actual === null) return false;
  switch (operator) {
    case "=":
      return actual === expected;
    case "!=":
      return actual !== expected;
    case "<":
      return actual < expected;
    case "<=":
      return actual <= expected;
    case ">":
      return actual > expected;
    case ">=":
      return actual >= expected;
  }
}

function containsIgnoringCase(haystack: string | null, needle: string): boolean {
  return haystack?.toLowerCase().includes(needle.toLowerCase()) ?? false;
}

function equalsIgnoringCase(a: string, b: string): boolean {
  return a.toLowerCase() === b.toLowerCase();
}

function hasTag(card: Card, value: string): boolean {
  return card.tags.some((tag) => equalsIgnoringCase(tag, value));
}

const FILTER_MATCHERS: FilterMatchers = {
  cost: (filter, card) => compare(card.energyCost, filter.comparison.operator, filter.comparison.value),
  power: (filter, card) => compare(card.powerCost, filter.comparison.operator, filter.comparison.value),
  might: (filter, card) => compare(card.might, filter.comparison.operator, filter.comparison.value),
  domain: (filter, card) =>
    (filter.anyOf.length === 0 || filter.anyOf.some((domain) => card.domains.includes(domain))) &&
    filter.allOf.every((domain) => card.domains.includes(domain)) &&
    !filter.noneOf.some((domain) => card.domains.includes(domain)),
  type: (filter, card) => card.type === filter.value,
  supertype: (filter, card) => card.supertype === filter.value,
  rarity: (filter, _card, printing) => printing.rarity === filter.value,
  variant: (filter, _card, printing) => printing.variant === filter.value,
  tag: (filter, card) => hasTag(card, filter.text),
  set: (filter, _card, printing) =>
    equalsIgnoringCase(printing.set.code, filter.text) || containsIgnoringCase(printing.set.name, filter.text),
  artist: (filter, _card, printing) => containsIgnoringCase(printing.artist, filter.text),
  ability: (filter, card) =>
    containsIgnoringCase(card.ability, filter.text) || containsIgnoringCase(card.effect, filter.text),
};

function matchesFilter(filter: Filter, card: Card, printing: Printing): boolean {
  const matcher = FILTER_MATCHERS[filter.field] as (filter: Filter, card: Card, printing: Printing) => boolean;
  return matcher(filter, card, printing);
}

function matchesText(value: string, card: Card): boolean {
  const displayName = card.subtitle === null ? card.name : `${card.name}, ${card.subtitle}`;
  return containsIgnoringCase(displayName, value) || hasTag(card, value);
}

export function matchesNode(node: SearchNode, card: Card, printing: Printing): boolean {
  switch (node.kind) {
    case "and":
      return node.children.every((child) => matchesNode(child, card, printing));
    case "or":
      return node.children.some((child) => matchesNode(child, card, printing));
    case "not":
      return !matchesNode(node.child, card, printing);
    case "text":
      return matchesText(node.value, card);
    case "filter":
      return matchesFilter(node.filter, card, printing);
  }
}
