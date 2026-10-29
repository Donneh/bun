import type { Domain } from "@riftkeeper/cards";
import type { ComparisonOperator, FilterField } from "./filter.ts";
import type { SourceSpan } from "./syntax.ts";

export type FilterChipValue =
  | { readonly kind: "numeric"; readonly operator: ComparisonOperator; readonly value: number }
  | {
      readonly kind: "domain";
      readonly anyOf: readonly Domain[];
      readonly allOf: readonly Domain[];
      readonly noneOf: readonly Domain[];
    }
  | { readonly kind: "select"; readonly value: string }
  | { readonly kind: "text"; readonly value: string };

export interface FilterChip {
  readonly field: FilterField;
  readonly label: string;
  readonly value: FilterChipValue;
  readonly span: SourceSpan;
  readonly expression: string;
  readonly editable: boolean;
}

export interface Decomposition {
  readonly query: string;
  readonly filters: readonly FilterChip[];
  readonly hasAdvancedConditions: boolean;
}
