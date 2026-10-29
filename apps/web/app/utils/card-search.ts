import type { Card } from "@riftkeeper/cards";
import type { Decomposition, SearchWarning } from "@riftkeeper/search";
import type { CardSummary } from "@riftkeeper/ui";
import { responsiveImage } from "./card-images";
import type { SearchState } from "./search-state";

interface SearchResponse {
  readonly data: readonly Card[];
  readonly meta: { readonly page: number; readonly pageSize: number; readonly total: number };
  readonly warnings: readonly SearchWarning[];
  readonly parsed: Decomposition;
}

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

export type SearchView = { readonly kind: "idle" } | { readonly kind: "loading" } | SearchOutcome;

const UNREACHABLE_MESSAGE = "The card API could not be reached. Try again in a moment.";

export async function searchCards(apiBase: string, state: SearchState, page = 1): Promise<SearchOutcome> {
  try {
    const response = await $fetch<SearchResponse>("/search", {
      baseURL: apiBase,
      query: { q: state.query, sort: state.sort, direction: state.direction, page },
    });
    return {
      kind: "results",
      cards: response.data.flatMap(toCardSummaries),
      page: response.meta.page,
      total: response.meta.total,
      hasMore: response.meta.page * response.meta.pageSize < response.meta.total,
      warnings: response.warnings,
      parsed: response.parsed,
    };
  } catch (error) {
    return { kind: "error", message: apiErrorMessage(error) ?? UNREACHABLE_MESSAGE };
  }
}

export function appendPage(results: SearchResults, next: SearchResults): SearchResults {
  const seen = new Set(results.cards.map((card) => card.id));
  return {
    ...results,
    cards: [...results.cards, ...next.cards.filter((card) => !seen.has(card.id))],
    page: next.page,
    total: next.total,
    hasMore: next.hasMore,
  };
}

function toCardSummaries(card: Card): CardSummary[] {
  return card.printings.slice(0, 1).map((printing) => ({
    id: card.id,
    name: card.name,
    subtitle: card.subtitle,
    imageUrl: printing.imageUrl,
    orientation: printing.orientation,
    ...responsiveImage(printing.imageUrl, printing.orientation),
  }));
}

function apiErrorMessage(error: unknown) {
  const body = (error as { data?: { error?: { message?: unknown } } } | null)?.data;
  const message = body?.error?.message;
  return typeof message === "string" ? message : undefined;
}
