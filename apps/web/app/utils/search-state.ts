import { SORT_DIRECTIONS, SORT_KEYS, type SortDirection, type SortKey } from "@riftkeeper/search";
import type { SortOption } from "@riftkeeper/ui";

export interface SearchState {
  readonly query: string;
  readonly sort: SortKey;
  readonly direction: SortDirection;
}

export type RouteQuery = Readonly<Record<string, unknown>>;

const DEFAULT_SORT: SortKey = "set";
const DEFAULT_DIRECTION: SortDirection = "asc";

const SORT_LABELS: Record<SortKey, string> = {
  set: "Set",
  collector_number: "Collector number",
  name: "Name",
  rarity: "Rarity",
  cost: "Cost",
  might: "Might",
  power: "Power",
};

export const SORT_OPTIONS: readonly SortOption[] = SORT_KEYS.map((key) => ({ value: key, label: SORT_LABELS[key] }));

function oneOf<T extends string>(values: readonly T[], value: unknown): T | undefined {
  return values.find((candidate) => candidate === value);
}

export function parseSortKey(value: unknown): SortKey {
  return oneOf(SORT_KEYS, value) ?? DEFAULT_SORT;
}

export function parseSortDirection(value: unknown): SortDirection {
  return oneOf(SORT_DIRECTIONS, value) ?? DEFAULT_DIRECTION;
}

export function parseSearchState(routeQuery: RouteQuery): SearchState {
  return {
    query: typeof routeQuery.q === "string" ? routeQuery.q.trim() : "",
    sort: parseSortKey(routeQuery.sort),
    direction: parseSortDirection(routeQuery.direction),
  };
}

export function toRouteQuery({ query, sort, direction }: SearchState): Record<string, string> {
  return {
    ...(query ? { q: query } : {}),
    ...(sort === DEFAULT_SORT ? {} : { sort }),
    ...(direction === DEFAULT_DIRECTION ? {} : { direction }),
  };
}

export function searchStateKey({ query, sort, direction }: SearchState): string {
  return JSON.stringify([query, sort, direction]);
}
