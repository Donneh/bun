import type { Decomposition, SearchWarning } from "@riftkeeper/search";
import type { CardSummary } from "@riftkeeper/ui";

export interface SearchResults {
  readonly kind: "results";
  readonly cards: readonly CardSummary[];
  readonly page: number;
  readonly total: number;
  readonly hasMore: boolean;
  readonly warnings: readonly SearchWarning[];
  readonly parsed: Decomposition;
}

export type SearchOutcome = SearchResults | { readonly kind: "error"; readonly message: string };

export type SearchView =
  | { readonly kind: "loading" }
  | { readonly kind: "error"; readonly message: string }
  | (SearchResults & { readonly stale: boolean });

export function searchView(settled: SearchOutcome | null, kept: SearchResults | null): SearchView {
  if (settled) return settled.kind === "results" ? { ...settled, stale: false } : settled;
  return kept ? { ...kept, stale: true } : { kind: "loading" };
}
