import type { Card } from "@riftkeeper/cards";
import type { SearchWarning } from "@riftkeeper/search";
import type { CardSummary } from "@riftkeeper/ui";

interface SearchResponse {
  readonly data: readonly Card[];
  readonly meta: { readonly total: number };
  readonly warnings: readonly SearchWarning[];
}

export type SearchOutcome =
  | {
      readonly kind: "results";
      readonly cards: readonly CardSummary[];
      readonly total: number;
      readonly warnings: readonly SearchWarning[];
    }
  | { readonly kind: "error"; readonly message: string };

export type SearchView = { readonly kind: "idle" } | { readonly kind: "loading" } | SearchOutcome;

const UNREACHABLE_MESSAGE = "The card API could not be reached. Try again in a moment.";

export async function searchCards(apiBase: string, query: string): Promise<SearchOutcome> {
  try {
    const response = await $fetch<SearchResponse>("/search", { baseURL: apiBase, query: { q: query } });
    return {
      kind: "results",
      cards: response.data.flatMap(toCardSummaries),
      total: response.meta.total,
      warnings: response.warnings,
    };
  } catch (error) {
    return { kind: "error", message: apiErrorMessage(error) ?? UNREACHABLE_MESSAGE };
  }
}

function toCardSummaries(card: Card): CardSummary[] {
  return card.printings.slice(0, 1).map((printing) => ({
    id: card.id,
    name: card.name,
    subtitle: card.subtitle,
    imageUrl: printing.imageUrl,
    orientation: printing.orientation,
  }));
}

function apiErrorMessage(error: unknown) {
  const body = (error as { data?: { error?: { message?: unknown } } } | null)?.data;
  const message = body?.error?.message;
  return typeof message === "string" ? message : undefined;
}
