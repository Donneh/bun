import type { FilterNode, SearchNode } from "./ast.ts";
import type { Decomposition, FilterChip, FilterChipValue } from "./decomposition.ts";
import type { FilterField, FilterOf } from "./filter.ts";

interface FieldMapping<F extends FilterField> {
  readonly label: string;
  readonly toValue: (filter: FilterOf<F>) => FilterChipValue;
}

type FieldMappings = { readonly [F in FilterField]: FieldMapping<F> };

const numeric = (filter: FilterOf<"cost" | "might" | "power">): FilterChipValue => ({
  kind: "numeric",
  operator: filter.comparison.operator,
  value: filter.comparison.value,
});

const select = (filter: { readonly value: string }): FilterChipValue => ({ kind: "select", value: filter.value });

const text = (filter: { readonly text: string }): FilterChipValue => ({ kind: "text", value: filter.text });

const FIELD_MAPPINGS: FieldMappings = {
  cost: { label: "Cost", toValue: numeric },
  might: { label: "Might", toValue: numeric },
  power: { label: "Power", toValue: numeric },
  domain: {
    label: "Domain",
    toValue: (filter) => ({
      kind: "domain",
      anyOf: filter.anyOf,
      allOf: filter.allOf,
      noneOf: filter.noneOf,
    }),
  },
  type: { label: "Type", toValue: select },
  supertype: { label: "Supertype", toValue: select },
  rarity: { label: "Rarity", toValue: select },
  variant: { label: "Variant", toValue: select },
  set: { label: "Set", toValue: (filter) => select({ value: filter.text }) },
  tag: { label: "Tag", toValue: text },
  artist: { label: "Artist", toValue: text },
  ability: { label: "Card text", toValue: text },
};

function toValue<F extends FilterField>(filter: FilterOf<F>): FilterChipValue {
  const mapping: FieldMapping<F> = FIELD_MAPPINGS[filter.field as F];
  return mapping.toValue(filter);
}

function topLevelChildren(root: SearchNode | null): readonly SearchNode[] {
  if (root === null) return [];
  return root.kind === "and" ? root.children : [root];
}

function isRepresented(node: SearchNode): node is FilterNode {
  return node.kind === "filter" && node.groupDepth === 0 && !node.negated;
}

function isVisuallyEditable(value: FilterChipValue): boolean {
  if (value.kind !== "domain") return true;
  return value.noneOf.length === 0 && !(value.anyOf.length > 0 && value.allOf.length > 0);
}

export function decompose(query: string, root: SearchNode | null): Decomposition {
  const children = topLevelChildren(root);
  const represented = children.filter(isRepresented);
  const fieldCounts = Map.groupBy(represented, (node) => node.filter.field);

  const filters: FilterChip[] = represented.map((node) => {
    const value = toValue(node.filter);
    return {
      field: node.filter.field,
      label: FIELD_MAPPINGS[node.filter.field].label,
      value,
      span: node.span,
      expression: query.slice(node.span.start, node.span.end),
      editable: fieldCounts.get(node.filter.field)?.length === 1 && isVisuallyEditable(value),
    };
  });

  return { query, filters, hasAdvancedConditions: children.length > filters.length };
}
