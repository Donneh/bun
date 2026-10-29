import type { Card } from "@riftkeeper/cards";
import type { SearchNode } from "./ast.ts";

export const SORT_KEYS = ["set", "collector_number", "name", "rarity", "cost", "might", "power"] as const;
export type SortKey = (typeof SORT_KEYS)[number];

export const SORT_DIRECTIONS = ["asc", "desc"] as const;
export type SortDirection = (typeof SORT_DIRECTIONS)[number];

export const PAGE_SIZE = 40;

export interface SearchRequest {
  readonly root: SearchNode | null;
  readonly sort: SortKey;
  readonly direction: SortDirection;
  readonly page: number;
}

export interface SearchPage {
  readonly cards: readonly Card[];
  readonly page: number;
  readonly pageSize: number;
  readonly total: number;
}
