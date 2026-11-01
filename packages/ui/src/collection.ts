export interface CollectionTally {
  readonly copies: number;
  readonly printings: number;
  readonly wishlist: number;
}

export type ImportMode = "merge" | "replace";

export interface ImportOption {
  readonly mode: ImportMode;
  readonly added: number;
  readonly changed: number;
  readonly removed: number;
  readonly copies: number;
  readonly wishlist: number;
}

export interface ImportPreview {
  readonly fileName: string;
  readonly printings: number;
  readonly options: readonly ImportOption[];
}

export interface CollectionValue {
  readonly amount: string;
  readonly source: string;
}

const plural = (count: number, one: string, many: string) =>
  `${count.toLocaleString("en")} ${count === 1 ? one : many}`;

export const copies = (count: number) => plural(count, "copy", "copies");
export const printings = (count: number) => plural(count, "printing", "printings");
