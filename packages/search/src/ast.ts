import type { Filter } from "./filter.ts";
import type { SearchWarning, SourceSpan } from "./syntax.ts";

export type SearchNode =
  | { readonly kind: "and"; readonly children: readonly SearchNode[] }
  | { readonly kind: "or"; readonly children: readonly SearchNode[] }
  | { readonly kind: "not"; readonly child: SearchNode }
  | { readonly kind: "text"; readonly value: string }
  | {
      readonly kind: "filter";
      readonly filter: Filter;
      readonly keyword: string;
      readonly span: SourceSpan;
      readonly groupDepth: number;
      readonly negated: boolean;
    };

export type FilterNode = Extract<SearchNode, { kind: "filter" }>;

export interface ParsedQuery {
  readonly root: SearchNode | null;
  readonly warnings: readonly SearchWarning[];
}
