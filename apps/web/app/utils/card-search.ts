import type { Card } from "@riftkeeper/cards";
import type { Decomposition, SearchWarning } from "@riftkeeper/search";
import type { CardSummary } from "@riftkeeper/ui";
import { cardHref } from "./card-detail";
import { responsiveImage } from "./card-images";
import type { SearchState } from "./search-state";
import type { SearchOutcome, SearchResults } from "./search-view";

interface SearchResponse {
  readonly data: readonly Card[];
  readonly meta: { readonly page: number; readonly pageSize: number; readonly total: number };
  readonly warnings: readonly SearchWarning[];
  readonly parsed: Decomposition;
}

export type CardOutcome =
  | { readonly kind: "card"; readonly card: Card }
  | { readonly kind: "not-found" }
  | { readonly kind: "error"; readonly message: string };

export type CardView = { readonly kind: "loading" } | CardOutcome;

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

export async function fetchCard(apiBase: string, id: string): Promise<CardOutcome> {
  try {
    const response = await $fetch<{ data: Card }>(`/cards/${encodeURIComponent(id)}`, { baseURL: apiBase });
    return { kind: "card", card: response.data };
  } catch (error) {
    if (isUnknownCard(error)) return { kind: "not-found" };
    return { kind: "error", message: apiErrorMessage(error) ?? UNREACHABLE_MESSAGE };
  }
}

export async function fetchCardCount(apiBase: string): Promise<number | null> {
  try {
    const response = await $fetch<{ data: { cards: number } }>("/health", { baseURL: apiBase });
    return response.data.cards;
  } catch {
    return null;
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
    href: cardHref(card.id),
    ...responsiveImage(printing.imageUrl, printing.orientation),
  }));
}

function isUnknownCard(error: unknown) {
  const status = (error as { statusCode?: unknown } | null)?.statusCode;
  return status === 404 || status === 400;
}

function apiErrorMessage(error: unknown) {
  const body = (error as { data?: { error?: { message?: unknown } } } | null)?.data;
  const message = body?.error?.message;
  return typeof message === "string" ? message : undefined;
}
