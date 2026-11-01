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

export type StorageState =
  | { readonly kind: "saved" }
  | { readonly kind: "blocked" }
  | { readonly kind: "failed" }
  | { readonly kind: "unreadable"; readonly original: string }
  | { readonly kind: "protected"; readonly original: string }
  | { readonly kind: "recovered"; readonly backupKey: string };

export interface StoredCollection {
  readonly collection: Collection;
  readonly storage: StorageState;
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

const RESERVED_KEYS = new Set(["__proto__", "constructor", "prototype"]);

const PrintingsSchema = z.record(
  z.string().check(
    z.minLength(1, { error: CODE_RULE }),
    z.maxLength(64, { error: CODE_RULE }),
    z.refine((code) => !RESERVED_KEYS.has(code), { error: "is not a printing code" }),
  ),
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
  return Object.hasOwn(collection.printings, code) ? (collection.printings[code] ?? NO_ENTRY) : NO_ENTRY;
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

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

function salvagedEntries(json: unknown): Collection {
  const printings = (json as { printings?: unknown } | null)?.printings;
  if (typeof printings !== "object" || printings === null) return EMPTY_COLLECTION;
  const readable = Object.entries(printings).flatMap(([code, entry]) => {
    const parsed = PrintingsSchema.safeParse({ [code]: entry });
    return parsed.success ? Object.entries(parsed.data) : [];
  });
  return collectionOf(Object.fromEntries(readable));
}

function storedCollection(stored: string): StoredCollection {
  const json = parseJson(stored);
  const parsed = StoredSchema.safeParse(json);
  if (parsed.success) return { collection: collectionOf(parsed.data.printings), storage: { kind: "saved" } };
  return { collection: salvagedEntries(json), storage: { kind: "unreadable", original: stored } };
}

export function loadCollection(storage: StorageAccess): StoredCollection {
  let stored: string | null;
  try {
    stored = storage().getItem(COLLECTION_STORAGE_KEY);
  } catch {
    return { collection: EMPTY_COLLECTION, storage: { kind: "blocked" } };
  }
  return stored === null ? { collection: EMPTY_COLLECTION, storage: { kind: "saved" } } : storedCollection(stored);
}

export const backupKey = (at: Date) => `${COLLECTION_STORAGE_KEY}-backup-${at.toISOString()}`;

function write(storage: StorageAccess, key: string, value: string): boolean {
  try {
    storage().setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export function saveCollection(
  storage: StorageAccess,
  collection: Collection,
  current: StorageState,
  now: Date,
): StorageState {
  if (current.kind === "unreadable" || current.kind === "protected") {
    const key = backupKey(now);
    if (!write(storage, key, current.original)) return { kind: "protected", original: current.original };
    return write(storage, COLLECTION_STORAGE_KEY, JSON.stringify(collection))
      ? { kind: "recovered", backupKey: key }
      : { kind: "failed" };
  }
  if (write(storage, COLLECTION_STORAGE_KEY, JSON.stringify(collection)))
    return current.kind === "recovered" ? current : { kind: "saved" };
  return current.kind === "blocked" ? current : { kind: "failed" };
}
