import { describe, expect, test } from "bun:test";
import {
  backupKey,
  COLLECTION_STORAGE_KEY,
  type Collection,
  collectionFile,
  collectionFileName,
  collectionTotals,
  EMPTY_COLLECTION,
  entryFor,
  importChanges,
  importedCollection,
  loadCollection,
  MAX_OWNED,
  parseCollectionFile,
  saveCollection,
  setOwned,
  setWishlisted,
} from "../app/utils/collection.ts";

function memoryStorage(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));
  return {
    values,
    access: () => ({
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => {
        values.set(key, value);
      },
    }),
  };
}

const deniedStorage = (): Storage => {
  throw new DOMException("Storage is disabled", "SecurityError");
};

const fullStorage = () => ({
  getItem: () => null,
  setItem: () => {
    throw new DOMException("Quota exceeded", "QuotaExceededError");
  },
});

const collectionWith = (printings: Collection["printings"]): Collection => ({ version: 1, printings });

describe("editing a collection", () => {
  test("counts copies per printing and leaves other printings alone", () => {
    const collection = setOwned(setOwned(EMPTY_COLLECTION, "OGN-001/298", 2), "OGN-002/298", 1);

    expect(entryFor(collection, "OGN-001/298")).toEqual({ owned: 2, wishlist: false });
    expect(entryFor(collection, "OGN-002/298")).toEqual({ owned: 1, wishlist: false });
    expect(entryFor(collection, "OGN-003/298")).toEqual({ owned: 0, wishlist: false });
  });

  test("keeps counts between zero and the maximum", () => {
    expect(entryFor(setOwned(EMPTY_COLLECTION, "OGN-001/298", -1), "OGN-001/298").owned).toBe(0);
    expect(entryFor(setOwned(EMPTY_COLLECTION, "OGN-001/298", MAX_OWNED + 5), "OGN-001/298").owned).toBe(MAX_OWNED);
  });

  test("forgets a printing that is neither owned nor wished for", () => {
    const owned = setOwned(EMPTY_COLLECTION, "OGN-001/298", 1);
    const wished = setWishlisted(owned, "OGN-001/298", true);

    expect(setOwned(wished, "OGN-001/298", 0).printings).toEqual({ "OGN-001/298": { owned: 0, wishlist: true } });
    expect(setWishlisted(setOwned(wished, "OGN-001/298", 0), "OGN-001/298", false).printings).toEqual({});
  });

  test("totals copies, owned printings and the wishlist", () => {
    const collection = collectionWith({
      "OGN-001/298": { owned: 3, wishlist: false },
      "OGN-002/298": { owned: 1, wishlist: true },
      "OGN-003/298": { owned: 0, wishlist: true },
    });

    expect(collectionTotals(collection)).toEqual({ copies: 4, printings: 2, wishlist: 2 });
  });
});

describe("importing", () => {
  const current = collectionWith({
    "OGN-001/298": { owned: 1, wishlist: false },
    "OGN-002/298": { owned: 2, wishlist: false },
    "OGN-003/298": { owned: 0, wishlist: true },
  });
  const incoming = collectionWith({
    "OGN-002/298": { owned: 4, wishlist: false },
    "OGN-003/298": { owned: 0, wishlist: true },
    "SFD-010/221": { owned: 1, wishlist: true },
  });

  test("merging lets the file decide for its printings and keeps the others", () => {
    expect(importedCollection(current, incoming, "merge").printings).toEqual({
      "OGN-001/298": { owned: 1, wishlist: false },
      "OGN-002/298": { owned: 4, wishlist: false },
      "OGN-003/298": { owned: 0, wishlist: true },
      "SFD-010/221": { owned: 1, wishlist: true },
    });
  });

  test("merging the same file twice changes nothing the second time", () => {
    const once = importedCollection(current, incoming, "merge");

    expect(importedCollection(once, incoming, "merge")).toEqual(once);
    expect(importChanges(once, incoming, "merge")).toMatchObject({ added: 0, changed: 0, removed: 0 });
  });

  test("replacing makes the collection exactly the file", () => {
    expect(importedCollection(current, incoming, "replace")).toEqual(incoming);
  });

  test("previews what each mode adds, changes and removes", () => {
    expect(importChanges(current, incoming, "merge")).toEqual({
      added: 1,
      changed: 1,
      removed: 0,
      copies: 6,
      wishlist: 2,
    });
    expect(importChanges(current, incoming, "replace")).toEqual({
      added: 1,
      changed: 1,
      removed: 1,
      copies: 5,
      wishlist: 2,
    });
  });
});

