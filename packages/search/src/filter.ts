import type { CardType, Domain, Rarity, Supertype, Variant } from "@riftkeeper/cards";

export type ComparisonOperator = "=" | "!=" | "<" | "<=" | ">" | ">=";

export interface NumberComparison {
  readonly operator: ComparisonOperator;
  readonly value: number;
}

export type NumericField = "cost" | "might" | "power";
export type TextField = "tag" | "set" | "artist" | "ability";

export type Filter =
  | { readonly field: NumericField; readonly comparison: NumberComparison }
  | {
      readonly field: "domain";
      readonly anyOf: readonly Domain[];
      readonly allOf: readonly Domain[];
      readonly noneOf: readonly Domain[];
    }
  | { readonly field: "type"; readonly value: CardType }
  | { readonly field: "supertype"; readonly value: Supertype }
  | { readonly field: "rarity"; readonly value: Rarity }
  | { readonly field: "variant"; readonly value: Variant }
  | { readonly field: TextField; readonly text: string };

export type FilterField = Filter["field"];

export type FilterOf<F extends FilterField> = Filter extends infer Member
  ? Member extends { field: infer Field }
    ? F extends Field
      ? Member
      : never
    : never
  : never;
