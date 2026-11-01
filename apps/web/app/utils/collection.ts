import * as z from "zod/mini";
import type { StorageAccess } from "./browser-storage.ts";

export const COLLECTION_STORAGE_KEY = "riftkeeper-collection";
export const COLLECTION_FILE_FORMAT = "riftkeeper-collection";
export const COLLECTION_VERSION = 1;
export const MAX_OWNED = 999;

export interface CollectionEntry {
  readonly owned: number;
  readonly wishlist: boolean;
}

export interface Collection {
  readonly version: typeof COLLECTION_VERSION;
  readonly printings: Readonly<Record<string, CollectionEntry>>;
}

export interface StoredCollection {
  readonly collection: Collection;
  readonly saved: boolean;
}

export type ImportMode = "merge" | "replace";

export interface ImportChanges {
  readonly added: number;
  readonly changed: number;
  readonly removed: number;
  readonly copies: number;
  readonly wishlist: number;
}

export type ParsedFile =
  | { readonly kind: "collection"; readonly collection: Collection }
  | { readonly kind: "invalid"; readonly message: string };

export const EMPTY_COLLECTION: Collection = { version: COLLECTION_VERSION, printings: {} };

const NO_ENTRY: CollectionEntry = { owned: 0, wishlist: false };

const OWNED_RULE = `must be a whole number from 0 to ${MAX_OWNED}`;

const EntrySchema = z.object(
  {
    owned: z
      .int({ error: OWNED_RULE })
      .check(z.minimum(0, { error: OWNED_RULE }), z.maximum(MAX_OWNED, { error: OWNED_RULE })),
    wishlist: z.boolean({ error: "must be true or false" }),
  },
  { error: "must hold owned and wishlist" },
);

const CODE_RULE = "must be a printing code of 1 to 64 characters";

const PrintingsSchema = z.record(
  z.string().check(z.minLength(1, { error: CODE_RULE }), z.maxLength(64, { error: CODE_RULE })),
  EntrySchema,
  { error: "must map printing codes to entries" },
);

const StoredSchema = z.object({ version: z.literal(COLLECTION_VERSION), printings: PrintingsSchema });

const FileHeaderSchema = z.object({ format: z.literal(COLLECTION_FILE_FORMAT), version: z.number() });

const FileSchema = z.object({
  format: z.literal(COLLECTION_FILE_FORMAT),
  version: z.literal(COLLECTION_VERSION),
  printings: PrintingsSchema,
});

const isKept = (entry: CollectionEntry) => entry.owned > 0 || entry.wishlist;

function collectionOf(printings: Readonly<Record<string, CollectionEntry>>): Collection {
  return {
    version: COLLECTION_VERSION,
    printings: Object.fromEntries(Object.entries(printings).filter(([, entry]) => isKept(entry))),
  };
}

export function entryFor(collection: Collection, code: string): CollectionEntry {
  return collection.printings[code] ?? NO_ENTRY;
}

export function setOwned(collection: Collection, code: string, owned: number): Collection {
  const clamped = Math.min(MAX_OWNED, Math.max(0, Math.trunc(owned)));
  return collectionOf({ ...collection.printings, [code]: { ...entryFor(collection, code), owned: clamped } });
}

export function setWishlisted(collection: Collection, code: string, wishlist: boolean): Collection {
  return collectionOf({ ...collection.printings, [code]: { ...entryFor(collection, code), wishlist } });
}

export function importedCollection(current: Collection, incoming: Collection, mode: ImportMode): Collection {
  return mode === "replace" ? incoming : collectionOf({ ...current.printings, ...incoming.printings });
}

const sameEntry = (a: CollectionEntry, b: CollectionEntry) => a.owned === b.owned && a.wishlist === b.wishlist;

export function collectionTotals(collection: Collection) {
  const entries = Object.values(collection.printings);
  return {
    copies: entries.reduce((sum, entry) => sum + entry.owned, 0),
    printings: entries.filter((entry) => entry.owned > 0).length,
    wishlist: entries.filter((entry) => entry.wishlist).length,
  };
}

export function importChanges(current: Collection, incoming: Collection, mode: ImportMode): ImportChanges {
  const next = importedCollection(current, incoming, mode);
  const codes = new Set([...Object.keys(current.printings), ...Object.keys(next.printings)]);
  let added = 0;
  let changed = 0;
  let removed = 0;
  for (const code of codes) {
    const before = current.printings[code];
    const after = next.printings[code];
    if (before === undefined) added += 1;
    else if (after === undefined) removed += 1;
    else if (!sameEntry(before, after)) changed += 1;
  }
  const { copies, wishlist } = collectionTotals(next);
  return { added, changed, removed, copies, wishlist };
}

export function collectionFile(collection: Collection, exportedAt: Date) {
  return {
    format: COLLECTION_FILE_FORMAT,
    version: COLLECTION_VERSION,
    exportedAt: exportedAt.toISOString(),
    printings: collection.printings,
  };
}

export function collectionFileName(exportedAt: Date): string {
  return `riftkeeper-collection-${exportedAt.toISOString().slice(0, 10)}.json`;
}

const NOT_A_COLLECTION = "This file is not a Riftkeeper collection export.";

function describeIssues(error: z.core.$ZodError): string {
  const lines = error.issues.slice(0, 3).map((issue) => {
    const where = issue.path.map(String).join(" › ");
    return where ? `${where}: ${issue.message}` : issue.message;
  });
  return [NOT_A_COLLECTION, ...lines].join(" ");
}

export function parseCollectionFile(text: string): ParsedFile {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return { kind: "invalid", message: `${NOT_A_COLLECTION} It is not valid JSON.` };
  }
  const header = FileHeaderSchema.safeParse(json);
  if (!header.success) return { kind: "invalid", message: NOT_A_COLLECTION };
  if (header.data.version !== COLLECTION_VERSION)
    return {
      kind: "invalid",
      message: `This file uses collection format version ${header.data.version}, and this site reads version ${COLLECTION_VERSION}.`,
    };
  const file = FileSchema.safeParse(json);
  if (!file.success) return { kind: "invalid", message: describeIssues(file.error) };
  return { kind: "collection", collection: collectionOf(file.data.printings) };
}

function storedCollection(stored: string | null): Collection {
  if (stored === null) return EMPTY_COLLECTION;
  try {
    const parsed = StoredSchema.safeParse(JSON.parse(stored));
    return parsed.success ? collectionOf(parsed.data.printings) : EMPTY_COLLECTION;
  } catch {
    return EMPTY_COLLECTION;
  }
}

export function loadCollection(storage: StorageAccess): StoredCollection {
  let stored: string | null;
  try {
    stored = storage().getItem(COLLECTION_STORAGE_KEY);
  } catch {
    return { collection: EMPTY_COLLECTION, saved: false };
  }
  return { collection: storedCollection(stored), saved: true };
}

export function saveCollection(storage: StorageAccess, collection: Collection): boolean {
  try {
    storage().setItem(COLLECTION_STORAGE_KEY, JSON.stringify(collection));
    return true;
  } catch {
    return false;
  }
}
