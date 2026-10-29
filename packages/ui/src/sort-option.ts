export type SortDirection = "asc" | "desc";

export interface SortOption {
  readonly value: string;
  readonly label: string;
}

export interface SortSelection {
  readonly sort: string;
  readonly direction: SortDirection;
}
