import type { PricedCard } from "@riftkeeper/cards/prices";

export type CatalogueOutcome =
  | { readonly kind: "catalogue"; readonly cards: readonly PricedCard[] }
  | { readonly kind: "error"; readonly message: string };

const UNREACHABLE_MESSAGE = "The card list could not be loaded. Try again in a moment.";

export async function fetchCatalogue(apiBase: string): Promise<CatalogueOutcome> {
  try {
    const response = await $fetch<{ data: readonly PricedCard[] }>("/cards", { baseURL: apiBase });
    return { kind: "catalogue", cards: response.data };
  } catch {
    return { kind: "error", message: UNREACHABLE_MESSAGE };
  }
}