describe("the export file", () => {
  const collection = collectionWith({ "OGN-119/298": { owned: 2, wishlist: true } });
  const exportedAt = new Date("2026-11-01T10:00:00Z");

  test("round-trips through its text", () => {
    const text = JSON.stringify(collectionFile(collection, exportedAt));

    expect(parseCollectionFile(text)).toEqual({ kind: "collection", collection });
  });

  test("is named after the day it was exported", () => {
    expect(collectionFileName(exportedAt)).toBe("riftkeeper-collection-2026-11-01.json");
  });

  const rejected = {
    "text that is not JSON": ["{ not json", /not valid JSON/],
    "JSON from somewhere else": [JSON.stringify({ cards: [] }), /not a Riftkeeper collection export/],
    "a newer format version": [
      JSON.stringify({ format: "riftkeeper-collection", version: 2, printings: {} }),
      /format version 2.*reads version 1/,
    ],
    "a negative count": [
      JSON.stringify({
        format: "riftkeeper-collection",
        version: 1,
        printings: { "OGN-1/298": { owned: -1, wishlist: false } },
      }),
      /printings › OGN-1\/298 › owned: must be a whole number from 0 to 999/,
    ],
    "a fractional count": [
      JSON.stringify({
        format: "riftkeeper-collection",
        version: 1,
        printings: { "OGN-1/298": { owned: 1.5, wishlist: false } },
      }),
      /owned: must be a whole number/,
    ],
    "a missing wishlist flag": [
      JSON.stringify({ format: "riftkeeper-collection", version: 1, printings: { "OGN-1/298": { owned: 1 } } }),
      /wishlist: must be true or false/,
    ],
  } satisfies Record<string, [string, RegExp]>;

  for (const [name, [text, message]] of Object.entries(rejected))
    test(`rejects ${name} with a message that says why`, () => {
      const parsed = parseCollectionFile(text);

      expect(parsed.kind).toBe("invalid");
      expect(parsed.kind === "invalid" ? parsed.message : "").toMatch(message);
    });

  test("drops entries that hold nothing", () => {
    const text = JSON.stringify({
      format: "riftkeeper-collection",
      version: 1,
      printings: { "OGN-1/298": { owned: 0, wishlist: false }, "OGN-2/298": { owned: 1, wishlist: false } },
    });

    expect(parseCollectionFile(text)).toEqual({
      kind: "collection",
      collection: collectionWith({ "OGN-2/298": { owned: 1, wishlist: false } }),
    });
  });
});

describe("browser storage", () => {
  const now = new Date("2026-11-01T12:00:00Z");
  const collection = collectionWith({ "OGN-119/298": { owned: 2, wishlist: true } });

  test("starts empty without a stored collection", () => {
    expect(loadCollection(memoryStorage().access)).toEqual({
      collection: EMPTY_COLLECTION,
      storage: { kind: "saved" },
    });
  });

  test("reads back what it saved", () => {
    const storage = memoryStorage();

    expect(saveCollection(storage.access, collection, { kind: "saved" }, now)).toEqual({ kind: "saved" });
    expect(loadCollection(storage.access)).toEqual({ collection, storage: { kind: "saved" } });
  });

  const unreadable = {
    "text that is not JSON": "{ broken",
    "a newer version": JSON.stringify({ version: 2, printings: { "OGN-119/298": { owned: 2, wishlist: true } } }),
    "a count above the maximum": JSON.stringify({
      version: 1,
      printings: {
        "OGN-119/298": { owned: 2, wishlist: true },
        "OGN-001/298": { owned: MAX_OWNED + 1, wishlist: false },
      },
    }),
  };

  for (const [name, original] of Object.entries(unreadable))
    test(`keeps ${name} untouched until the first change copies it to a backup`, () => {
      const storage = memoryStorage({ [COLLECTION_STORAGE_KEY]: original });

      const loaded = loadCollection(storage.access);
      expect(loaded.storage).toEqual({ kind: "unreadable", original });
      expect(storage.values.get(COLLECTION_STORAGE_KEY)).toBe(original);

      const edited = setOwned(loaded.collection, "SFD-001/221", 1);
      const saved = saveCollection(storage.access, edited, loaded.storage, now);

      expect(saved).toEqual({ kind: "recovered", backupKey: backupKey(now) });
      expect(storage.values.get(backupKey(now))).toBe(original);
      expect(JSON.parse(storage.values.get(COLLECTION_STORAGE_KEY) ?? "null")).toEqual(edited);
      expect(saveCollection(storage.access, edited, saved, new Date("2026-11-02T00:00:00Z"))).toEqual(saved);
      expect([...storage.values.keys()].filter((key) => key.includes("backup"))).toHaveLength(1);
    });

  test("salvages the entries of an unreadable collection that still parse", () => {
    const storage = memoryStorage({ [COLLECTION_STORAGE_KEY]: unreadable["a count above the maximum"] });

    expect(loadCollection(storage.access).collection).toEqual(collection);
  });

  test("never overwrites an unreadable collection when no backup can be made", () => {
    const original = "{ broken";
    const values = new Map([[COLLECTION_STORAGE_KEY, original]]);
    const noRoomForBackups = () => ({
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => {
        if (key !== COLLECTION_STORAGE_KEY) throw new DOMException("Quota exceeded", "QuotaExceededError");
        values.set(key, value);
      },
    });

    const loaded = loadCollection(noRoomForBackups);

    expect(saveCollection(noRoomForBackups, collection, loaded.storage, now)).toEqual({ kind: "protected", original });
    expect(values.get(COLLECTION_STORAGE_KEY)).toBe(original);
  });

  test("reports blocked storage instead of throwing", () => {
    expect(loadCollection(deniedStorage)).toEqual({ collection: EMPTY_COLLECTION, storage: { kind: "blocked" } });
    expect(saveCollection(deniedStorage, collection, { kind: "blocked" }, now)).toEqual({ kind: "blocked" });
  });

  test("reports a change it could not save instead of throwing", () => {
    expect(saveCollection(fullStorage, collection, { kind: "saved" }, now)).toEqual({ kind: "failed" });
  });
});

describe("printing codes", () => {
  test("treat names on Object.prototype as unknown printings", () => {
    expect(entryFor(EMPTY_COLLECTION, "toString")).toEqual({ owned: 0, wishlist: false });
    expect(entryFor(EMPTY_COLLECTION, "constructor")).toEqual({ owned: 0, wishlist: false });
  });

  const fileWithKey = (key: string) =>
    `{"format":"riftkeeper-collection","version":1,"printings":{"${key}":{"owned":1,"wishlist":false}}}`;

  test("reject object keys such as constructor in an imported file", () => {
    const parsed = parseCollectionFile(fileWithKey("constructor"));

    expect(parsed.kind === "invalid" ? parsed.message : "").toMatch(/printings › constructor/);
  });

  test("never import a __proto__ key", () => {
    expect(parseCollectionFile(fileWithKey("__proto__"))).toEqual({ kind: "collection", collection: EMPTY_COLLECTION });
  });
});
